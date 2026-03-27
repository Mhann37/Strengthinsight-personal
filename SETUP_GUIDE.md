# Complete Setup Guide - StrengthInsight Personal + WHOOP

A step-by-step guide to set up and run StrengthInsight Personal Edition locally and deploy to production.

**Estimated Time**: 30-45 minutes

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org))
- npm 9+ (comes with Node.js)
- GitHub account (for repo access)
- Vercel account (for free deployment)
- Firebase account (free tier available)

## Part 1: Local Development Setup

### Step 1: Clone the Repository

```bash
# Clone the repo
git clone https://github.com/Mhann37/Strengthinsight-personal.git
cd Strengthinsight-personal

# Verify git is set up
git remote -v
# Should show: origin https://github.com/Mhann37/Strengthinsight-personal.git
```

### Step 2: Install Dependencies

```bash
npm install

# Verify installation
npm --version  # Should be 9+
node --version # Should be 18+
```

### Step 3: Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

Add Firebase configuration (we'll fill this in after creating Firebase project):

```env
# Firebase Config (get from Firebase Console)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: WHOOP API (currently uses mock data)
VITE_WHOOP_API_KEY=your_whoop_api_key
VITE_WHOOP_USER_ID=your_whoop_user_id
```

### Step 4: Set Up Firebase Project

#### 4.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Name it: `strengthinsight-personal`
4. Disable Google Analytics (optional)
5. Click "Create Project"
6. Wait for project to initialize

#### 4.2: Enable Authentication

1. Left menu → "Authentication"
2. Click "Get Started"
3. Select "Email/Password" provider
4. Toggle it **On**
5. Click "Save"

#### 4.3: Create Firestore Database

1. Left menu → "Firestore Database"
2. Click "Create Database"
3. Select region: **us-west1** (or closest to you)
4. Choose: **Start in test mode**
5. Click "Enable"

#### 4.4: Set Firestore Security Rules

1. Firestore → "Rules" tab
2. Replace all text with:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own workouts
    match /workouts/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // Allow users to read/write their own bodyweight data
    match /bodyweight/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click "Publish"

#### 4.5: Get Firebase Credentials

1. Firebase Console → Project Settings (⚙️ icon)
2. Scroll to "Your apps" section
3. Click **"</>Web"** icon
4. Register new app: `StrengthInsight Personal`
5. Click "Register app"
6. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "strengthinsight-xxx.firebaseapp.com",
  projectId: "strengthinsight-xxx",
  storageBucket: "strengthinsight-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

7. Update your `.env.local` with these values

### Step 5: Run Development Server

```bash
# Start the dev server
npm run dev

# Output should show:
# > VITE v6.x.x building for development
# > ready in XXX ms
# > ➜  Local:   http://localhost:5173
```

Open http://localhost:5173 in your browser.

### Step 6: Test the App

1. **Sign Up**: Create a test account with email/password
2. **Explore**: Click around to familiarize yourself
3. **Upload**: Try uploading a workout (or use mock data)
4. **Check Console**: Open DevTools (F12) to verify no errors

## Part 2: Understanding the App

### Dashboard Layout

```
┌──────────────────────────────────┐
│  WHOOP Metrics (Live Health)     │
│  - Recovery Score (0-100)        │
│  - Sleep Quality (hours)         │
│  - Strain Score (0-21)           │
├──────────────────────────────────┤
│  StrengthInsight (Training)      │
│  - Personal Records              │
│  - Training History              │
│  - Volume Trends                 │
├──────────────────────────────────┤
│  Combined Insights               │
│  - Monthly Summary               │
│  - Balance Analysis              │
│  - Progress Cards                │
└──────────────────────────────────┘
```

### Key Features

| Feature | Description | Location |
|---------|-------------|----------|
| Dashboard | Home view with metrics | Navigation → Dashboard |
| Upload | Add workouts | Navigation → Upload |
| Analytics | Training trends | Navigation → Analytics |
| Calendar | View workouts by date | Navigation → Calendar |
| History | Detailed workout logs | Navigation → History |
| Settings | User preferences | Navigation → Settings |

### Mock WHOOP Data

Currently, the app displays **realistic mock WHOOP data** for testing:

```typescript
// src/services/whoopService.ts

Recovery: 65-95 (varies)
RHR: 50-65 bpm
HRV: 30-70 ms
SpO2: 95-99%

Sleep: 350-470 minutes
Efficiency: 75-95%

Strain: 0-15 score
Sport: Various
```

## Part 3: Deployment to Vercel

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Choose "GitHub" for fastest setup
4. Authorize Vercel to access your GitHub repos

### Step 2: Deploy Repository

#### Option A: Dashboard (Easiest)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Select "Import Git Repository"
4. Search for `Strengthinsight-personal`
5. Click "Import"

#### Option B: One-Click Deploy

Click this button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMhann37%2FStrengthinsight-personal)

