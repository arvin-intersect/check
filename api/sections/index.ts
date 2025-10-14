import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../lib/auth.js';


const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ SECURE THE ENDPOINT
  const claims = await authenticateRequest(req, res);
  if (!claims) {
    return; // Response is already sent by the helper
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('sections').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { questionnaire_id, title, description, order } = req.body;
    if (!questionnaire_id || !title) return res.status(400).json({ error: 'Questionnaire ID and title are required' });
    const { data, error } = await supabase.from('sections').insert({ questionnaire_id, title, description, order: order || 0 }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    const { id, ...updatePayload } = req.body;
    if (!id) return res.status(400).json({ error: 'Section ID is required for updates' });
    if (Object.keys(updatePayload).length === 0) return res.status(400).json({ error: 'No update data provided.' });
    const { data, error } = await supabase.from('sections').update(updatePayload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Section ID is required for deletion' });
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}