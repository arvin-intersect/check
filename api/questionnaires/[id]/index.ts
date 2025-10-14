// api/questionnaires/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../../lib/auth.js';


export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ SECURE THE ENDPOINT
  const claims = await authenticateRequest(req, res);
  if (!claims) {
    return; // Response is already sent by the helper
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('questionnaires').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: 'Questionnaire not found' });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const { status, title, organization } = req.body;
    const updatePayload: { [key: string]: any } = {};
    if (status) {
        if (!['draft', 'published', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status provided.' });
        updatePayload.status = status;
    }
    if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') return res.status(400).json({ error: 'Title cannot be empty.' });
        updatePayload.title = title;
    }
    if (organization !== undefined) updatePayload.organization = organization;
    if (Object.keys(updatePayload).length === 0) return res.status(400).json({ error: 'No update data provided.' });

    updatePayload.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase.from('questionnaires').update(updatePayload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}