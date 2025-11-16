# IriSync - AI-Powered Social Media Management Platform

![Version](https://img.shields.io/badge/version-0.3.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

IriSync is a cutting-edge marketing technology platform that leverages artificial intelligence to streamline social media management for businesses. Our platform provides automated content creation, scheduling, and analytics solutions to help businesses optimize their social media presence.

**🌐 Live Site:** [irisync.com](https://irisync.com)

---

## 📚 Quick Links

- **New to coding?** → Start with [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) (Beginner-friendly guide)
- **Ready to deploy?** → See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) (Production deployment)
- **Firebase setup help?** → Check [FIREBASE_CONFIG.md](./FIREBASE_CONFIG.md)
- **Latest changes?** → See [FIGMA_REDESIGN_SUMMARY.md](./FIGMA_REDESIGN_SUMMARY.md)

---

## 🚀 Key Features

- 🤖 **AI-Powered Content Creation** - Generate engaging posts with GPT-4
- 📅 **Smart Scheduling** - Auto-post at optimal times
- 📊 **Advanced Analytics** - Track engagement and performance
- 🔒 **Enterprise Security** - Role-based access control
- 👥 **Team Collaboration** - Multi-user workflows with approvals
- 💰 **Subscription Management** - Stripe-powered billing
- 🎨 **Beautiful UI** - Modern design matching Figma specifications
- 📱 **Mobile Responsive** - Works on all devices

---

## 🧩 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 15.5.6 (App Router), React 19 |
| **Styling** | Tailwind CSS 4.1.17, Material-UI 7.1.0 |
| **Database** | Firebase Firestore, Redis (Upstash) |
| **Authentication** | Firebase Auth, NextAuth.js, OAuth 2.0 |
| **AI** | OpenAI GPT-4, Google Gemini, Replicate |
| **Payments** | Stripe |
| **Storage** | Firebase Storage, Google Cloud Storage |
| **Deployment** | Vercel |

---

## ⚡ Quick Start

**Required:**
- Node.js 20+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- Firebase account (Free tier available)

**Recommended:**
- Stripe account (for payments)
- OpenAI API key (for AI features)

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
2. Add environment variables (Firebase, Stripe, OpenAI)
3. Deploy!

**Environment variables required:**
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXT_PUBLIC_FIREBASE_*` - From Firebase Console
- `FIREBASE_ADMIN_*` - From Firebase Service Account
- `STRIPE_*` - From Stripe Dashboard (optional)
- `OPENAI_API_KEY` - From OpenAI (optional)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) | Complete beginner-friendly setup guide |
| [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) | Production deployment & configuration |
| [FIREBASE_CONFIG.md](./FIREBASE_CONFIG.md) | Firebase setup & troubleshooting |
| [FIGMA_REDESIGN_SUMMARY.md](./FIGMA_REDESIGN_SUMMARY.md) | Latest UI/UX changes |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | General deployment information |

---

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Run production build locally
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
npm test             # Run tests (if configured)
```

---

## 📁 Project Structure

```
IriSync/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (auth)/            # Authentication pages (login, register)
│   │   ├── (dashboard)/       # User dashboard
│   │   ├── (marketing)/       # Public pages (home, pricing)
│   │   └── api/               # API routes
│   ├── components/            # Reusable React components
│   │   ├── ui/                # Base UI components
│   │   ├── layouts/           # Layout components
│   │   └── auth/              # Auth-specific components
│   ├── lib/                   # Utility functions & helpers
│   │   ├── auth/              # Authentication logic
│   │   ├── core/firebase/     # Firebase initialization
│   │   └── features/          # Feature-specific code
│   └── styles/                # Global styles
├── public/                    # Static assets
├── .env.local.example         # Environment template
└── next.config.js             # Next.js configuration
```

---

## 🔐 Security

**Best Practices:**
- ✅ Environment variables for all secrets (never hardcoded)
- ✅ Firebase security rules configured
- ✅ HTTPS enforced (automatic on Vercel)
- ✅ CSRF protection enabled
- ✅ XSS protection enabled
- ✅ Rate limiting configured (Redis)

**Report security issues:** security@irisync.com

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
- Firebase for authentication & database
- Vercel for hosting platform
- OpenAI for AI capabilities
- All our contributors

---

**Built with ❤️ by the IriSync team**

---

## 🚦 Status

**Production:** ✅ Live at [irisync.com](https://irisync.com)
**Build:** ✅ Passing
**Tests:** ⚠️ In Progress
**Coverage:** ⚠️ In Progress

---

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Chrome extension
- [ ] Advanced AI image generation
- [ ] Video content support
- [ ] TikTok integration
- [ ] Advanced analytics dashboard
- [ ] White-label solution

---

**Last Updated:** 2025-11-16
**Version:** 0.3.0
