# HedgeHog

A simple prediction market app for friends. Bet virtual coins on outcomes!

## Features

- Create prediction markets with custom outcomes
- Place bets using virtual coins (1000 starting coins)
- Real-time updates via Firebase
- Market resolution with automatic payout distribution
- Mobile-friendly UI

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS + Shadcn UI
- Firebase (Auth + Firestore)

## Setup

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Create a Firebase project at https://console.firebase.google.com

3. Enable Authentication (Google provider) and Firestore

4. Copy `.env.example` to `.env` and add your Firebase config:
   ```bash
   cp .env.example .env
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

Deploy to GitHub Pages:
```bash
npm run build
```

Or use Vercel/Netlify for automatic deployments.

## Firebase Security Rules

Add these rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /markets/{marketId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /bets/{betId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```
