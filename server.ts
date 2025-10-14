// server.ts
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service key are required.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- QUESTIONNAIRES ---
app.get('/api/questionnaires', async (req, res) => {
  const { data, error } = await supabase
    .from('questionnaires')
    .select('*, responses(count)')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching questionnaires with counts:', error);
    return res.status(500).json({ error: error.message });
  }

  const formattedData = data.map(q => ({
    ...q,
    responses: q.responses[0]?.count ?? 0,
  }));

  res.json(formattedData);
});

app.post('/api/questionnaires', async (req, res) => {
  const { title, organization } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const { data, error } = await supabase.from('questionnaires').insert({ title, organization, status: 'draft', owner: 'Sarah Chen' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.get('/api/questionnaires/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('questionnaires').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ error: 'Questionnaire not found' });
  res.json(data);
});

app.get('/api/questionnaires/:id/full', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('questionnaires')
    .select('*, sections(*, questions(*))')
    .eq('id', id)
    .order('order', { foreignTable: 'sections', ascending: true })
    .order('order', { foreignTable: 'sections.questions', ascending: true })
    .single();
  if (error) return res.status(404).json({ error: 'Questionnaire not found' });
  res.json(data);
});

app.patch('/api/questionnaires/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['draft', 'published', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
    }
    const { data, error } = await supabase
        .from('questionnaires')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) {
        console.error(`Error updating questionnaire ${id}:`, error);
        return res.status(500).json({ error: error.message });
    }
    res.status(200).json(data);
});

// NEW: GET all responses for a specific questionnaire
app.get('/api/questionnaires/:id/responses', async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('questionnaire_id', id)
        .order('submitted_at', { ascending: false });

    if (error) {
        console.error(`Error fetching responses for questionnaire ${id}:`, error);
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
});


// --- SECTIONS ---
app.post('/api/sections', async (req, res) => {
    const { questionnaire_id, title, description } = req.body;
    if (!questionnaire_id || !title) return res.status(400).json({ error: 'Questionnaire ID and title are required' });
    const { data, error } = await supabase.from('sections').insert({ questionnaire_id, title, description }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// --- QUESTIONS ---
app.post('/api/questions', async (req, res) => {
    const { section_id, prompt, type, is_required } = req.body;
    if (!section_id || !prompt || !type) return res.status(400).json({ error: 'Section ID, prompt, and type are required' });
    const { data, error } = await supabase.from('questions').insert({ section_id, prompt, type, is_required }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// --- RESPONSES ---
app.post('/api/responses', async (req, res) => {
    const { questionnaire_id, answers } = req.body;
    if (!questionnaire_id || !answers) {
        return res.status(400).json({ error: 'Questionnaire ID and answers are required' });
    }
    const respondent_id = `user_${Date.now()}`;
    const { data, error } = await supabase
        .from('responses')
        .insert({
            questionnaire_id,
            answers,
            respondent_id,
            status: 'submitted',
            submitted_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving response:', error);
        return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
});

app.listen(port, () => {
  console.log(`[server]: API running at http://localhost:${port}`);
});