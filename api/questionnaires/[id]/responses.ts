// FINAL, MODIFIED CODE: REPLACE this file at api/questionnaires/[id]/responses.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateRequest } from '../../lib/auth.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false }
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper for Miro API calls - this is reused for both export types
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

    // --- GET: Fetch all responses (No changes here) ---
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

    // --- POST: Handles BOTH the original export and the NEW Workshop Builder export ---
    if (req.method === 'POST') {
        try {
            const userId = claims.sub;
            const { data: tokenData, error: tokenError } = await supabase.from('miro_tokens').select('access_token').eq('user_id', userId).single();
            if (tokenError || !tokenData)
                return res.status(403).json({ error: 'Miro account not connected.', action: 'connect_miro' });
            
            const accessToken = tokenData.access_token;

            // --- NEW LOGIC FOR WORKSHOP BUILDER EXPORT ---
            if (req.body.insights && Array.isArray(req.body.insights)) {
                const { miroBoardId, insights, workshopName } = req.body;

                if (insights.length === 0) {
                    return res.status(400).json({ error: 'No insights provided for export.' });
                }

                let board: any;
                if (miroBoardId) {
                    board = await miroApiRequest(`/boards/${miroBoardId}`, accessToken);
                } else {
                    board = await miroApiRequest('/boards', accessToken, {
                        method: 'POST',
                        body: JSON.stringify({ name: workshopName || `Workshop Export: ${new Date().toLocaleDateString()}` }),
                    });
                }

                const groupedInsights = insights.reduce((acc, insight) => {
                    const category = insight.boardCategory || 'Uncategorized';
                    if (!acc[category]) { acc[category] = []; }
                    acc[category].push(insight);
                    return acc;
                }, {});

                const frameWidth = 1500;
                const frameHeight = 1000;
                const framePadding = 150;
                let currentY = 0;

                for (const category in groupedInsights) {
                    const categoryInsights = groupedInsights[category];

                    const frame = await miroApiRequest(`/boards/${board.id}/frames`, accessToken, {
                        method: 'POST',
                        body: JSON.stringify({
                            data: { title: `<h3>${category}</h3>` },
                            position: { x: 0, y: currentY },
                            geometry: { width: frameWidth, height: frameHeight },
                        }),
                    });

                    for (let i = 0; i < categoryInsights.length; i++) {
                        const insight = categoryInsights[i];
                        const stickyWidth = 250;
                        const stickyPadding = 30;
                        const itemsPerRow = Math.floor((frameWidth - stickyPadding) / (stickyWidth + stickyPadding));
                        const row = Math.floor(i / itemsPerRow);
                        const col = i % itemsPerRow;
                        
                        const x_pos = (col * (stickyWidth + stickyPadding)) + stickyPadding + (stickyWidth / 2);
                        const y_pos = (row * (120 + stickyPadding)) + stickyPadding + 60;

                        await miroApiRequest(`/boards/${board.id}/sticky_notes`, accessToken, {
                            method: 'POST',
                            body: JSON.stringify({
                                data: { content: `<b>${insight.heading || ''}</b><br>${insight.summary || ''}` },
                                style: { fillColor: 'light_yellow' },
                                position: { x: x_pos, y: y_pos },
                                parent: { id: frame.id },
                            }),
                        });
                    }
                    currentY += frameHeight + framePadding;
                }

                return res.status(200).json({ boardUrl: board.viewLink, boardId: board.id });
            }
            
            // --- ORIGINAL LOGIC FOR SINGLE RESPONSE EXPORT ---
            else if (req.body.responseId) {
                const { responseId } = req.body;
                
                const { data: responseData, error: responseError } = await supabase.from('responses').select('*, questionnaire:questionnaires(*, sections(*, questions(*)))').eq('id', responseId).single();
                if (responseError || !responseData) return res.status(404).json({ error: 'Questionnaire response not found.' });
                
                const { answers, questionnaire } = responseData;
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

                const existingFrames = await miroApiRequest(`/boards/${board.id}/frames`, accessToken);
                const frameCount = existingFrames?.data?.length || 0;

                const frameWidth = 1200;
                const frameHeight = 500;
                const stickyWidth = 250;
                const padding = 30;
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
                let currentYPosition = frameCount * (frameHeight + 100);

                for (const section of questionnaire.sections) {
                    const sectionQAs = section.questions.map((q: any) => ({ question: q.prompt, answer: answers[q.id] })).filter((qa: any) => qa.answer);
                    if (sectionQAs.length === 0) continue;

                    const contentString = sectionQAs.map((qa: any) => `Q: ${qa.question}\nA: ${String(qa.answer)}`).join('\n\n');
                    const prompt = `Based on these client answers from the "${section.title}" section, generate 2-3 key discussion points. Format as a valid JSON array like [{"title": "...", "content": "..."}]. Keep each point concise. Answers: ${contentString}`;
                    const result = await model.generateContent(prompt);
                    let discussionPoints;
                    try {
                        const jsonString = result.response.text().replace(/```json\n?|\n?```/g, '');
                        discussionPoints = JSON.parse(jsonString);
                    } catch { continue; }
                    if (!Array.isArray(discussionPoints) || discussionPoints.length === 0) continue;

                    const frame = await miroApiRequest(`/boards/${board.id}/frames`, accessToken, {
                        method: 'POST',
                        body: JSON.stringify({
                            data: { title: `${section.title} - ${new Date(responseData.submitted_at).toLocaleDateString()}` },
                            position: { x: 0, y: currentYPosition },
                            geometry: { width: frameWidth, height: frameHeight },
                        }),
                    });

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
                    currentYPosition += frameHeight + 100;
                }
                return res.status(200).json({ boardUrl: board.viewLink });
            }
            
            // If neither payload matches, send an error
            else {
                return res.status(400).json({ error: 'Invalid request body. Must include either "responseId" or an "insights" array.' });
            }

        } catch (error: any) {
            console.error('Error during POST to responses endpoint:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
}