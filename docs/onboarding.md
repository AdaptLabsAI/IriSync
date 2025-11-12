# Irisync Onboarding Guide

Welcome to the Irisync team! This guide will help you get set up and productive as quickly as possible.

## 1. Prerequisites
- Node.js 18+
- Firebase project with Firestore
- Stripe account
- Google Cloud for media + AI
- OAuth credentials for supported social platforms

## 2. Setup
- Clone the repository
- Run `npm install` to install dependencies
- Copy `environment.md` and create your own `.env.local` file with the required variables
- See `README.md` for a sample `.env.local` template

## 3. Running the App
- `npm run dev` – Start the development server
- `npm run test` – Run the test suite
- `npm run build` – Build for production

## 4. Key Architecture Notes
- The app uses Next.js App Router (no legacy Pages Router code remains)
- All APIs are under `src/app/api/`
- All user/admin/dashboard/content/auth flows are App Router-compliant
- Authentication and role-based access are enforced via middleware and guards
- Error/loading/empty states are standardized across the app

## 5. Useful Docs
- `environment.md` – All required environment variables
- `README.md` – Project overview and setup
- `docs/` – API docs, migration plan, launch checklist

## 6. Support
- For help, ask in the team Slack or open a GitHub issue. 