// api/responses/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ✅ CRITICAL: Service key client MUST bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        // Explicitly use service role
        'apikey': supabaseServiceKey,
      }
    }
  });

  const body = req.body as { 
    questionnaire_id?: string; 
    answers?: any;
    respondent_id?: string;
  };
  
  const { questionnaire_id, answers } = body;
  
  if (!questionnaire_id || !answers) {
    return res.status(400).json({ 
      error: 'Questionnaire ID and answers are required' 
    });
  }

  const respondent_id = body.respondent_id || `user_${Date.now()}`;
  
  try {
    console.log('[API] Attempting to insert response:', {
      questionnaire_id,
      respondent_id,
      answersCount: Object.keys(answers).length
    });

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
      console.error('[API] Supabase insert error:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    }

    console.log('[API] Response inserted successfully:', data.id);
    return res.status(201).json(data);
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}
