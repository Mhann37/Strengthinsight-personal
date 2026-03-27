# Deployment Guide

## One-Click Vercel Deployment

### Option 1: Deploy with Vercel Button

Click the button below to deploy directly to Vercel (requires Vercel account):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMhann37%2FStrengthinsight-personal&project-name=strengthinsight-personal&repository-name=strengthinsight-personal&env=VITE_FIREBASE_API_KEY,VITE_FIREBASE_AUTH_DOMAIN,VITE_FIREBASE_PROJECT_ID,VITE_FIREBASE_STORAGE_BUCKET,VITE_FIREBASE_MESSAGING_SENDER_ID,VITE_FIREBASE_APP_ID&envDescription=Firebase%20credentials%20for%20StrengthInsight%20backend)

### Option 2: Deploy via GitHub

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Select "Import Git Repository"
   - Search for and select `Strengthinsight-personal`

3. **Configure Environment Variables**
   - In Vercel project settings, add environment variables:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2 minutes)
   - View your live app at `https://strengthinsight-personal.vercel.app`

### Option 3: Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## Configuration

### Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add Project"
   - Name it "StrengthInsight Personal"
   - Enable Google Analytics (optional)
   - Create

2. **Enable Authentication**
   - Go to "Authentication" → "Sign-in method"
   - Enable "Email/Password"
   - Click "Save"

3. **Create Firestore Database**
   - Go to "Firestore Database"
   - Click "Create database"
   - Select "Start in test mode"
   - Choose region (e.g., `us-west1`)
   - Click "Enable"

4. **Get Credentials**
   - Go to Project Settings (gear icon)
   - Under "Your apps" section, click "</>"
   - Register app named "StrengthInsight Personal"
   - Copy config object:
     ```javascript
     const firebaseConfig = {
       apiKey: "...",
       authDomain: "...",
       projectId: "...",
       storageBucket: "...",
       messagingSenderId: "...",
       appId: "..."
     };
     ```

5. **Set Firestore Rules**
   - Go to "Firestore Database" → "Rules"
   - Replace with:
     ```rules
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /workouts/{document=**} {
           allow read, write: if request.auth.uid == resource.data.userId;
         }
         match /bodyweight/{document=**} {
           allow read, write: if request.auth.uid == resource.data.userId;
         }
       }
     }
     ```
   - Click "Publish"

### Environment Variables in Vercel

After deployment, configure environment variables:

1. **Go to Project Settings** in Vercel dashboard
2. **Environment Variables** section
3. **Add** each Firebase credential:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. **Redeploy** from Deployments tab

## Deployment Status

### Current Setup
- ✅ Code pushed to GitHub
- ✅ Vercel configuration ready
- ✅ Build verified and working
- ⏳ Ready for deployment with Firebase credentials

### Next Steps
1. Set up Firebase project (see Firebase Setup above)
2. Get Firebase credentials
3. Add credentials to Vercel environment
4. Trigger redeploy

## Custom Domain

After initial deployment:

1. **Buy Domain** (optional)
   - Use Vercel's domain store or external provider

2. **Add to Vercel**
   - Go to Project Settings → Domains
   - Click "Add Domain"
   - Enter domain name
   - Follow DNS setup instructions

3. **SSL Certificate**
   - Automatic for all Vercel deployments

## Monitoring & Logs

### View Logs
```bash
# View build logs
vercel logs

# Tail deployment logs
vercel logs --follow
```

### View in Vercel Dashboard
- Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- Click project name
- View "Deployments" tab for history
- Click deployment to see logs

## Rollback

To revert to a previous deployment:

1. Go to "Deployments" tab in Vercel
2. Find desired deployment
3. Click "..."
4. Select "Promote to Production"

## Database Backups

### Firestore Auto-Backups
- Go to Firestore Database → Manage
- Backups are automatic (daily)

### Manual Export
1. Go to Firestore → Manage
2. Click "Export/Import"
3. Select collections to export
4. Choose Cloud Storage bucket
5. Click "Export"

## Troubleshooting Deployment

### Build Fails
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing environment variables
# - Incorrect Firebase config
# - Node version mismatch

# Force rebuild
vercel --prod --force
```

### App Shows Blank Page
- Check browser console (F12 → Console)
- Verify Firebase credentials in environment
- Check network tab for API errors

### Auth Not Working
- Verify "Email/Password" is enabled in Firebase
- Check CORS settings
- Verify Firebase security rules

### WHOOP Data Not Loading
- App uses mock data by default
- For real WHOOP data:
  - Get API credentials from [developer.whoop.com](https://developer.whoop.com)
  - Update `src/services/whoopService.ts`
  - Add `VITE_WHOOP_API_KEY` to Vercel env

## Performance Tips

1. **Enable Image Optimization**
   - Vercel handles automatically

2. **Use Cache Busting**
   - Vercel caches assets
   - Use query params for cache busting

3. **Monitor Build Time**
   - Optimize imports
   - Use code splitting for large features

4. **Database Optimization**
   - Create Firestore indexes
   - Use pagination for large datasets

## Security Checklist

- [ ] Firebase credentials not in git (use .env)
- [ ] Firestore rules restrict to authenticated users
- [ ] HTTPS enabled (automatic)
- [ ] Rate limiting configured (Vercel default)
- [ ] API keys rotated regularly
- [ ] No sensitive data in localStorage

---

**Need Help?**
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Console](https://console.firebase.google.com)
- [GitHub Issues](https://github.com/Mhann37/Strengthinsight-personal/issues)
