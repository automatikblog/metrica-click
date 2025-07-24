#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting build process...');

try {
  // Build frontend
  console.log('Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Copy public files to dist
  console.log('Copying public files...');
  const publicDir = 'public';
  const distPublicDir = 'dist/public';
  
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    files.forEach(file => {
      const srcPath = path.join(publicDir, file);
      const destPath = path.join(distPublicDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file} to dist/public`);
    });
  }
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}