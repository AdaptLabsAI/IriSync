# IriSync - AI-Powered Social Media Management Platform

IriSync is a cutting-edge marketing technology platform that leverages artificial intelligence to streamline social media management for businesses. Our platform provides automated content creation, scheduling, and analytics solutions to help businesses optimize their social media presence.

## Features

- 🤖 AI-Powered Content Creation
- 📅 Smart Content Scheduling
- 📊 Comprehensive Analytics
- 🔒 Enterprise-Grade Security
- 🎯 Campaign Performance Tracking

## Tech Stack

- **Frontend**: Next.js, React, Material-UI
- **Backend**: Node.js
- **Database**: Firebase/Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Deployment**: Vercel

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.fixed.txt .env.local
```

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run linter

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # Reusable components
├── lib/             # Utility functions and shared logic
└── styles/          # Global styles and theme
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Contact

For any inquiries, please reach out to our team at contact@irisync.com.

--------------------------------------------------------------------------------------------

# IriSync - Original ReadMe - AI-Powered Social Media Management Platform

````markdown
# IriSync Platform

**IriSync** is a powerful, AI-driven social media management platform, now fully migrated to the **Next.js App Router** architecture. The platform is production-ready with full feature integration, secure role-based access, and streamlined team workflows.

---

## 🚀 Features

- Unified social media dashboard  
- AI-powered content generation and performance analysis  
- Team collaboration with approval workflows  
- Advanced analytics and engagement reporting  
- Subscription and billing management (Stripe)  
- Secure authentication with role-based access (NextAuth)  
- Media library, smart scheduling, and publishing tools  

---

## 🧩 Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS  
- **Backend:** Firebase Firestore, Google Cloud, Redis  
- **AI Integrations:** OpenAI, Gemini Pro, Replicate  
- **Payments:** Stripe  
- **Authentication:** OAuth (LinkedIn, Twitter, Facebook, Google), NextAuth.js  
- **Deployment:** Vercel / Custom Hosting  

---

## 🛠️ Getting Started

### 📦 Prerequisites

- Node.js v18+  
- Firebase project with Firestore  
- Stripe account (billing)  
- Google Cloud credentials  
- Redis / Memorystore setup  
- OAuth credentials for each supported social platform  

### ⚙️ Installation

```bash
npm install
````

### 🌐 Environment Variables

Create a `.env.local` file and populate it using the following keys:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
FIREBASE_SERVICE_ACCOUNT_KEY=

# Stripe
STRIPE_SECRET_KEY=sk_test_51Rabp2FM9knCBEZkY8Tyxdb9BIo669p45e6SlSbxuCeRFeCfnUUmgUAaJox6d5gPD241hFagyhVAdUzUaYImv6pq00YL4MdiHA
STRIPE_PUBLISHABLE_KEY=pk_test_51Rabp2FM9knCBEZkTL3aDrzG3YrrJ604uwunWgYbKgRSBHwjly1Rdalsq5mIeAUmn2np7OeSIeZp5nQqkUZrHNCC00AtKUzfBF
STRIPE_WEBHOOK_SECRET=

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_STORAGE_BUCKET=
GOOGLE_CLOUD_CREDENTIALS=

# Redis
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

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
```

---

## ▶️ Running the App

```bash
npm run dev              # Start development server
npm run test             # Run unit tests
npm run test:coverage    # View test coverage
npm run build            # Build for production
```

---

## 📘 Documentation

See the [`docs/`](./docs) folder for:

* API reference (App Router)
* Launch checklist
* Migration plan
* Post-launch support
* Redis setup
* Environment setup

---

## ✅ Production Checklist

* [x] Fully migrated to Next.js App Router
* [x] All legacy `pages/` and `pages/api/` files removed
* [x] Live authentication, dashboard, content, and admin flows
* [x] Test suite updated and passing
* [x] Monitoring and alerting configured (e.g., Sentry)

---

## 🧪 QA & Test Baseline

* Post-migration test suite serves as the new baseline
* Add unit/integration tests for new or refactored features
* Maintain App Router conventions across all modules

---

## 🔄 Migration Status

* ✅ Legacy routes removed
* ✅ All user/admin flows migrated to App Router
* ✅ Demo content replaced with production logic
* ✅ Functional error/loading/auth states implemented
* ✅ App is fully production-ready

---

## 🚀 Deployment & Monitoring

* Add `.env` variables in your cloud environment
* Enable Google Cloud Memorystore (Redis)
* Set up alerting and error monitoring (e.g., Sentry)
* Final steps and post-launch support in `docs/development/final-steps.md`

---

## 🛡️ Security Notes

Do **not** commit `.env` or credential files.
Always validate OAuth, API keys, and database rules prior to deployment.

---

## 📫 Contact

For questions or support, please contact the IriSync team.

---

**© IriSync Inc.** — All rights reserved.