### Step 3: Configure Environment Variables

In Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add each Firebase credential:
   ```
   VITE_FIREBASE_API_KEY = your_value
   VITE_FIREBASE_AUTH_DOMAIN = your_value
   VITE_FIREBASE_PROJECT_ID = your_value
   VITE_FIREBASE_STORAGE_BUCKET = your_value
   VITE_FIREBASE_MESSAGING_SENDER_ID = your_value
   VITE_FIREBASE_APP_ID = your_value
   ```
3. Click "Save"

### Step 4: Deploy

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for build (2-3 minutes)
4. Get deployment URL

### Step 5: Test Live App

1. Click deployment URL
2. Sign in with your Firebase account
3. Verify all features work
4. Check console for errors

## Part 4: Updates & Maintenance

### Deploy Changes

After making code changes:

```bash
# Local changes
git add .
git commit -m "Update: description of changes"
git push origin main

# Vercel auto-deploys from main branch
# (Watch progress in Vercel dashboard)
```

### Monitor Logs

```bash
# View recent logs
npm install -g vercel
vercel logs strengthinsight-personal

# Tail logs in real-time
vercel logs strengthinsight-personal --follow
```

### Database Management

#### View Firestore Data
1. Firebase Console → Firestore Database
2. Browse collections: `workouts`, `bodyweight`
3. Click documents to view/edit

#### Export Data
1. Firestore → Manage → Export/Import
2. Select collections
3. Choose Cloud Storage bucket
4. Start export

## Part 5: Troubleshooting

### Issue: "Cannot find module"

**Solution:**
```bash
rm -rf node_modules
npm install
npm run dev
```

### Issue: Firebase Auth Error

**Check:**
- [ ] Firebase credentials in `.env.local`
- [ ] Email/Password auth enabled in Firebase
- [ ] Firestore rules are published
- [ ] Browser console for specific errors

### Issue: Build Fails on Deploy

**Check:**
- [ ] Environment variables in Vercel dashboard
- [ ] Correct Firebase credentials
- [ ] No TypeScript errors: `npm run build`
- [ ] Check Vercel build logs

### Issue: WHOOP Data Not Showing

**Expected**: App shows realistic mock data
- If not showing, check browser console
- Verify `whoopService.ts` is imported

**To use real WHOOP data:**
- Set `VITE_WHOOP_API_KEY` in `.env.local`
- Update `whoopService.ts` with API integration

### Issue: Page Appears Blank

**Check:**
1. Open DevTools (F12 → Console)
2. Look for error messages
3. Check Network tab for failed requests
4. Verify Firebase is initialized

## Part 6: Next Steps

### Improve the App

- [ ] Add real WHOOP API integration
- [ ] Create training + recovery correlation
- [ ] Build mobile app with React Native
- [ ] Add AI workout recommendations
- [ ] Implement notification system

### Scale the App

- [ ] Add more wearables (Oura, Fitbit)
- [ ] Build API for third-party apps
- [ ] Create browser extension
- [ ] Publish to app stores

## Resources

| Resource | Link | Purpose |
|----------|------|---------|
| React Docs | https://react.dev | Framework docs |
| Vite | https://vite.dev | Build tool |
| Firebase | https://firebase.google.com | Backend |
| Vercel | https://vercel.com | Hosting |
| Tailwind | https://tailwindcss.com | Styling |
| WHOOP | https://developer.whoop.com | Health API |

## Support

- **GitHub Issues**: [Report bugs](https://github.com/Mhann37/Strengthinsight-personal/issues)
- **StrengthInsight**: [Original repo](https://github.com/Mhann37/Strengthinsight)
- **Firebase Help**: [Console](https://console.firebase.google.com)
- **Vercel Help**: [Dashboard](https://vercel.com/dashboard)

---

**🎉 You're ready to go!**

Start with development server, test locally, then deploy to Vercel for free hosting.

**Questions?** Check the [README](README.md) or [DEPLOYMENT.md](DEPLOYMENT.md) guides.
