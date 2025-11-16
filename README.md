# IriSync - AI-Powered Social Media Management Platform

IriSync is a cutting-edge marketing technology platform that leverages artificial intelligence to streamline social media management for businesses. Our platform provides automated content creation, scheduling, and analytics solutions to help businesses optimize their social media presence. The platform is production-ready with full feature integration, secure role-based access, and streamlined team workflows.

## 🚀 Features

- 🤖 AI-Powered Content Creation & Performance Analysis
- 📅 Smart Content Scheduling & Publishing Tools
- 📊 Comprehensive Analytics & Engagement Reporting
- 🔒 Enterprise-Grade Security & Role-Based Access (NextAuth)
- 🎯 Campaign Performance Tracking
- 👥 Team Collaboration with Approval Workflows
- 💰 Subscription & Billing Management (Stripe)
- 🖼️ Media Library

## 🧩 Tech Stack

- **Frontend**: Next.js (App Router), React, Material-UI, Tailwind CSS
- **Backend**: Node.js, Firebase Firestore, Google Cloud, Redis
- **Database**: Firebase/Firestore
- **Authentication**: Firebase Auth, NextAuth.js, OAuth (LinkedIn, Twitter, Facebook, Google)
- **AI Integrations**: OpenAI, Gemini Pro, Replicate
- **Payments**: Stripe
- **Storage**: Firebase Storage
- **Deployment**: Vercel / Custom Hosting

## 🛠️ Getting Started

### 📦 Prerequisites

