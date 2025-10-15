// api/responses/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CORS Setup ---
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- ACTION: Fetch Saved Progress ---
  if (req.method === 'GET') {
    const { sessionId, questionnaireId } = req.query;

    if (typeof sessionId !== 'string' || typeof questionnaireId !== 'string') {
      return res.status(400).json({ error: 'sessionId and questionnaireId are required query parameters.' });
    }

    const { data, error } = await supabase
      .from('responses')
      .select('answers')
      .eq('respondent_id', sessionId)
      .eq('questionnaire_id', questionnaireId)
      .eq('status', 'in-progress')
      .maybeSingle();

    if (error) {
      console.error('Error fetching progress:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  // --- ACTION: Save Progress (Autosave) ---
  if (req.method === 'PATCH') {
    const { questionnaire_id, respondent_id, answers } = req.body;

    if (!questionnaire_id || !respondent_id || !answers) {
      return res.status(400).json({ error: 'Missing required fields for saving progress.' });
    }

    // Filter out empty answers before saving
    const nonEmptyAnswers = Object.fromEntries(
      Object.entries(answers).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
    );

    // Don't save if there are no answers
    if (Object.keys(nonEmptyAnswers).length === 0) {
      return res.status(200).json({ message: 'No answers to save' });
    }

    const { data, error } = await supabase
      .from('responses')
      .upsert(
        {
          questionnaire_id,
          respondent_id,
          answers: nonEmptyAnswers,
          status: 'in-progress',
        },
        { onConflict: 'questionnaire_id, respondent_id' }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Error upserting response:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Progress saved', id: data.id });
  }

  // --- ACTION: Final Submission ---
  if (req.method === 'POST') {
    const { questionnaire_id, respondent_id, answers } = req.body;

    if (!questionnaire_id || !respondent_id || !answers) {
      return res.status(400).json({ error: 'Questionnaire ID, respondent ID, and answers are required.' });
    }

    // Filter out empty answers
    const nonEmptyAnswers = Object.fromEntries(
      Object.entries(answers).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
    );

    if (Object.keys(nonEmptyAnswers).length === 0) {
      return res.status(400).json({ error: 'At least one answer is required.' });
    }

    // Use upsert to handle both new submissions and updates to drafts
    const { data, error } = await supabase
      .from('responses')
      .upsert(
        {
          questionnaire_id,
          respondent_id,
          answers: nonEmptyAnswers,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'questionnaire_id, respondent_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[API] Supabase final submission error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('[API] Response finalized successfully:', data.id);
    return res.status(200).json(data);
  }

  // --- Fallback for disallowed methods ---
  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}