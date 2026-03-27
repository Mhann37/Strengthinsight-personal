# StrengthInsight Personal + WHOOP Dashboard

A unified health and fitness dashboard combining **StrengthInsight** (strength training analytics) with **WHOOP** (real-time recovery, HRV, strain, and sleep metrics).

## Features

### 🎯 StrengthInsight
- Track strength training workouts
- Monitor personal records (PRs)
- Analyze training volume and progression
- Generate next workouts based on history
- Share progress cards

### 💪 WHOOP Integration
- **Recovery Score** (0-100): Resting heart rate, HRV, SpO₂, and balance
- **Sleep Quality**: Total sleep, sleep need, efficiency percentage
- **Strain Score** (0-21): Daily exertion, heart rate zones, kilojoules burned
- **Real-time Updates**: Live metrics dashboard

### 📊 Unified Dashboard
- WHOOP metrics at the top (Recovery, Sleep, Strain)
- StrengthInsight training analytics in the middle
- Combined health insights at the bottom

## Setup & Deployment

### Prerequisites
- Node.js 18+ and npm
- GitHub account (for repo access)
- Vercel account (for deployment)
- WHOOP API credentials (optional, currently using mock data)

### 1. Local Setup

```bash
# Clone the repository
git clone https://github.com/Mhann37/Strengthinsight-personal.git
cd Strengthinsight-personal

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 2. Environment Variables

Create a `.env` file (optional, for WHOOP API):

```env
VITE_WHOOP_API_KEY=your_whoop_api_key
VITE_WHOOP_USER_ID=your_whoop_user_id
```

### 3. Deploy to Vercel

#### Option A: CLI Deployment
```bash
npm install -g vercel
vercel
```

#### Option B: GitHub Auto-Deploy
1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com)
3. Click "New Project"
4. Import GitHub repository
5. Deploy automatically

### Configuration

#### Firebase (StrengthInsight Backend)
Update `src/firebase.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

#### WHOOP API (Real Data)
To enable real WHOOP data instead of mock data:

1. Get WHOOP API credentials from [WHOOP Developer Portal](https://developer.whoop.com)
2. Update `src/services/whoopService.ts` with API calls
3. Set environment variables with credentials

## Architecture

### File Structure
```
src/
├── services/
│   ├── whoopService.ts          # WHOOP API integration
│   └── generateWorkoutService.ts # StrengthInsight AI workouts
├── components/v2/
│   ├── WHOOPDashboard.tsx        # WHOOP metrics display
│   ├── DashboardV2.tsx           # Main unified dashboard
│   ├── AppShellV2.tsx            # App layout & navigation
│   └── ...
├── contexts/
│   └── UserSettingsContext.tsx   # User preferences
└── ...
```

### Key Components

#### WHOOPDashboard.tsx
- Fetches and displays WHOOP metrics
- Shows recovery score, sleep data, strain metrics
- 5-minute cache for API efficiency
- Mobile-responsive card layout

#### DashboardV2.tsx
- Integrates WHOOP dashboard at the top
- Shows StrengthInsight analytics below
- Personal records, training history, volume trends
- Monthly training summary and balance analysis

## Real-Time Data Integration

### Current Implementation (Mock Data)
For development and testing, the app uses realistic mock data:

```typescript
const generateMockData = (): WHOOPDashboard => {
  return {
    recovery: { recovery_score: 75, resting_heart_rate: 52, ... },
    sleep: { total_minutes: 450, efficiency_percentage: 88, ... },
    strain: { strain_score: 12.5, kilojoules: 1200, ... },
    lastUpdated: new Date().toISOString()
  };
};
```

### To Enable Real WHOOP Data

1. **Method 1: WHOOP CLI (Authenticated)**
   ```typescript
   // In whoopService.ts
   const result = await exec('whoop recovery'); // Requires authentication
   ```

2. **Method 2: WHOOP API (Direct)**
   ```typescript
   const response = await axios.get('https://api.whoop.com/api/v1/recovery', {
     headers: { Authorization: `Bearer ${TOKEN}` }
   });
   ```

3. **Method 3: whoop-npm Package** (Coming soon)

## Mobile Responsiveness

- **Mobile**: Stacked card layout, full-width metrics
- **Tablet**: 2-column layout for metrics
- **Desktop**: 4-column grid with detailed stats
- Touch-friendly buttons and spacing

## Performance Optimizations

- **Caching**: 5-minute cache for WHOOP data
- **Lazy Loading**: Components load on demand
- **Image Optimization**: Responsive images in public folder
- **Code Splitting**: Route-based component splitting

## Features Roadmap

- [ ] Real WHOOP API integration
- [ ] Historical data trends (7/30/90-day views)
- [ ] Personalized recommendations based on recovery
- [ ] Integration with training calendar
- [ ] Wearable sync notifications
- [ ] Export data to CSV/PDF

## Support & Documentation

- **StrengthInsight Docs**: [strengthinsight.app](https://strengthinsight.app)
- **WHOOP API Docs**: [developer.whoop.com](https://developer.whoop.com)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)

## Troubleshooting

### WHOOP Data Not Loading
- Check mock data is generating (check console)
- Verify API credentials if using real data
- Check browser console for error messages
- Clear browser cache and reload

### Firebase Authentication Issues
- Verify Firebase project is set up
- Check CORS settings in Firebase console
- Ensure email/password auth is enabled

### Deployment Issues
- Check Vercel logs: `vercel logs <project-name>`
- Verify environment variables are set in Vercel dashboard
- Ensure node_modules is in .gitignore

## License

StrengthInsight Personal is a fork of [StrengthInsight](https://github.com/Mhann37/Strengthinsight).

---

**Questions?** Create an issue on [GitHub](https://github.com/Mhann37/Strengthinsight-personal/issues)
