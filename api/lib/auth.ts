import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Verifies the Clerk session token from the request's Authorization header
 * using manual JWT verification against Clerk's public keys (JWKS).
 * This is the most robust method for serverless environments as it has no complex dependencies.
 *
 * @param req The VercelRequest object.
 * @param res The VercelResponse object.
 * @returns A promise that resolves to the token payload (claims) if valid, otherwise null.
 */
export async function authenticateRequest(req: VercelRequest, res: VercelResponse) {
  const jwksUrl = process.env.CLERK_JWKS_URL;

  if (!jwksUrl) {
    console.error('SERVER ERROR: CLERK_JWKS_URL environment variable is not set.');
    // Do not expose internal configuration errors to the client for security.
    res.status(500).json({ error: 'Internal server configuration error.' });
    return null;
  }

  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided.' });
    return null;
  }

  try {
    // Create a Remote JWK Set from the Clerk JWKS URL.
    // This securely fetches the public keys needed to verify the token.
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    
    // jwtVerify will perform several critical checks:
    // 1. Fetch the correct public key from the JWKS endpoint.
    // 2. Verify the token's signature against that public key.
    // 3. Check that the token is not expired (exp claim).
    // 4. Check that the token is not used before its time (nbf claim).
    // It throws an error if any of these checks fail.
    const { payload } = await jwtVerify(token, JWKS);
    
    // If we reach here, the token is valid.
    return payload; 

  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    // Provide a generic error message to the client.
    res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    return null;
  }
}