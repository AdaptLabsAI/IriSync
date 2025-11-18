# IriSync - AI-Powered Social Media Management Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen)

IriSync is a production-ready, enterprise-grade social media management platform powered by artificial intelligence. Built with Next.js 15, React 19, and Firebase, IriSync provides comprehensive solutions for content creation, scheduling, analytics, team collaboration, and campaign management across all major social platforms.

**🌐 Live Site:** [irisync.com](https://irisync.com)

---

## 📚 Quick Links

- **New to coding?** → Start with [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) (Beginner-friendly guide)
- **Ready to deploy?** → See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) (Production deployment)
- **Firebase setup help?** → Check [FIREBASE_CONFIG.md](./FIREBASE_CONFIG.md)
- **Latest changes?** → See [CHANGELOG.md](./CHANGELOG.md) (Complete change history)

---

## 🚀 Production-Ready Features

### ✅ **Phase 1: AI Chat & Memory Integration**
- Multi-model AI orchestration (Claude 3.5, GPT-4o, Gemini 1.5)
- Persistent conversation memory with RAG
- Context-aware responses with full chat history
- "Iris" AI branding with automatic model selection

### ✅ **Phase 2: Content Scheduling System**
- Automated post scheduling with timezone support
- Multi-platform publishing (Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube)
- Cron-based automated publishing (every 5 minutes)
- Draft, scheduled, and published status tracking

### ✅ **Phase 3: Post Analytics & Performance Tracking**
- Real-time performance metrics collection
- Platform-specific analytics (reach, impressions, engagement, clicks)
- Automated hourly metrics fetching via cron jobs
- Performance comparison across platforms

### ✅ **Phase 4: AI-Powered Content Generation & Optimization**
- Platform-specific content generation (750+ lines)
- Automatic hashtag suggestions
- Content optimization for each platform
- Multi-variation content generation
- Tone and style customization

### ✅ **Phase 5: Social Listening & Engagement Management**
- Brand mention monitoring across all platforms (850+ lines)
- AI-powered sentiment analysis (550+ lines)
- Unified inbox for comments and DMs (700+ lines)
- Brand health scoring (0-100)
- Competitor tracking and analysis
- Smart reply generation

### ✅ **Phase 6: Media Library & Asset Management**
- Firebase Storage integration (exclusive storage solution)
- Platform-specific image optimization (550+ lines)
- Brand asset library (logos, fonts, colors, graphics)
- Asset categorization, tagging, and search
- Usage tracking across posts
- 9+ platform image specifications

### ✅ **Phase 7: Team Collaboration & Workflows**
- 5-tier role hierarchy (Owner, Admin, Editor, Contributor, Viewer)
- 20+ granular permissions across all features
- Multi-step approval workflows (Simple, Sequential, Parallel)
- Team member management with invitations
- Per-user pricing ($15-$40/month per additional user)
- Comprehensive activity logging

### ✅ **Phase 8: Advanced Campaign Management**
- Multi-post campaign orchestration (900+ lines)
- Campaign types: Product Launch, Promotion, Event, Seasonal, Brand Building
- Budget tracking and ROI calculation
- A/B testing support
- Campaign templates
- Goal setting and KPI tracking

### ✅ **Advanced Campaign Analytics**
- Click-through rate (CTR) tracking
- Return on ad spend (ROAS) calculation
- Video metrics (views, completion rate, watch time)
- Conversion funnel tracking
- Cost per click (CPC), CPM, CPE, CPVV
- AI-powered forecasting
- Industry benchmark comparisons

### ✅ **Platform Connection Checking**
- Conditional UI rendering based on connections
- User-friendly "Connect Platforms" messaging
- Loading states for all async operations
- Graceful error handling

---

## 🧩 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 15.5.6 (App Router), React 19.2.0 |
| **Language** | TypeScript 5.9.3 |
| **Styling** | Tailwind CSS 4.1.17 |
| **Database** | Firebase Firestore (NoSQL) |
| **Authentication** | Firebase Auth, NextAuth.js 4, OAuth 2.0 |
| **Storage** | Firebase Storage (exclusive) |
| **AI Models** | Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro |
| **Payments** | Stripe 19.3.1 (subscriptions + credit purchases) |
| **Deployment** | Vercel with Edge Functions |
| **Cron Jobs** | Vercel Cron (post publishing, metrics, social listening) |

---

## 🎯 Complete API Endpoints (60+ Routes)

