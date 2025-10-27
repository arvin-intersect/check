// FINAL CODE: REPLACE this file at api/health.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from './lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;

    // --- MIRO AUTH START ---
    if (req.method === 'GET' && action === 'miro_auth') {
        const clientId = process.env.MIRO_CLIENT_ID;
        const redirectUri = process.env.MIRO_REDIRECT_URI;
        if (!clientId || !redirectUri) {
            return res.status(500).send('Miro environment variables are not configured.');
        }
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).send('User ID is required.');
        }
        const authUrl = `https://miro.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${userId}`;
        return res.redirect(302, authUrl);
    }

    // --- MIRO AUTH CALLBACK ---
    if (req.method === 'GET' && action === 'miro_callback') {
        const { code, state: userId } = req.query;
        if (typeof code !== 'string' || typeof userId !== 'string') {
            return res.status(400).send('Invalid request from Miro: missing code or state.');
        }

        try {
            const response = await fetch('https://api.miro.com/v1/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: process.env.MIRO_CLIENT_ID!,
                    client_secret: process.env.MIRO_CLIENT_SECRET!,
                    code: code,
                    redirect_uri: process.env.MIRO_REDIRECT_URI!,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Miro token exchange failed: ${errorBody}`);
            }

            const tokens = await response.json();
            const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });
            
            const { error } = await supabase.from('miro_tokens').upsert({
                user_id: userId,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

            if (error) throw error;

            res.setHeader('Content-Type', 'text/html');
            return res.send("<script>window.close();</script>");

        } catch (error: any) {
            console.error(error);
            return res.status(500).send(`Authentication failed: ${error.message}`);
        }
    }
    
    // --- NEW: CHECK MIRO CONNECTION STATUS ---
    if (req.method === 'GET' && action === 'check_miro_status') {
        const claims = await authenticateRequest(req, res);
        if (!claims || !claims.sub) return; // Auth failed
        const userId = claims.sub;

        try {
            const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });
            const { data, error } = await supabase.from('miro_tokens').select('user_id').eq('user_id', userId).maybeSingle();
            
            if (error) throw error;
            
            return res.status(200).json({ isConnected: !!data });

        } catch (error: any) {
            console.error('Error checking Miro connection status:', error);
            return res.status(500).json({ error: 'Failed to check connection status' });
        }
    }

    // --- ORIGINAL HEALTH CHECK ---
    res.status(200).json({ 
        status: "ok", 
        message: "API routing is working correctly!",
        timestamp: new Date().toISOString() 
    });
}