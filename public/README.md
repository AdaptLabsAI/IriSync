# IriSync Public Assets Directory

This directory contains static assets that are directly accessible through the web server.

## Important Files

- **favicon.ico** - The website icon shown in browser tabs (required)
- **robots.txt** - Instructions for search engine crawlers
- **sitemap.xml** - Sitemap for search engines
- **manifest.json** - Web App Manifest for PWA functionality

## Subdirectories

- **/icons/** - App icons in various sizes for PWA and mobile devices
- **/images/** - Contains logo variants and other static images
  - Horizontal logo
  - Large logo
  - IriSync logo

## Notes for Deployment

- All files in this directory are publicly accessible
- No sensitive data should be placed here
- Keep image files optimized for performance
- Update the sitemap.xml and robots.txt before production deployment

## Browser Compatibility

The public directory includes assets to support:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- PWA installation on mobile and desktop
- iOS home screen functionality
- Legacy browser support via multiple favicon formats 