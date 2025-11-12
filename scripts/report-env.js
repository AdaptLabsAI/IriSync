#!/usr/bin/env node
/*
 * Generates a markdown report highlighting environment variables referenced
 * in the codebase and flags the ones that are not currently defined in the
 * project environment templates. The report is written to
 * docs/deployment/vercel-environment-checklist.md.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'deployment', 'vercel-environment-checklist.md');
const SCAN_DIRECTORIES = ['src', 'scripts', 'functions', 'prisma', 'workflows'];
const ENV_FILES = ['.env', '.env.local', 'env.example', 'env.fixed.txt'];
const VARIABLE_REGEX = /process\.env\.([A-Z0-9_]+)/g;

const CATEGORY_GUIDANCE = new Map([
  ['NEXTAUTH', 'Set `NEXTAUTH_URL` to your production domain on Vercel and generate a strong `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`).'],
  ['NEXT_PUBLIC_FIREBASE', 'From the Firebase console create a web app and copy the client configuration values (API key, project ID, etc.).'],
  ['FIREBASE_ADMIN', 'Generate a Firebase service account (JSON) for server-side access and load the credentials into the matching environment variables. Remember to escape new lines in the private key.'],
  ['FIREBASE', 'Provide the remaining Firebase configuration fields (database URL, storage bucket, etc.) from the Firebase project settings.'],
  ['STRIPE', 'Create the required Stripe products/prices and copy the API keys, publishable key, webhook secret, and price IDs for each plan.'],
  ['OPENAI', 'Add an OpenAI API key (or Azure OpenAI if preferred) with access to the referenced models.'],
  ['AZURE_OPENAI', 'Provision an Azure OpenAI resource and supply the endpoint, deployment name/model, and API key.'],
  ['ANTHROPIC', 'Add the Anthropic API key and default model configuration.'],
  ['CLAUDE', 'The Claude provider also requires an Anthropic key. Reuse the same key unless a separate workspace is needed.'],
  ['GOOGLE', 'Configure Google Cloud OAuth or Generative AI credentials as referenced. Supply client IDs, secrets, API keys, and redirect URIs.'],
  ['MICROSOFT', 'Register an Azure AD application for Microsoft integrations (Graph/Outlook) and configure the client ID, secret, tenant ID, and redirect URIs.'],
  ['LINKEDIN', 'Register a LinkedIn developer application and configure OAuth client ID, secret, and redirect URI.'],
  ['FACEBOOK', 'Create a Meta developer app and configure the app ID, secret, redirect URI, and webhook verification token.'],
  ['TWITTER', 'Create a Twitter/X developer app and configure API key, secret, and callback URL.'],
  ['DROPBOX', 'Register a Dropbox application and set the client ID/secret and redirect URI.'],
  ['SENDGRID', 'Create a SendGrid API key and set `EMAIL_FROM` to a verified sender address.'],
  ['EMAIL', 'Review email rate limits and contact addresses. Adjust values to match your support/sales workflow.'],
  ['PINECONE', 'Provide Pinecone API credentials and environment to enable vector indexing.'],
  ['REDIS', 'Supply the Redis connection URL or credentials for caching.'],
  ['SUPABASE', 'Add Supabase project URL and anon/service keys if Supabase features are enabled.'],
  ['NOTION', 'Create a Notion integration and provide API key/database IDs for content sync.'],
  ['SLACK', 'Create a Slack app/bot and populate the OAuth token, signing secret, and app-level token.'],
  ['AIRTABLE', 'Generate Airtable API credentials and redirect URI for OAuth.'],
  ['ASANA', 'Configure an Asana developer app and supply the OAuth client ID, secret, and redirect URI.'],
  ['CLICKUP', 'Create a ClickUp app and provide OAuth client ID, client secret, and redirect URI.'],
  ['HUBSPOT', 'Configure HubSpot OAuth credentials and redirect URI if CRM sync is enabled.'],
  ['ZOHO', 'Add Zoho credentials (client ID/secret) for CRM synchronization.'],
]);

const ensureDirectory = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const gatherEnvVariables = () => {
  const results = new Map();
  for (const dir of SCAN_DIRECTORIES) {
    const target = path.join(ROOT, dir);
    if (!fs.existsSync(target)) continue;
    walk(target, (filePath) => {
      const ext = path.extname(filePath);
      if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return;
      const content = fs.readFileSync(filePath, 'utf8');
      let match;
      while ((match = VARIABLE_REGEX.exec(content)) !== null) {
        const variable = match[1];
        if (!results.has(variable)) {
          results.set(variable, new Set());
        }
        results.get(variable).add(path.relative(ROOT, filePath));
      }
    });
  }
  return results;
};

const walk = (dir, visitor) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (['node_modules', '.next', 'generated', 'coverage'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, visitor);
    } else {
      visitor(fullPath);
    }
  }
};

const loadDefinedVariables = () => {
  const defined = new Set();
  for (const fileName of ENV_FILES) {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key] = trimmed.split('=', 1);
      if (key) {
        defined.add(key.trim());
      }
    }
  }
  return defined;
};

const resolveCategoryKey = (variable) => {
  if (variable.startsWith('NEXT_PUBLIC_FIREBASE_')) return 'NEXT_PUBLIC_FIREBASE';
  if (variable.startsWith('FIREBASE_ADMIN_')) return 'FIREBASE_ADMIN';
  if (variable.startsWith('FIREBASE_')) return 'FIREBASE';
  if (variable.startsWith('NEXTAUTH_')) return 'NEXTAUTH';
  if (variable.startsWith('OPENAI_')) return 'OPENAI';
  if (variable.startsWith('AZURE_OPENAI_')) return 'AZURE_OPENAI';
  if (variable.startsWith('ANTHROPIC_')) return 'ANTHROPIC';
  if (variable.startsWith('CLAUDE_')) return 'CLAUDE';
  if (variable.startsWith('GOOGLE_')) return 'GOOGLE';
  if (variable.startsWith('MICROSOFT_') || variable.startsWith('MS_')) return 'MICROSOFT';
  if (variable.startsWith('LINKEDIN_')) return 'LINKEDIN';
  if (variable.startsWith('FACEBOOK_')) return 'FACEBOOK';
  if (variable.startsWith('TWITTER_')) return 'TWITTER';
  if (variable.startsWith('DROPBOX_')) return 'DROPBOX';
  if (variable.startsWith('SENDGRID_')) return 'SENDGRID';
  if (variable.startsWith('EMAIL_')) return 'EMAIL';
  if (variable.startsWith('PINECONE_')) return 'PINECONE';
  if (variable.startsWith('REDIS')) return 'REDIS';
  if (variable.startsWith('SUPABASE_')) return 'SUPABASE';
  if (variable.startsWith('NOTION_')) return 'NOTION';
  if (variable.startsWith('SLACK_')) return 'SLACK';
  if (variable.startsWith('AIRTABLE_')) return 'AIRTABLE';
  if (variable.startsWith('ASANA_')) return 'ASANA';
  if (variable.startsWith('CLICKUP_')) return 'CLICKUP';
  if (variable.startsWith('HUBSPOT_')) return 'HUBSPOT';
  if (variable.startsWith('ZOHO_')) return 'ZOHO';
  if (variable.startsWith('VERCEL_')) return 'VERCEL';
  return variable.split('_')[0];
};

const main = () => {
  const envUsage = gatherEnvVariables();
  const defined = loadDefinedVariables();
  const missing = [];
  const present = [];

  for (const [variable, locations] of envUsage.entries()) {
    const info = {
      variable,
      locations: Array.from(locations).sort(),
    };
    if (defined.has(variable)) {
      present.push(info);
    } else {
      missing.push(info);
    }
  }

  missing.sort((a, b) => a.variable.localeCompare(b.variable));
  present.sort((a, b) => a.variable.localeCompare(b.variable));

  const categories = new Map();
  for (const entry of missing) {
    const categoryKey = resolveCategoryKey(entry.variable);
    if (!categories.has(categoryKey)) {
      categories.set(categoryKey, []);
    }
    categories.get(categoryKey).push(entry);
  }

  const now = new Date().toISOString();
  const lines = [];
  lines.push('# Vercel Environment Checklist');
  lines.push('');
  lines.push(`_Last generated: ${now}_`);
  lines.push('');
  lines.push('This report lists every environment variable referenced in the runtime code. Values already provided in `.env.local`, `env.example`, or `env.fixed.txt` are considered documented. Everything else must be provisioned in Vercel before a production deployment.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total variables referenced in code: **${envUsage.size}**`);
  lines.push(`- Documented in env templates: **${present.length}**`);
  lines.push(`- Missing values that must be created in Vercel: **${missing.length}**`);
  lines.push('');
  lines.push('Run this script again whenever new integrations are added to keep the checklist up to date.');
  lines.push('');
  lines.push('## Missing variables by integration');
  lines.push('');

  const sortedCategories = Array.from(categories.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [category, entries] of sortedCategories) {
    lines.push(`### ${category}`);
    lines.push('');
    const guidance = CATEGORY_GUIDANCE.get(category) || 'Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.';
    lines.push(`> ${guidance}`);
    lines.push('');
    lines.push('| Variable | Referenced in |');
    lines.push('| --- | --- |');
    for (const entry of entries) {
      const locationList = entry.locations.map((loc) => `\`${loc}\``).join('<br />');
      lines.push(`| \`${entry.variable}\` | ${locationList} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('### Variables already documented');
  lines.push('');
  lines.push('The following environment variables are already covered by the existing templates and should still be added to Vercel before production deployment:');
  lines.push('');
  lines.push('| Variable | Referenced in |');
  lines.push('| --- | --- |');
  for (const entry of present) {
    const locationList = entry.locations.map((loc) => `\`${loc}\``).join('<br />');
    lines.push(`| \`${entry.variable}\` | ${locationList} |`);
  }
  lines.push('');

  ensureDirectory(OUTPUT_PATH);
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'));

  console.log(`Environment checklist written to ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`Missing variables: ${missing.length}`);
};

main();
