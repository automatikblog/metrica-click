import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Read the tracking script from public folder
    const scriptPath = path.join(process.cwd(), 'public', 'mc.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    res.status(200).send(scriptContent);
  } catch (error) {
    console.error('Error serving mc.js:', error);
    res.status(404).send('// Script not found');
  }
}