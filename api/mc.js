import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Try multiple possible paths for the script
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'mc.js'),
      path.join(process.cwd(), 'dist', 'public', 'mc.js'),
      path.join(process.cwd(), '..', 'public', 'mc.js')
    ];
    
    let scriptContent = null;
    
    for (const scriptPath of possiblePaths) {
      try {
        if (fs.existsSync(scriptPath)) {
          scriptContent = fs.readFileSync(scriptPath, 'utf8');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (scriptContent) {
      res.status(200).send(scriptContent);
    } else {
      throw new Error('Script file not found in any location');
    }
  } catch (error) {
    console.error('Error serving mc.js:', error);
    res.status(404).send('// MétricaClick script not found - please check deployment');
  }
}