- **Node.js v18+** - [Download](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Firebase project** with Firestore - [Setup Guide](./DEPLOYMENT.md#firebase-setup)
- **Stripe account** (for billing) - [Sign up](https://stripe.com/)
- **OpenAI API key** (for AI features) - [Get API key](https://platform.openai.com/)

### ⚙️ Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/AdaptLabsAI/IriSync.git
cd IriSync
```

#### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, React, Firebase, and other dependencies.

#### 3. Set Up Environment Variables

Create a `.env.local` file from the example template:

```bash
cp env.example .env.local
```

Open `.env.local` and fill in the required values:

**Minimum Required Variables:**
```bash
# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-character-secret-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin (from Service Account JSON)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AI Services (optional but recommended)
OPENAI_API_KEY=sk-...
AI_PROVIDER_TYPE=openai
AI_MODEL_ID=gpt-3.5-turbo
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**Get Firebase Credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → ⚙️ Settings → General
3. Scroll to "Your apps" and copy the config values
4. For Admin credentials: ⚙️ Settings → Service accounts → Generate new private key

#### 4. Initialize Firebase (First Time Only)

Set up Firestore rules and indexes:

```bash
# Login to Firebase
npx firebase login

# Initialize Firebase in project
npx firebase init

# Deploy rules and indexes
npm run firebase:deploy-all
```

#### 5. Run Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

#### 6. Verify Setup

Open your browser and navigate to:
- **Homepage**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard (requires login)
- **API Health**: http://localhost:3000/api/health (if available)

### 🔧 Common Development Tasks

#### Running Tests
```bash
npm test                # Run all tests
npm test -- --watch     # Run tests in watch mode
npm test -- --coverage  # Run tests with coverage report
```

#### Linting and Code Quality
```bash
npm run lint            # Run ESLint
npm run check-secrets   # Check for exposed secrets
npm audit               # Check for security vulnerabilities
```

#### Building for Production
```bash
npm run build          # Create production build
npm start              # Start production server
```

#### Database Operations
```bash
npm run firebase:setup              # Initialize Firestore collections
npm run firebase:deploy-indexes     # Deploy Firestore indexes
npm run firebase:deploy-rules       # Deploy security rules
npm run seed:ai-models              # Seed AI model configurations
```

#### Environment Auditing
```bash
npm run env:report     # Generate environment variable checklist
```

### 🐛 Troubleshooting

**Problem: "Module not found" errors**
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules .next
npm install
```

**Problem: Firebase connection errors**
- Verify `.env.local` has correct Firebase credentials
- Check Firebase project is active
- Ensure Firestore is enabled in Firebase Console

**Problem: Build fails with TypeScript errors**
- Run `npm run lint` to see specific errors
- Check that all dependencies are installed
- Verify Node.js version is 18 or higher

**Problem: Port 3000 already in use**
```bash
# Run on a different port
PORT=3001 npm run dev
```

For more help, see [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting)

## 🌍 Production Deployment

### Quick Start

For complete step-by-step deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Deployment Summary

1. **Set up Firebase** - Database, Authentication, Storage
2. **Deploy to Vercel** - One-click deployment from GitHub
3. **Configure Environment Variables** - Add all secrets in Vercel dashboard
4. **Set up Webhooks** - Configure Stripe and OAuth callbacks
5. **Monitor & Maintain** - Set up alerts and regular updates

### Production Checklist

**Before Deployment:**
- [ ] All tests passing: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No security vulnerabilities: `npm audit`
- [ ] No exposed secrets: `npm run check-secrets`
- [ ] Firebase project created and configured
- [ ] Stripe account set up with products/prices
- [ ] All environment variables documented

**During Deployment:**
- [ ] Environment variables added to Vercel
- [ ] Custom domain configured (optional)
- [ ] SSL certificate provisioned
- [ ] Build successful on Vercel

**After Deployment:**
- [ ] Stripe webhook configured
- [ ] OAuth redirect URLs updated
- [ ] First admin user created
- [ ] Error monitoring enabled
- [ ] Database backups configured
- [ ] Documentation updated

### Environment Variables

**Critical Security Notes:**
- ⚠️ **Never commit** `.env` or `.env.local` files to Git
- ✅ Use `.env.example` as template only
- 🔒 Server-only secrets should **never** have `NEXT_PUBLIC_` prefix
- 🔑 Rotate all secrets quarterly or after any suspected exposure
- 📝 Run `npm run check-secrets` before every commit

**For Development:**
```bash
cp env.example .env.local
# Edit .env.local with your credentials
```

**For Production (Vercel):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable individually
3. Select appropriate environments (Production/Preview/Development)
4. See [DEPLOYMENT.md](./DEPLOYMENT.md#environment-variables) for complete list

### Secret Rotation Schedule

| Secret | Rotation Frequency | How to Rotate |
|--------|-------------------|---------------|
| `NEXTAUTH_SECRET` | Quarterly | Generate new: `openssl rand -base64 32` |
| Firebase Admin Key | Yearly | Firebase Console → Service Accounts → Generate new key |
| Stripe Keys | After exposure | Stripe Dashboard → Developers → API keys → Roll key |
| OAuth Secrets | After exposure | Provider dashboard → Regenerate secret |
| AI API Keys | Quarterly | Provider dashboard → Create new key |

## ▶️ Available Scripts

### Development
- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Create optimized production build
- `npm start` - Start production server (requires build first)

### Testing & Quality
- `npm test` - Run Jest test suite
- `npm run lint` - Run ESLint and check for code issues
- `npm run check-secrets` - Scan for accidentally committed secrets
- `npm audit` - Check for security vulnerabilities in dependencies

### Database & Firebase
- `npm run firebase:setup` - Initialize Firestore collections
- `npm run firebase:deploy-indexes` - Deploy Firestore indexes
- `npm run firebase:deploy-rules` - Deploy security rules
- `npm run firebase:deploy-all` - Deploy everything to Firebase
- `npm run seed:ai-models` - Seed AI model configurations

### Deployment & Utilities
- `npm run env:report` - Generate environment variable audit report
- `npm run deploy:seed` - Seed production data
- `npm run audit` - Run security audit

## Project Structure

The project follows a standard Next.js App Router structure with additional directories for organization:

```
.
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # Reusable components
│   ├── lib/              # Utility functions and shared logic
│   └── styles/           # Global styles and theme
├── docs/                 # Project documentation
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets (images, fonts, etc.)
├── scripts/              # Utility and automation scripts
└── .github/              # GitHub Actions workflows
```

## 📘 Documentation

See the [`docs/`](./docs) folder for detailed documentation on:

* API reference (App Router)
* Launch checklist
* Migration plan
* Post-launch support
* Redis setup
* Environment setup

## ✅ Production Checklist

- [x] Fully migrated to Next.js App Router
- [x] All legacy `pages/` and `pages/api/` files removed
- [x] Live authentication, dashboard, content, and admin flows
- [x] Test suite updated and passing
- [x] Monitoring and alerting configured (e.g., Sentry)

## 🧪 QA & Test Baseline

- Post-migration test suite serves as the new baseline.
- Add unit/integration tests for new or refactored features.
- Maintain App Router conventions across all modules.

## 🚀 Deployment & Monitoring

- Add `.env` variables in your cloud environment.
- Enable Google Cloud Memorystore (Redis).
- Set up alerting and error monitoring (e.g., Sentry).
- Final steps and post-launch support in `docs/development/final-steps.md`.

## 🛡️ Security & Production Protection

### Security Best Practices

**Code Security:**
- ✅ TypeScript strict mode enabled for type safety
- ✅ ESLint configured with security rules
- ✅ Automated secret scanning before commits
- ✅ Dependencies scanned for vulnerabilities
- ✅ CORS configured for production domains only
- ✅ Rate limiting on API routes
- ✅ Input validation and sanitization

**Infrastructure Security:**
- ✅ HTTPS/SSL enabled by default (Vercel)
- ✅ Environment variables encrypted at rest
- ✅ Firebase security rules enforced
- ✅ NextAuth.js for secure authentication
- ✅ JWT tokens with secure signing
- ✅ CSRF protection enabled

**Development Workflow:**
```bash
# Before every commit
npm run check-secrets  # Ensure no secrets in code
npm run lint          # Check code quality
npm test              # Run test suite

# Weekly maintenance
npm audit             # Check vulnerabilities
npm outdated          # Check for updates
```

### Keeping Dependencies Updated

**Automated Updates:**

1. **Enable Dependabot** (Recommended):
   - Already configured in `.github/dependabot.yml`
   - Automatically creates PRs for dependency updates
   - Reviews security vulnerabilities

2. **Manual Updates:**
```bash
# Check outdated packages
npm outdated

# Update to latest compatible versions
npm update

# Check security issues
npm audit

# Auto-fix security issues
npm audit fix

# Major version updates (test thoroughly!)
npx npm-check-updates -u
npm install
npm test
```

**Update Schedule:**
- **Security updates**: Immediately upon notification
- **Minor updates**: Weekly review
- **Major updates**: Monthly with full testing
- **Framework updates** (Next.js, React): Quarterly with staging tests

### Production Monitoring

**Built-in Monitoring:**
- Vercel Analytics (included)
- Firebase Performance Monitoring
- Real-time error tracking
- API response time monitoring

**Recommended Additional Tools:**
- [Sentry](https://sentry.io) - Error tracking and performance
- [LogRocket](https://logrocket.com) - Session replay and debugging
- [Datadog](https://datadoghq.com) - Infrastructure monitoring

**Health Checks:**
```bash
# Application health
curl https://your-app.vercel.app/api/health

# Database connection
# Check Firebase Console → Firestore → Usage

# API performance
# Check Vercel Dashboard → Analytics
```

### Disaster Recovery

**Backup Strategy:**
- **Firestore**: Automatic daily backups (Firebase)
- **User uploads**: Stored in Firebase Storage with versioning
- **Configuration**: Version controlled in Git
- **Secrets**: Documented in secure password manager

**Recovery Procedures:**
1. Database restore: Firebase Console → Backups → Restore
2. Code rollback: Vercel Dashboard → Deployments → Rollback
3. Secrets reset: Follow rotation procedures in [DEPLOYMENT.md](./DEPLOYMENT.md)

### Compliance & Privacy

- **GDPR Compliant**: User data deletion flows implemented
- **Data Encryption**: At rest and in transit
- **Access Logs**: Firebase audit logs enabled
- **Cookie Consent**: Implemented in UI
- **Privacy Policy**: Update before launch

Do **not** commit `.env`, credential files, or sensitive data to version control.
Always validate OAuth, API keys, and database rules prior to deployment.

## 🎨 Figma MCP Integration

IriSync includes configuration for the **Figma Model Context Protocol (MCP)** server, enabling AI-powered code generation from Figma designs.

### What is Figma MCP?

The `mcp.config.json` file in this repository registers a Figma MCP server that allows compatible AI clients (like ChatGPT Desktop or VS Code with MCP support) to access Figma files and generate React/Next.js code based on your design layouts.

**Important Notes:**
- This configuration does **NOT** automatically sync Figma layouts into the app
- It only gives AI tools access to Figma so they can read your designs and generate code
- The MCP server is for AI tools, not for runtime browser/API use

### How to Use Figma MCP

#### Prerequisites
- A Figma personal access token or OAuth setup in your MCP-aware AI client
- ChatGPT Desktop app, Claude Desktop, or another MCP-compatible client
- Figma file key(s) for the designs you want to reference

#### Example Workflow

1. **Open your MCP-aware AI client** (e.g., ChatGPT Desktop)

2. **Point it at this repository** so it picks up `mcp.config.json`
   - The client will automatically detect and load the Figma MCP server configuration

3. **Request code generation** with a prompt like:
   ```
   "Open frame 'Dashboard Layout' from Figma file abc123xyz 
   and generate a responsive React/Next.js component for that 
   layout using Material-UI and Tailwind CSS"
   ```

4. **Review and integrate** the AI-generated code into your app
   - Copy the component into `src/components/`
   - Adjust imports and styling as needed
   - Test the component in your application

#### Authentication

The Figma MCP server requires authentication to access your Figma files:
- Authentication is handled by your AI client, not this repository
- You'll need to provide a Figma personal access token to your AI client
- Get your token from: [Figma Account Settings → Personal Access Tokens](https://www.figma.com/developers/api#access-tokens)

#### Helper Types

This repository includes TypeScript helper types in `src/utils/figma-types.ts` to make it easier to work with Figma data structures in your code:

```typescript
import { FigmaFrameSummary, FigmaComponent } from '@/utils/figma-types';

// Use these types when working with AI-generated Figma data
const frame: FigmaFrameSummary = {
  id: 'frame-id',
  name: 'Header Component',
  width: 1440,
  height: 80
};
```

### Supported AI Clients

MCP is supported by:
- [ChatGPT Desktop App](https://openai.com/chatgpt/desktop/)
- [Claude Desktop](https://claude.ai/download)
- [VS Code with MCP extension](https://marketplace.visualstudio.com/items?itemName=ModelContextProtocol.mcp)
- Other MCP-compatible tools

### Figma Resources

- [Figma Developer Documentation](https://www.figma.com/developers/docs)
- [Figma REST API](https://www.figma.com/developers/api)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## 📫 Contact

For any inquiries, please reach out to our team at contact@irisync.com.

---

**© IriSync Inc.** — All rights reserved.
