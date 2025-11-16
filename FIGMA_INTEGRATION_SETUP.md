# Figma MCP Integration Setup

## Overview

This document outlines the Figma MCP (Model Context Protocol) integration for IriSync to sync UI components with Figma designs.

---

## Phase 3: Figma Integration (In Progress)

### Prerequisites

1. **Figma Account**: Ensure you have access to the IriSync Figma file
2. **Figma Personal Access Token**: Required to access the Figma API
3. **File Key**: The unique identifier for your Figma file

---

## Step 1: Get Figma Access Token

### Generate Personal Access Token

1. Go to https://www.figma.com/
2. Click your profile icon > Settings
3. Scroll to "Personal Access Tokens"
4. Click "Generate new token"
5. Give it a name (e.g., "IriSync MCP Integration")
6. Copy the token immediately (it won't be shown again)

### Add to Environment Variables

**Local Development (.env.local):**
```bash
FIGMA_PERSONAL_ACCESS_TOKEN=figd_WW4QFszrHwIitXB3qFdjRSf8TlY1XCEsR-cKFDLO
FIGMA_ACCESS_TOKEN=figd_WW4QFszrHwIitXB3qFdjRSf8TlY1XCEsR-cKFDLO
```

**Vercel Production:**
Add both variables in Vercel dashboard.

---

## Step 2: Get Figma File Key

### Find Your File Key

The file key is in the Figma file URL:
```
https://www.figma.com/file/YiFahCtPWUPWbB9TcvCpsj/IriSync-Design
                            ^^^^^^^^^^^^^^^^^^^^^^^
                            This is your file key
```

### Add to Environment Variables

```bash
FIGMA_FILE_KEY=YiFahCtPWUPWbB9TcvCpsj
```

---

## Step 3: MCP Configuration

### Create MCP Config File

The MCP configuration is already set up in `/mcp.config.json`:

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "${FIGMA_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

This configuration:
- Uses the official Figma MCP server
- Automatically installs via npx
- Uses the personal access token from environment

---

## Step 4: Figma File Structure

### Expected Figma Organization

For optimal MCP integration, organize your Figma file:

```
IriSync Design File
├── 📱 Screens
│   ├── Login Page
│   ├── Dashboard
│   ├── Analytics
│   └── Settings
├── 🧩 Components
│   ├── Buttons
│   ├── Forms
│   ├── Cards
│   └── Navigation
├── 🎨 Styles
│   ├── Colors
│   ├── Typography
│   └── Spacing
└── 📐 Assets
    ├── Icons
    └── Images
```

### Component Naming Convention

Use consistent naming in Figma:
- `Button/Primary` → Maps to `<Button variant="primary">`
- `Card/Stats` → Maps to `<StatsCard>`
- `Form/Input` → Maps to `<Input>`

---

## Step 5: Pages to Sync with Figma

### Priority Pages (Match Figma Designs)

1. **Login Page** (`/src/app/(auth)/login/page.tsx`)
   - Current: Custom styled
   - Target: Match Figma "Login Page" design
   - Components: Form inputs, social login buttons, branding

2. **Dashboard** (`/src/app/(dashboard)/page.tsx`)
   - Current: Functional layout
   - Target: Match Figma "Dashboard" design
   - Components: Stats cards, charts, quick actions

3. **Analytics** (`/src/app/(dashboard)/analytics/page.tsx`)
   - Current: Basic charts
   - Target: Match Figma "Analytics" design
   - Components: Advanced charts, filters, date pickers

4. **Settings** (`/src/app/(dashboard)/settings/page.tsx`)
   - Current: Basic forms
   - Target: Match Figma "Settings" design
   - Components: Tabs, form sections, toggles

---

## Step 6: Using Figma MCP

### Access Figma Data via MCP

The Figma MCP server provides access to:
- Design tokens (colors, typography, spacing)
- Component definitions
- Layout specifications
- Asset URLs

### Example MCP Queries

```bash
# Get file information
curl -X POST http://localhost:3000/api/mcp/figma \
  -H "Content-Type: application/json" \
  -d '{"action": "getFile", "fileKey": "YiFahCtPWUPWbB9TcvCpsj"}'

# Get specific component
curl -X POST http://localhost:3000/api/mcp/figma \
  -H "Content-Type: application/json" \
  -d '{"action": "getComponent", "componentId": "..."}'

# Export design tokens
curl -X POST http://localhost:3000/api/mcp/figma \
  -H "Content-Type: application/json" \
  -d '{"action": "getStyles"}'
```

---

## Step 7: Design Token Integration

### Extract Figma Styles

Create a script to extract design tokens from Figma:

```typescript
// scripts/sync-figma-tokens.ts
import { getFigmaFile } from '@/lib/figma/client';

async function syncDesignTokens() {
  const file = await getFigmaFile(process.env.FIGMA_FILE_KEY!);
  
  // Extract colors
  const colors = extractColors(file.styles);
  
  // Extract typography
  const typography = extractTypography(file.styles);
  
  // Write to Tailwind config
  updateTailwindConfig({ colors, typography });
}
```

### Update Tailwind Configuration

Sync Figma tokens to Tailwind:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // From Figma
        'primary': '#00C853',
        'dark': '#131A13',
        'success': '#00C853',
        // ... more colors from Figma
      },
      fontFamily: {
        // From Figma
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
};
```

---

## Step 8: Component Sync Workflow

### Manual Sync Process

1. **Review Figma Design**
   - Open component in Figma
   - Note spacing, colors, typography
   - Check responsive behavior

2. **Update React Component**
   - Match CSS/Tailwind classes to Figma specs
   - Ensure exact spacing and colors
   - Test responsive breakpoints

3. **Verify Changes**
   - Take screenshot of implementation
   - Compare with Figma design
   - Get design team approval

### Automated Sync (Future)

Future enhancement: Build automated component generator from Figma designs.

---

## Step 9: Testing Figma Integration

### Verify MCP Connection

```bash
# Install MCP server
npm install -g @modelcontextprotocol/server-figma