### **AI & Content**
- `POST /api/ai/chat` - Multi-model AI chat with Iris
- `POST /api/ai/generate` - Content generation
- `POST /api/content/create` - Create scheduled posts
- `GET /api/content/schedule` - Get scheduled posts
- `POST /api/content/publish` - Manual publishing

### **Analytics**
- `GET /api/analytics/posts` - Post performance metrics
- `GET /api/analytics/overview` - Platform analytics overview
- `POST /api/analytics/fetch` - Fetch latest metrics

### **Social Listening**
- `GET/POST /api/monitoring/mentions` - Brand mentions
- `GET/PUT /api/monitoring/config` - Monitoring configuration
- `GET /api/monitoring/stats` - Listening statistics
- `GET/POST/PATCH /api/monitoring/engagement` - Unified inbox
- `POST/GET /api/monitoring/reply` - Smart reply system

### **Media Management**
- `POST /api/media/upload` - Upload to Firebase Storage
- `GET /api/media/assets` - Search and filter assets
- `PATCH /api/media/assets` - Update asset metadata
- `DELETE /api/media/assets` - Remove assets
- `GET /api/media/stats` - Media library statistics

### **Team & Workflows**
- `GET/POST/PATCH/DELETE /api/team/members` - Team management
- `POST/GET/PATCH/DELETE /api/team/invite` - Invitations
- `GET /api/team/activity` - Activity log
- `GET/POST/DELETE /api/workflows` - Workflow configuration
- `POST/GET /api/workflows/submit` - Content submissions
- `POST /api/workflows/approve` - Approval actions

### **Campaigns**
- `GET/POST/PATCH/DELETE /api/campaigns` - Campaign CRUD
- `GET /api/campaigns/stats` - Campaign performance
- `GET /api/campaigns/analytics` - Advanced analytics
- `POST /api/campaigns/analytics/forecast` - AI forecasting

### **Credits & Billing**
- `GET /api/credits/balance` - Credit balance
- `POST /api/credits/purchase` - Purchase credit bundles
- `POST /api/webhooks/stripe` - Stripe webhook handler

### **Platform Status**
- `GET /api/platforms/status` - Connection status check

---

## ⚡ Quick Start

**Required:**
- Node.js 20+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- Firebase account (Free tier available)

**Recommended:**
- Stripe account (for payments and credits)
- OpenAI API key (for AI features)
- Anthropic API key (for Claude)
- Google AI API key (for Gemini)

### 🏃 Run Locally

**For beginners**, follow our detailed guide → [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)

**For experienced developers:**

```bash
# 1. Clone repository
git clone https://github.com/AdaptLabsAI/IriSync.git
cd IriSync

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Firebase & API keys

# 4. Run development server
npm run dev

# 5. Open browser
# Visit http://localhost:3000
```

**Quick environment setup:**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Get Firebase config from:
# https://console.firebase.google.com → Project Settings → Web App
```

**See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed environment variable configuration.**

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AdaptLabsAI/IriSync)

**Complete deployment guide:** [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)

**Quick steps:**
1. Connect GitHub repository to Vercel
2. Add environment variables (Firebase, Stripe, OpenAI, Anthropic, Google AI)
3. Configure cron jobs in `vercel.json`
4. Deploy!

**Environment variables required:**
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXT_PUBLIC_FIREBASE_*` - From Firebase Console
- `FIREBASE_ADMIN_*` - From Firebase Service Account
- `STRIPE_*` - From Stripe Dashboard
- `OPENAI_API_KEY` - From OpenAI
- `ANTHROPIC_API_KEY` - From Anthropic
- `GOOGLE_AI_API_KEY` - From Google AI Studio
- `CREDIT_SYSTEM_ACTIVE` - Set to `true` after configuring Stripe Price IDs

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) | Complete beginner-friendly setup guide |
| [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) | Production deployment & configuration |
| [FIREBASE_CONFIG.md](./FIREBASE_CONFIG.md) | Firebase setup & troubleshooting |
| [CHANGELOG.md](./CHANGELOG.md) | Complete change history (all 8 phases) |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | General deployment information |

---

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Run production build locally
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

---

## 📁 Project Structure

