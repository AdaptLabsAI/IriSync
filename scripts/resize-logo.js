#!/usr/bin/env node

/**
 * Logo Resizer Script for IriSync
 * 
 * This script takes a square logo image and generates all the required 
 * sizes for PWA icons and favicons.
 * 
 * Usage: node resize-logo.js <path-to-source-logo> [output-directory]
 * 
 * Example: node resize-logo.js ./logo-square.png ../public/icons
 * 
 * Requirements: 
 * - Sharp image processing library: npm install sharp
 * - Source logo should be at least 512x512 pixels
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Icon sizes needed according to manifest.json
const PWA_ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Additional sizes for favicon and apple touch icon
const ADDITIONAL_SIZES = [
  { size: 16, name: 'favicon-16x16.png', location: 'public' },
  { size: 32, name: 'favicon-32x32.png', location: 'public' },
  { size: 180, name: 'apple-touch-icon.png', location: 'public' },
  { size: 150, name: 'mstile-150x150.png', location: 'public' }
];

async function resizeImage(sourcePath, outputDir) {
  console.log(`Source image: ${sourcePath}`);
  console.log(`Output directory: ${outputDir}`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  
  // Read source image metadata
  try {
    const metadata = await sharp(sourcePath).metadata();
    console.log(`Source image dimensions: ${metadata.width}x${metadata.height}`);
    
    if (metadata.width < 512 || metadata.height < 512) {
      console.warn('WARNING: Source image is smaller than 512x512 pixels. This may result in low-quality icons.');
    }
    
    // Make sure image is square (use the smaller dimension)
    const size = Math.min(metadata.width, metadata.height);
    const processedImage = sharp(sourcePath)
      .resize({
        width: size,
        height: size,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    
    // Generate PWA icons
    console.log('\nGenerating PWA icons...');
    for (const iconSize of PWA_ICON_SIZES) {
      const outputPath = path.join(outputDir, `icon-${iconSize}x${iconSize}.png`);
      await processedImage
        .clone()
        .resize(iconSize, iconSize)
        .png({ quality: 90 })
        .toFile(outputPath);
      console.log(`Created: ${outputPath}`);
    }
    
    // Get the project root directory (assuming script is in project/scripts)
    const projectRoot = path.resolve(path.dirname(outputDir), '..');
    
    // Generate additional icons (favicon, apple touch icon, etc.)
    console.log('\nGenerating additional icons...');
    for (const icon of ADDITIONAL_SIZES) {
      const outputPath = path.join(projectRoot, icon.location, icon.name);
      
      // Create the directory if it doesn't exist
      const outputDirPath = path.dirname(outputPath);
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }
      
      await processedImage
        .clone()
        .resize(icon.size, icon.size)
        .png({ quality: 90 })
        .toFile(outputPath);
      console.log(`Created: ${outputPath}`);
    }
    
    console.log('\nIcon generation complete!');
    console.log('\nNOTE: This script does not generate favicon.ico. Use a tool like https://realfavicongenerator.net/ to create the multi-size ICO file.');
    
  } catch (error) {
    console.error('Error processing image:', error);
    process.exit(1);
  }
}

// Main execution
(async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Error: Missing source image path');
    console.log('Usage: node resize-logo.js <path-to-source-logo> [output-directory]');
    console.log('Example: node resize-logo.js ./logo-square.png ../public/icons');
    process.exit(1);
  }
  
  const sourcePath = args[0];
  const outputDir = args.length > 1 ? args[1] : path.join(__dirname, '../public/icons');
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Source file not found: ${sourcePath}`);
    process.exit(1);
  }
  
  await resizeImage(sourcePath, outputDir);
})();