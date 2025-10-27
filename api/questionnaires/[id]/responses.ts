// REPLACE THIS FILE: api/questionnaires/[id]/responses.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Miro, Board } from '@mirohq/miro-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateRequest } from '../../lib/auth.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false }
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const claims = await authenticateRequest(req, res);
    if (!claims) return;

    const { id: questionnaireId } = req.query;
    if (typeof questionnaireId !== 'string') return res.status(400).json({ error: 'Invalid Questionnaire ID' });
    
    // --- METHOD: GET (Existing Logic to fetch responses) ---
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase.from('responses').select('*').eq('questionnaire_id', questionnaireId).order('submitted_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data);
        } catch (error: any) {
            console.error(`Error fetching responses for questionnaire ${questionnaireId}:`, error);
            return res.status(500).json({ error: error.message });
        }
    }

    // --- METHOD: POST (New Logic to export a single response to Miro) ---
    if (req.method === 'POST') {
        try {
            const userId = claims.sub;
            const { responseId } = req.body;
            if (!responseId) return res.status(400).json({ error: 'Response ID is required.' });

            const { data: tokenData, error: tokenError } = await supabase.from('miro_tokens').select('access_token').eq('user_id', userId).single();
            if (tokenError || !tokenData) {
                return res.status(403).json({ error: 'Miro account not connected.', action: 'connect_miro' });
            }
            
            const { data: responseData, error: responseError } = await supabase.from('responses').select('*, questionnaire:questionnaires(*, sections(*, questions(*)))').eq('id', responseId).single();
            if (responseError || !responseData) {
                return res.status(404).json({ error: 'Questionnaire response not found.' });
            }
            const { answers, questionnaire } = responseData;

            const questionsAndAnswers = Object.entries(answers).map(([qId, answer]) => ({
                question: questionnaire.sections.flatMap((s: any) => s.questions).find((q: any) => q.id === qId)?.prompt || 'Unknown Question',
                answer
            }));
            
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const contentString = questionsAndAnswers.map(qa => `Question: ${qa.question}\nAnswer: ${String(qa.answer)}`).join('\n\n');
            const prompt = `Based on the following client answers, generate 3-5 key discussion points. Format the output as a valid JSON array of objects, where each object has "title" and "content" keys. Example: [{"title": "Priority 1", "content": "The client stated..."}, ...]. Client Answers: --- ${contentString} ---`;
            
            const result = await model.generateContent(prompt);
            let discussionPoints;
            try {
                const jsonString = result.response.text().replace(/```json\n?|\n?```/g, '');
                discussionPoints = JSON.parse(jsonString);
            } catch (e) { throw new Error('Could not parse discussion points from AI.'); }
            if (!Array.isArray(discussionPoints)) throw new Error('AI response was not an array.');

            const miroApi = new Miro({ auth: { accessToken: tokenData.access_token } }).as('');
            let board: Board;

            if (questionnaire.miro_board_id) {
                board = await miroApi.getBoard(questionnaire.miro_board_id);
            } else {
                board = await miroApi.createBoard({ name: `Action Items: ${questionnaire.title}` });
                await supabase.from('questionnaires').update({ miro_board_id: board.id }).eq('id', questionnaire.id);
            }
            
            const existingFrames = await board.getAllItems({ type: 'frame' });
            const frame = await board.createFrameItem({
                data: { title: `Response - ${new Date(responseData.submitted_at).toLocaleDateString()}` },
                position: { origin: 'center', x: 0, y: existingFrames.length * 500 },
                geometry: { width: (discussionPoints.length * 350) + 50, height: 400 }
            });

            let x_position = 0;
            for (const point of discussionPoints) {
                await board.createStickyNoteItem({
                    data: { content: `<b>${point.title || ''}</b><br>${point.content || ''}` },
                    position: { x: x_position, y: 0 },
                    style: { fillColor: 'light_yellow' },
                    parentId: frame.id
                });
                x_position += 350;
            }

            return res.status(200).json({ boardUrl: board.viewLink });

        } catch (error: any) {
            console.error('Error during Miro export:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
}
