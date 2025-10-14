import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Clerk } from '@clerk/clerk-sdk-node';

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('SERVER ERROR: CLERK_SECRET_KEY environment variable is not set.');
}

// Initialize Clerk with your secret key
const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Verifies the Clerk session token from the request's Authorization header.
 * If the token is valid, it returns the session claims (user data).
 * If invalid, it sends a 401 response and returns null.
 * @param req The VercelRequest object.
 * @param res The VercelResponse object.
 * @returns A promise that resolves to the session claims or null.
 */
export async function authenticateRequest(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided.' });
    return null;
  }

  try {
    // Verify the token using Clerk's SDK
    const claims = await clerk.verifyToken(token);
    // If successful, the request is authenticated.
    return claims;
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    return null;
  }
}