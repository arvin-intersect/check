// api/questionnaires/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const claims = await authenticateRequest(req, res);
  if (!claims) {
    return; // Response is already sent by the helper
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false }
  });

  const isWorkshopsRequest = req.url?.startsWith('/api/workshops');

  // --- NEW LOGIC FOR WORKSHOPS ---
  if (isWorkshopsRequest) {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('workshops')
          .select('*')
          .eq('owner_id', claims.sub)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }

    if (req.method === 'POST') {
      try {
        const { name, client_name } = req.body;
        if (!name) return res.status(400).json({ error: 'Workshop name is required.' });

        const { data, error } = await supabase
          .from('workshops')
          .insert({ name, client_name: client_name || 'Unassigned Client', owner_id: claims.sub, status: 'draft' })
          .select()
          .single();
        if (error) throw error;
        return res.status(201).json(data);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }
  }

  // --- ORIGINAL LOGIC FOR QUESTIONNAIRES ---
  else {
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
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}