// FINAL, CORRECTED CODE: REPLACE api/questionnaires/[id]/responses.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateRequest } from '../../lib/auth.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false }
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper for Miro API calls
async function miroApiRequest(endpoint: string, accessToken: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.miro.com/v2${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Miro API request to '${endpoint}' failed with status ${response.status}:`, errorBody);
        throw new Error(`Miro API Error: ${errorBody}`);
    }
    if (response.status === 204) return null;
    return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') return res.status(200).end();

    const claims = await authenticateRequest(req, res);
    if (!claims) return;

    const { id: questionnaireId } = req.query;
    if (typeof questionnaireId !== 'string')
        return res.status(400).json({ error: 'Invalid Questionnaire ID' });

    // --- GET: Fetch all responses ---
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('responses')
                .select('*')
                .eq('questionnaire_id', questionnaireId)
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // --- POST: Export response to Miro ---
    if (req.method === 'POST') {
        try {
            const userId = claims.sub;
            const { responseId } = req.body;
            if (!responseId) return res.status(400).json({ error: 'Response ID is required.' });

            const { data: tokenData, error: tokenError } = await supabase.from('miro_tokens').select('access_token').eq('user_id', userId).single();
            if (tokenError || !tokenData)
                return res.status(403).json({ error: 'Miro account not connected.', action: 'connect_miro' });
            
            const { data: responseData, error: responseError } = await supabase.from('responses').select('*, questionnaire:questionnaires(*, sections(*, questions(*)))').eq('id', responseId).single();
            if (responseError || !responseData)
                return res.status(404).json({ error: 'Questionnaire response not found.' });
            
            const { answers, questionnaire } = responseData;

            const questionsAndAnswers = Object.entries(answers).map(([qId, answer]) => ({
                question: questionnaire.sections.flatMap((s: any) => s.questions).find((q: any) => q.id === qId)?.prompt || 'Unknown Question',
                answer
            }));
            
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            const contentString = questionsAndAnswers.map((qa) => `Question: ${qa.question}\nAnswer: ${String(qa.answer)}`).join('\n\n');
            const prompt = `Based on the following client answers, generate 3–5 key discussion points. Format the output as a valid JSON array like [{"title": "...", "content": "..."}]. Client Answers: ${contentString}`;

            const result = await model.generateContent(prompt);
            let discussionPoints;
            try {
                const jsonString = result.response.text().replace(/```json\n?|\n?```/g, '');
                discussionPoints = JSON.parse(jsonString);
            } catch {
                throw new Error('Could not parse discussion points from AI.');
            }
            if (!Array.isArray(discussionPoints)) throw new Error('AI response was not an array.');

            const accessToken = tokenData.access_token;
            let board: any;

            if (questionnaire.miro_board_id) {
                board = await miroApiRequest(`/boards/${questionnaire.miro_board_id}`, accessToken);
            } else {
                board = await miroApiRequest('/boards', accessToken, {
                    method: 'POST',
                    body: JSON.stringify({ name: `Action Items: ${questionnaire.title}` }),
                });
                await supabase.from('questionnaires').update({ miro_board_id: board.id }).eq('id', questionnaire.id);
            }

            // Re-fetch existing frames to calculate the correct Y position for the new frame
            const existingFrames = await miroApiRequest(`/boards/${board.id}/frames`, accessToken);
            const frameCount = existingFrames?.data?.length || 0;

            const frameHeight = 400;

            // Create the frame
            const frame = await miroApiRequest(`/boards/${board.id}/frames`, accessToken, {
                method: 'POST',
                body: JSON.stringify({
                    data: {
                        title: `Response - ${new Date(responseData.submitted_at).toLocaleDateString()}`
                    },
                    position: { 
                        x: 0, 
                        // Position new frames below existing ones to prevent overlap
                        y: frameCount * (frameHeight + 100) 
                    },
                    geometry: { width: 1000, height: frameHeight },
                }),
            });

            // Create sticky notes without position - let Miro auto-position them
            for (let i = 0; i < discussionPoints.length; i++) {
                const point = discussionPoints[i];
                
                await miroApiRequest(`/boards/${board.id}/sticky_notes`, accessToken, {
                    method: 'POST',
                    body: JSON.stringify({
                        data: { content: `<b>${point.title || ''}</b><br>${point.content || ''}` },
                        style: { fillColor: 'light_yellow' },
                        parent: { id: frame.id },
                    }),
                });
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