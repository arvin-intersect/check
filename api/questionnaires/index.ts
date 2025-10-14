// api/questionnaires/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*, responses(count)')
      .order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const formattedData = data.map((q: any) => ({ ...q, responses: q.responses[0]?.count ?? 0 }));
    return res.status(200).json(formattedData);
  }

  if (req.method === 'POST') {
    const { title, organization, owner } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!owner) return res.status(400).json({ error: 'Owner is required' });
    
    const { data, error } = await supabase
      .from('questionnaires')
      .insert({ title, organization, status: 'draft', owner })
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}