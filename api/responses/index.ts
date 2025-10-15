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

  // --- ACTION: Fetch the single 'in-progress' response for a form ---
  if (req.method === 'GET') {
    const { questionnaireId } = req.query;
    if (typeof questionnaireId !== 'string') {
      return res.status(400).json({ error: 'questionnaireId is a required query parameter.' });
    }
    const { data, error } = await supabase
      .from('responses')
      .select('answers')
      .eq('questionnaire_id', questionnaireId)
      .eq('status', 'in-progress')
      .maybeSingle();
    if (error) { return res.status(500).json({ error: error.message }); }
    return res.status(200).json(data);
  }

  // --- ACTION: Save progress for the single draft ---
  if (req.method === 'PATCH') {
    const { questionnaire_id, answers } = req.body;
    if (!questionnaire_id || !answers) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    
    // This is a "manual upsert": try to update, and if no row is updated, insert.
    // This avoids all TypeScript errors with complex upsert options.
    
    // Step 1: Try to update an existing draft.
    const { data: updateData, error: updateError } = await supabase
      .from('responses')
      .update({ answers, last_saved_at: new Date().toISOString() })
      .eq('questionnaire_id', questionnaire_id)
      .eq('status', 'in-progress')
      .select('id')
      .single();

    if (updateError && updateError.code !== 'PGRST116') { // PGRST116 is the "no rows found" error, which is expected.
      console.error("Error during update step of upsert:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // If we successfully updated a row, we are done.
    if (updateData) {
      return res.status(200).json({ message: 'Progress saved', id: updateData.id });
    }
    
    // Step 2: If no row was updated (updateData is null), insert a new one.
    const generic_respondent_id = `collaborative_${questionnaire_id}`;
    const { data: insertData, error: insertError } = await supabase
      .from('responses')
      .insert({
        questionnaire_id,
        answers,
        respondent_id: generic_respondent_id,
        status: 'in-progress',
        last_saved_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error("Error during insert step of upsert:", insertError);
      return res.status(500).json({ error: insertError.message });
    }
    return res.status(201).json({ message: 'Progress saved', id: insertData.id });
  }

  // --- ACTION: Final Submission ---
  if (req.method === 'POST') {
    const { questionnaire_id, answers } = req.body;
    if (!questionnaire_id || !answers) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    
    // Simple and robust: DELETE the old draft and INSERT the final version.
    
    // Step 1: Delete the old draft if it exists.
    await supabase.from('responses').delete().eq('questionnaire_id', questionnaire_id).eq('status', 'in-progress');
    
    // Step 2: Insert the new, final, submitted record.
    const final_respondent_id = `submitted_${crypto.randomUUID()}`;
    const { data, error } = await supabase
      .from('responses')
      .insert({
        questionnaire_id,
        answers,
        respondent_id: final_respondent_id,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) { 
      console.error("Error during final submission insert:", error);
      return res.status(500).json({ error: error.message }); 
    }
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}