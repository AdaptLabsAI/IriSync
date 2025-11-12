# IriSync App Icons

This directory should contain the square version of the IriSync logo in multiple sizes for use as app icons, favicons, and PWA assets.

## Required Icon Sizes (as referenced in manifest.json)

- `icon-72x72.png` (72×72 pixels)
- `icon-96x96.png` (96×96 pixels)
- `icon-128x128.png` (128×128 pixels)
- `icon-144x144.png` (144×144 pixels)
- `icon-152x152.png` (152×152 pixels)
- `icon-192x192.png` (192×192 pixels)
- `icon-384x384.png` (384×384 pixels)
- `icon-512x512.png` (512×512 pixels)

## Additional Important Icons

- `favicon.ico` - Place in the main public directory, not here (multi-size ICO file: 16x16, 32x32, 48x48)
- `apple-touch-icon.png` - 180×180 pixels with no transparency for iOS devices
- `favicon-16x16.png` - 16×16 pixels for legacy browsers
- `favicon-32x32.png` - 32×32 pixels for legacy browsers
- `mstile-150x150.png` - 150×150 pixels for Microsoft Tiles

## How to Generate Icons

1. **From your square logo**:
   - Start with your square logo at least 512×512 pixels in size
   - Make sure it has appropriate padding (logo should occupy ~70-80% of the canvas)
   - The logo should work well on both light and dark backgrounds

2. **Generation methods**:
   - Use a tool like https://realfavicongenerator.net/ to generate all required sizes
   - Or use https://app-manifest.dev/ for PWA icons specifically
   - For manual resizing, use Photoshop, GIMP, or Figma with proper image optimization

3. **After generation**:
   - Place all generated PNG files in this directory
   - Place favicon.ico in the main public directory
   - Verify all paths in manifest.json match your icon filenames 