// api/health.ts - FIXED VERSION
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Helper to add CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  // --- MIRO AUTH INITIATION ---
  if (req.method === 'GET' && action === 'miro_auth') {
    const clientId = process.env.MIRO_CLIENT_ID;
    const redirectUri = process.env.MIRO_REDIRECT_URI;

    console.log('🔐 Miro Auth Request:', {
      clientId: clientId ? '✅ Set' : '❌ Missing',
      redirectUri: redirectUri ? '✅ Set' : '❌ Missing',
      query: req.query
    });

    if (!clientId || !redirectUri) {
      console.error('❌ Missing Miro env vars');
      return res.status(500).json({ 
        error: 'Miro environment variables are not configured.',
        details: {
          clientId: !!clientId,
          redirectUri: !!redirectUri
        }
      });
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      console.error('❌ Missing userId');
      return res.status(400).json({ error: 'User ID is required.' });
    }

    console.log('✅ Redirecting to Miro auth for user:', userId);
    
    const authUrl = `https://miro.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
    
    return res.redirect(302, authUrl);
  }

  // --- MIRO AUTH CALLBACK ---
  if (req.method === 'GET' && action === 'miro_callback') {
    const { code, state: userId } = req.query;

    console.log('📥 Miro Callback:', {
      code: code ? '✅ Present' : '❌ Missing',
      userId: userId ? '✅ Present' : '❌ Missing'
    });

    if (typeof code !== 'string' || typeof userId !== 'string') {
      console.error('❌ Invalid callback params');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui; padding: 2rem; text-align: center;">
            <h1>❌ Error</h1>
            <p>Invalid request from Miro: missing code or state.</p>
            <button onclick="window.close()">Close Window</button>
          </body>
        </html>
      `);
    }

    try {
      console.log('🔄 Exchanging code for tokens...');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://api.miro.com/v1/oauth/token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.MIRO_CLIENT_ID!,
          client_secret: process.env.MIRO_CLIENT_SECRET!,
          code: code,
          redirect_uri: process.env.MIRO_REDIRECT_URI!,
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        console.error('❌ Miro token exchange failed:', errorBody);
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();
      console.log('✅ Got tokens from Miro');

      // Initialize Supabase with service key (bypasses RLS)
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

      console.log('🔧 Supabase config:', {
        url: supabaseUrl ? '✅ Set' : '❌ Missing',
        key: supabaseKey ? '✅ Set' : '❌ Missing'
      });

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase environment variables not configured');
      }

      const supabase = createClient(supabaseUrl, supabaseKey, { 
        auth: { persistSession: false }
      });

      console.log('💾 Storing tokens for user:', userId);

      // Use upsert to insert or update
      const { data, error } = await supabase
        .from('miro_tokens')
        .upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Supabase error:', JSON.stringify(error, null, 2));
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ Tokens stored successfully:', data);

      // Return success page
      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Miro Connected</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
              }
              h1 { margin: 0 0 0.5rem 0; font-size: 2rem; }
              p { margin: 0; opacity: 0.9; }
              .checkmark {
                font-size: 4rem;
                margin-bottom: 1rem;
                animation: bounce 0.6s;
              }
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">✅</div>
              <h1>Miro Connected!</h1>
              <p>You can now export responses to Miro.</p>
              <p style="margin-top: 1rem; font-size: 0.9rem;">This window will close automatically...</p>
            </div>
            <script>
              // Send message to parent window
              if (window.opener) {
                window.opener.postMessage({ type: 'MIRO_AUTH_SUCCESS' }, '*');
              }
              
              // Auto-close after 2 seconds
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);

    } catch (error: any) {
      console.error('❌ Full error:', error);
      
      res.setHeader('Content-Type', 'text/html');
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #dc2626;
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                max-width: 500px;
              }
              button {
                margin-top: 1rem;
                padding: 0.5rem 1rem;
                background: white;
                color: #dc2626;
                border: none;
                border-radius: 0.5rem;
                cursor: pointer;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Connection Failed</h1>
              <p style="margin: 1rem 0;">${error.message}</p>
              <p style="font-size: 0.9rem; opacity: 0.9;">Check the server logs for more details.</p>
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }
  }

  // --- DEFAULT HEALTH CHECK ---
  return res.status(200).json({
    status: "ok",
    message: "API routing is working correctly!",
    timestamp: new Date().toISOString()
  });
}