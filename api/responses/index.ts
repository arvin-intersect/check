// api/responses/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
);

// This is the helper function we need. It tries to add the UNIQUE constraint.
// We run it at the start of our handler.
async function ensureUniqueConstraint() {
  // This is the name of the constraint we want.
  const constraintName = 'responses_questionnaire_id_status_in_progress_key';
  
  // Check if the constraint already exists
  const { data: constraints, error: checkError } = await supabase.rpc('pg_get_constraintdef', { conoid: `public_${constraintName}` as any }).select('*');

  if (checkError && !checkError.message.includes('does not exist')) {
    console.error('Error checking for constraint:', checkError.message);
    return; // Don't proceed if we can't check
  }
  
  // If it doesn't exist, create it.
  if (!constraints || constraints.length === 0) {
    console.log(`Constraint ${constraintName} not found. Attempting to create it.`);
    const { error: createError } = await supabase.rpc('query', { sql: `
      ALTER TABLE public.responses 
      DROP CONSTRAINT IF EXISTS responses_questionnaire_id_key;

      DROP CONSTRAINT IF EXISTS responses_questionnaire_id_respondent_id_key;
      
      CREATE UNIQUE INDEX IF NOT EXISTS ${constraintName}
      ON public.responses (questionnaire_id)
      WHERE (status = 'in-progress');
    `});

    if (createError) {
      console.error(`Failed to create unique constraint: ${createError.message}`);
    } else {
      console.log(`Successfully created unique constraint: ${constraintName}`);
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure the DB is set up correctly on the first run.
  await ensureUniqueConstraint();

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
    
    // A two-step "manual upsert" that avoids the TypeScript error
    // Step 1: Try to update an existing draft
    const { data: updateData, error: updateError } = await supabase
      .from('responses')
      .update({ answers, last_saved_at: new Date().toISOString() })
      .eq('questionnaire_id', questionnaire_id)
      .eq('status', 'in-progress')
      .select('id')
      .single();

    if (updateError && updateError.code !== 'PGRST116') { // Ignore 'no rows' error
        return res.status(500).json({ error: updateError.message });
    }

    // If we updated a row, we're done.
    if (updateData) {
        return res.status(200).json({ message: 'Progress saved', id: updateData.id });
    }
    
    // Step 2: If no row was updated, insert a new one.
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

    if (insertError) { return res.status(500).json({ error: insertError.message }); }
    return res.status(201).json({ message: 'Progress saved', id: insertData.id });
  }

  // --- ACTION: Final Submission ---
  if (req.method === 'POST') {
    const { questionnaire_id, answers } = req.body;
    if (!questionnaire_id || !answers) {
      return res.status(400).json({ error: 'Missing fields.' });
    }
    
    // Delete the old draft
    await supabase.from('responses').delete().eq('questionnaire_id', questionnaire_id).eq('status', 'in-progress');
    
    // Insert the new final record
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

    if (error) { return res.status(500).json({ error: error.message }); }
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}