```
IriSync/
├── src/
│   ├── app/                           # Next.js app router pages
│   │   ├── (auth)/                   # Authentication pages
│   │   ├── (dashboard)/              # Dashboard pages
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   │   ├── analytics/        # Analytics page
│   │   │   │   ├── campaigns/        # Campaign management
│   │   │   │   └── settings/         # User settings
│   │   │   └── ...
│   │   ├── (marketing)/              # Public marketing pages
│   │   └── api/                      # API routes (60+ endpoints)
│   │       ├── ai/                   # AI chat & generation
│   │       ├── analytics/            # Analytics APIs
│   │       ├── campaigns/            # Campaign management
│   │       ├── content/              # Content scheduling
│   │       ├── credits/              # Credit system
│   │       ├── media/                # Media library
│   │       ├── monitoring/           # Social listening
│   │       ├── platforms/            # Platform connections
│   │       ├── team/                 # Team management
│   │       └── workflows/            # Approval workflows
│   ├── components/                   # Reusable React components
│   │   ├── dashboard/                # Dashboard components
│   │   ├── ui/                       # Base UI components
│   │   └── layouts/                  # Layout components
│   └── lib/                          # Core business logic
│       ├── features/                 # Feature services (15,000+ lines)
│       │   ├── ai/                   # AI services
│       │   ├── analytics/            # Analytics services
│       │   ├── campaigns/            # Campaign services
│       │   ├── content/              # Content generation
│       │   ├── credits/              # Credit management
│       │   ├── media/                # Media library
│       │   ├── monitoring/           # Social listening
│       │   ├── scheduling/           # Post scheduling
│       │   └── team/                 # Team collaboration
│       └── utils/                    # Utility functions
├── public/                           # Static assets
├── .env.local.example                # Environment template
├── vercel.json                       # Vercel config with cron jobs
└── next.config.js                    # Next.js configuration
```

---

## 🔐 Security

**Best Practices:**
- ✅ Environment variables for all secrets (never hardcoded)
- ✅ Firebase security rules configured
- ✅ HTTPS enforced (automatic on Vercel)
- ✅ CSRF protection enabled
- ✅ XSS protection enabled
- ✅ Role-based access control (RBAC)
- ✅ Permission validation on all API endpoints
- ✅ Input sanitization and validation
- ✅ Secure webhook verification (Stripe)

**Report security issues:** security@irisync.com

---

## 💳 Credit System

**Credit Bundles (Inactive until Stripe Price IDs configured):**
- **Starter:** 100 credits - $10.00
- **Growth:** 500 credits - $40.00 (20% savings)
- **Pro:** 1,000 credits - $70.00 (30% savings)
- **Enterprise:** 5,000 credits - $300.00 (40% savings)

**Credit Usage:**
- AI Chat (Basic): 1 credit
- AI Chat (Complex): 5 credits
- Content Generation: 5 credits
- Content Optimization: 3 credits
- Hashtag Suggestions: 2 credits
- Smart Reply: 3 credits
- Sentiment Analysis: 1 credit

**Admins have unlimited credits.**

---

## 👥 Team Pricing

**Per Additional User (beyond Owner):**
- **Creator Tier:** $15/month per user
- **Influencer Tier:** $25/month per user
- **Enterprise Tier:** $40/month per user

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

- **Documentation:** See docs in this repository
- **Email:** support@irisync.com
- **Issues:** [GitHub Issues](https://github.com/AdaptLabsAI/IriSync/issues)

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Firebase for authentication, database & storage
- Vercel for hosting platform
- OpenAI, Anthropic, Google for AI capabilities
- Stripe for payment processing
- All our contributors

---

**Built with ❤️ by the IriSync team**

---

## 🚦 Status

**Production:** ✅ Live at [irisync.com](https://irisync.com)
**Version:** 1.0.0 (Production Ready)
**Build:** ✅ Passing
**All 8 Phases:** ✅ Complete
**API Endpoints:** ✅ 60+ Routes Functional
**Services:** ✅ 15,000+ Lines Production Code

---

## 📈 Completed Roadmap (All 8 Phases)

- [x] **Phase 1:** AI Chat & Memory Integration
- [x] **Phase 2:** Content Scheduling System
- [x] **Phase 3:** Post Analytics & Performance Tracking
- [x] **Phase 4:** AI-Powered Content Generation
- [x] **Phase 5:** Social Listening & Engagement Management
- [x] **Phase 6:** Media Library & Asset Management
- [x] **Phase 7:** Team Collaboration & Workflows
- [x] **Phase 8:** Advanced Campaign Management
- [x] Advanced Analytics (CTR, ROAS, Conversion Tracking)
- [x] Platform Connection Checking
- [x] Conditional UI Rendering
- [x] Credit System (ready for activation)

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Chrome extension
- [ ] Video editing suite
- [ ] Advanced AI image generation
- [ ] White-label solution
- [ ] API for third-party integrations

---

**Last Updated:** 2025-11-18
**Version:** 1.0.0 (Production Ready)
