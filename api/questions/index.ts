import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../lib/auth';

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
    const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (Array.isArray(req.body)) {
      const updates = req.body as { id: string; order: number }[];
      if (updates.length === 0) return res.status(400).json({ error: 'Empty array provided for bulk update.' });
      const { error } = await supabase.from('questions').upsert(updates);
      if (error) return res.status(500).json({ error: 'Question reordering failed.', details: error.message });
      return res.status(200).json({ message: 'Questions reordered successfully.' });
    } else {
      const { section_id, prompt, type, is_required, order, options } = req.body;
      if (!section_id || !prompt || !type) return res.status(400).json({ error: 'Section ID, prompt, and type are required' });
      const { data, error } = await supabase.from('questions').insert({ section_id, prompt, type, is_required: is_required || false, order: order || 0, options: options || null }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }
  }

  if (req.method === 'PATCH') {
    const { id, ...updatePayload } = req.body;
    if (!id) return res.status(400).json({ error: 'Question ID is required for updates' });
    if (Object.keys(updatePayload).length === 0) return res.status(400).json({ error: 'No update data provided.' });
    const { data, error } = await supabase.from('questions').update(updatePayload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Question ID is required for deletion' });
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}