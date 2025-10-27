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

            const frameWidth = 1200;
            const frameHeight = 500;
            const stickyWidth = 250;
            const padding = 30;
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

            let currentYPosition = frameCount * (frameHeight + 100);

            // Process each section separately
            for (const section of questionnaire.sections) {
                // Get questions and answers for this section
                const sectionQAs = section.questions
                    .map((q: any) => ({
                        question: q.prompt,
                        answer: answers[q.id]
                    }))
                    .filter((qa: any) => qa.answer !== undefined && qa.answer !== null && qa.answer !== '');

                // Skip empty sections
                if (sectionQAs.length === 0) continue;

                // Generate discussion points for this section
                const contentString = sectionQAs
                    .map((qa: any) => `Question: ${qa.question}\nAnswer: ${String(qa.answer)}`)
                    .join('\n\n');
                
                const prompt = `Based on the following client answers from the "${section.title}" section, generate 2-3 key discussion points or action items. Format the output as a valid JSON array like [{"title": "...", "content": "..."}]. Keep each point concise and actionable. Client Answers: ${contentString}`;

                const result = await model.generateContent(prompt);
                let discussionPoints;
                try {
                    const jsonString = result.response.text().replace(/```json\n?|\n?```/g, '');
                    discussionPoints = JSON.parse(jsonString);
                } catch {
                    console.error('Could not parse discussion points for section:', section.title);
                    continue;
                }
                if (!Array.isArray(discussionPoints) || discussionPoints.length === 0) continue;

                // Create frame for this section
                const frame = await miroApiRequest(`/boards/${board.id}/frames`, accessToken, {
                    method: 'POST',
                    body: JSON.stringify({
                        data: {
                            title: `${section.title} - ${new Date(responseData.submitted_at).toLocaleDateString()}`
                        },
                        position: { 
                            x: 0, 
                            y: currentYPosition 
                        },
                        geometry: { width: frameWidth, height: frameHeight },
                    }),
                });

                // Create sticky notes for this section
                for (let i = 0; i < discussionPoints.length; i++) {
                    const point = discussionPoints[i];
                    
                    const x_position = padding + (i * (stickyWidth + padding)) + (stickyWidth / 2);
                    const y_position = frameHeight / 2;
                    
                    await miroApiRequest(`/boards/${board.id}/sticky_notes`, accessToken, {
                        method: 'POST',
                        body: JSON.stringify({
                            data: { content: `<b>${point.title || ''}</b><br>${point.content || ''}` },
                            style: { fillColor: 'light_yellow' },
                            position: { x: x_position, y: y_position },
                            parent: { id: frame.id },
                        }),
                    });
                }

                // Move to next frame position
                currentYPosition += frameHeight + 100;
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