# Test connection
FIGMA_PERSONAL_ACCESS_TOKEN=your-token \
npx @modelcontextprotocol/server-figma
```

### Check API Access

```bash
# Test Figma API directly
curl -H "X-Figma-Token: your-token" \
  "https://api.figma.com/v1/files/YiFahCtPWUPWbB9TcvCpsj"
```

---

## Step 10: Design Sync Checklist

### Pre-Sync
- [ ] Figma access token generated and added to env
- [ ] File key identified and added to env
- [ ] MCP config file created
- [ ] Figma file organized with clear component structure

### During Sync
- [ ] Review Figma designs for each page
- [ ] Document differences from current implementation
- [ ] Update components to match Figma specs
- [ ] Test responsive behavior at all breakpoints
- [ ] Verify colors match design tokens

### Post-Sync
- [ ] Take screenshots of updated pages
- [ ] Compare with Figma designs
- [ ] Get design team sign-off
- [ ] Update component documentation
- [ ] Merge changes to main branch

---

## Troubleshooting

### "Invalid access token" error
- Verify token is correctly copied (no extra spaces)
- Check token hasn't expired
- Ensure token has file access permissions

### "File not found" error
- Verify file key is correct (from URL)
- Check Figma file sharing permissions
- Ensure token has access to the file

### MCP server not connecting
- Check Node.js version (should be 18+)
- Verify @modelcontextprotocol/server-figma is installed
- Check firewall/network settings

---

## Resources

- [Figma API Documentation](https://www.figma.com/developers/api)
- [MCP Server Figma](https://github.com/modelcontextprotocol/servers/tree/main/src/figma)
- [Figma Design Tokens](https://help.figma.com/hc/en-us/articles/360039957034-Manage-and-share-styles)

---

## Next Steps

1. **Immediate**: Add Figma tokens to environment variables
2. **This Week**: Sync Login page design
3. **This Month**: Sync all priority pages with Figma
4. **Ongoing**: Maintain design-code parity

---

**Status:** Configuration Ready, Awaiting Token Setup
**Last Updated:** November 2024
