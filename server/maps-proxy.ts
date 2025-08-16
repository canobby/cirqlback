import { Request, Response } from 'express';

// Simple proxy endpoint to serve Google Maps API key
export function getMapsConfig(req: Request, res: Response) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  // Return the API key for client-side use
  res.json({
    apiKey: apiKey,
    libraries: ['places']
  });
}