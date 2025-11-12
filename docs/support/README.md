# IriSync – AI-Powered Social Media Management Platform

**IriSync** is an AI-first platform designed for streamlined social media management. It combines powerful scheduling, cross-platform publishing, media handling, and intelligent content generation—all from a single interface. Ideal for creators, marketers, and agencies looking to automate and scale their online presence.

---

## ⚙️ Features

### ✅ Implemented
- **Authentication & User Roles**
  - Firebase Auth with login, signup, password reset, and email verification
  - Role-based access and permission handling
- **Subscription Billing**
  - Stripe integration with tiered plans and usage tracking
- **AI Toolkit**
  - Google Vertex AI for content, captions, and hashtag generation
  - Retrieval-Augmented Generation (RAG) chatbot and vector search
- **Content System**
  - Create, preview, and format posts for different platforms
  - MediaUploader, MediaGallery, and in-app editor
  - PostCard and PostList with filtering, sorting, and pagination
- **Social Integration**
  - OAuth for Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube, Pinterest, Reddit, and Mastodon
  - Unified inbox for cross-platform comments and messages
- **Testing & Deployment**
  - Jest, Cypress, and React Testing Library
  - GitHub Actions CI/CD
  - Vercel for production hosting
  - Health checks and logging

### 🔜 In Progress
- Visual content calendar
- Engagement analytics dashboard
- AI auto-optimization and scoring
- Team workflows with content approvals

---

## 🧱 Project Structure

```
iris-ai/
  • lib/ — Core backend logic and services
    • firebase/ — Firebase config and authentication helpers
    • middleware/ — Request validation, logging, and auth middleware
    • repositories/ — Firestore interaction (posts, inbox, etc.)
    • services/ — Business logic (auth, Stripe, AI)
    • types/ — TypeScript interfaces and global schemas
    • utils/ — Shared helper functions

  • components/ — Reusable UI elements
    • auth/ — Login, register, password reset UIs
    • content/ — Post creation, media uploader, preview tools
    • dashboard/ — Overview widgets and stats
    • layouts/ — Layout wrappers and templates
    • notifications/ — System messages and toasts
    • ui/ — Buttons, inputs, modals, etc.

  • hooks/ — Custom React Hooks
    • useAuth.ts — Auth state management
    • useForm.ts — Form handling and validation

  • pages/ — Next.js page routes
    • api/ — API routes for auth, monitoring, and integrations
    • auth/ — User auth pages (login, register, verify)
    • index.tsx — Main landing page

  • public/ — Static assets (images, logos)

  • cypress/ — End-to-end and component testing
    • e2e/ — Full app interaction tests
    • component/ — Component-level tests
    • support/ — Custom commands and test config

  • docs/ — Developer documentation
    • auth-components.md
    • development-guide.md
    • llm-integration-guide.md
    • content-management.md
    • testing-deployment-guide.md

  • .github/ — GitHub-specific workflows
    • workflows/ — CI/CD definitions (build, deploy)

  • __tests__/ — Unit and integration test suite
    • api/ — Unit tests for API logic
    • components/ — Unit tests for React components
    • utils/ — Utility function tests
```
---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Firebase project with Firestore
- Stripe account
- Google Cloud for media + AI
- OAuth credentials for supported social platforms

### Installation
\`\`\`bash
git clone https://github.com/your-org/iris-ai.git
cd iris-ai
npm install
\`\`\`

### Environment Variables
Create \`.env.local\` and populate with:
\`\`\`env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
FIREBASE_SERVICE_ACCOUNT_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_STORAGE_BUCKET=
GOOGLE_CLOUD_CREDENTIALS=

# AI
OPENAI_API_KEY=
REPLICATE_API_TOKEN=
GOOGLE_MODEL_NAME=gemini-pro

# OAuth Clients
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
TWITTER_API_KEY=
LINKEDIN_CLIENT_ID=

# App Settings
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### Running the App
\`\`\`bash
npm run dev          # Start development server
npm run test         # Run unit tests
npm run test:coverage
npm run build        # Build for production
\`\`\`

---

## 🔁 Development Workflow
\`\`\`bash
git checkout development
git pull
git checkout -b feature/your-feature
git add .
git commit -m "feat: your change"
git push -u origin feature/your-feature
\`\`\`

---

## 🧠 Admin Scripts

### Make a Super Admin
\`\`\`bash
node scripts/make-super-admin.js
\`\`\`

### Migrate Admins to Unified \`users\` Collection
\`\`\`bash
node scripts/migrate-admin-users.js
\`\`\`

### Remove Mock Data
\`\`\`bash
node scripts/remove-mock-data.js
\`\`\`

---

## ✅ Production Checklist
\`\`\`bash
firebase deploy --only firestore:rules
firebase firestore:indexes
\`\`\`

---

## ✨ Platform Phases

| Phase | Status  | Description                               |
|-------|---------|-------------------------------------------|
| 1     | Done    | Auth system, layout, and project setup    |
| 2     | Done    | Content creation, post editor, media      |
| 3     | Done    | AI features, Stripe billing               |
| 4     | Active  | Full testing, deployment, and monitoring  |

---

## 🧩 Benefits for Users

- **Unified Publishing**: Manage all social platforms from one place
- **AI Content Creation**: Generate ideas, captions, replies, and images
- **Collaborative Workflow**: Assign roles, approve content, comment inline
- **Inbox Management**: Respond to comments and DMs across platforms

---

## 🌐 Environments

- **Development**: https://dev.example.com  
- **Production**: https://www.IriSync.com/

---

## 📬 Support

- Kaynen Pellegrino (Technical Founder): [Kaynen@IriSync.com](mailto:Kaynen@IriSync.com)
- Frank Bosio (Financial & Strategic Founder): [Frank@IriSync.com](mailto:Frank@IriSync.com)

---

## 🧠 Contribution Guidelines

- Submit PRs to \`development\`
- Merge into \`main\` after review, testing, and CI checks
- Keep commits clean and scoped to single responsibilities
