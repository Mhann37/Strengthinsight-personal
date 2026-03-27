# StrengthInsight Personal Edition

A unified health & fitness dashboard combining **StrengthInsight** strength training analytics with **WHOOP** real-time recovery metrics.

## 🚀 Features

### WHOOP Health Integration ⭐ (Enhanced v2.0)

#### Recovery Analytics
- Recovery score (0-100%) with status indicator (🟢 ready / 🟡 caution / 🔴 recovery day)
- HRV (Heart Rate Variability): Current + 7-day average with min/max
- RHR (Resting Heart Rate): Current + trend analysis
- Body temperature monitoring with anomaly detection
- Blood oxygen (SpO₂) tracking: 96-99%
- Sleep performance score
- **Ready to Train** readiness check

#### Sleep Analysis
- Total sleep duration (hours) vs need
- Sleep efficiency percentage
- Sleep stages breakdown:
  - Deep sleep: % and minutes
  - REM sleep: % and minutes
  - Light sleep: % and minutes
  - Disturbances (awake minutes)
- Sleep quality score (0-100) with qualitative rating
- Sleep consistency tracking

#### Strain Tracking
- Daily strain score (0-21 scale)
- Cardio strain vs strength strain breakdown
- Calories burned + kilojoules expended
- Average/max heart rate during training
- Sport type and workout duration
- Weekly cumulative strain with capacity remaining
- **Ready to strain capacity** indicator

#### Trend Analysis & Charts
- 7-day recovery trend (area chart)
- 30-day recovery progression
- Sleep quality trends (line chart)
- Strain accumulation (bar chart)
- Sleep stages breakdown (radar chart)
- HRV and RHR progression over time

#### Smart Data Caching
- Auto-cache every 5 minutes
- Full historical sync (24-hour interval)
- localStorage persistence across sessions
- Incremental updates to avoid redundant API calls
- Offline mode with cached data fallback

### Strength Training Analytics
- Track workout sessions with detailed exercise data
- Monitor personal records (PRs) and progression
- Analyze training volume, muscle balance, and weekly trends
- Generate next workouts using AI
- Share progress cards with friends

### Unified Dashboard
```
┌──────────────────────────────────────────┐
│  WHOOP Metrics (Recovery/Sleep/Strain)   │
│  - 3 primary metric cards                │
│  - Status indicators & trends            │
├──────────────────────────────────────────┤
│  Detailed Analysis                       │
│  - Recovery: HRV, RHR, Temp, SpO2        │
│  - Sleep: Stages breakdown, quality      │
│  - Training: Cardio/strength, duration   │
├──────────────────────────────────────────┤
│  Trend Charts (7-day & 30-day)           │
│  - Recovery/Sleep quality/Strain trends  │
├──────────────────────────────────────────┤
│  StrengthInsight Analytics               │
│  - Personal records, volume trends       │
├──────────────────────────────────────────┤
│  Combined Insights                       │
│  - Ready to train? Recovery recommendations
└──────────────────────────────────────────┘
```

## 📋 Quick Start

### Local Development
```bash
git clone https://github.com/Mhann37/Strengthinsight-personal.git
cd Strengthinsight-personal
npm install
npm run dev
```

Open http://localhost:5173

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

Or connect GitHub repo to Vercel for auto-deployment.

## ⚙️ Configuration

### Firebase (Authentication & Data)
Update `src/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};
```

### WHOOP API (Optional - Currently Uses Mock Data)
Create `.env`:
```env
VITE_WHOOP_API_KEY=your_api_key
VITE_WHOOP_USER_ID=your_user_id
```

See [README_WHOOP_INTEGRATION.md](README_WHOOP_INTEGRATION.md) for detailed setup.

## 📁 Project Structure

```
src/
├── components/v2/
│   ├── WHOOPDashboard.tsx      ← WHOOP metrics display
│   ├── DashboardV2.tsx         ← Main dashboard
│   ├── AppShellV2.tsx          ← Layout & nav
│   └── ...
├── services/
│   ├── whoopService.ts         ← WHOOP API integration
│   └── generateWorkoutService.ts
├── contexts/
│   └── UserSettingsContext.tsx
└── firebase.ts                 ← Firebase config
```

## 🔧 Technologies

- **Frontend**: React 19 + TypeScript
- **UI Framework**: TailwindCSS + Heroicons
- **Data**: Firebase/Firestore
- **Charts**: Recharts
- **Build**: Vite
- **API**: WHOOP CLI / REST API
- **Hosting**: Vercel

## 📊 Current Data Status

- **WHOOP Metrics**: Realistic mock data (30-day history) for testing
  - Replace with real API in `whoopService.ts` when credentials available
  - Ready for whoop-cli integration
  - Full localStorage caching infrastructure
- **StrengthInsight**: Firebase-backed, real user data
- **Data Persistence**: Stores 30-day history locally (no API quota issues)

## 🎯 Roadmap

- [x] WHOOP v2 integration with detailed metrics
- [x] 7/30-day trend analysis & charts
- [x] Sleep stages breakdown & analysis
- [x] Smart caching & offline support
- [ ] Real WHOOP API authentication (whoop-cli)
- [ ] AI-powered recovery recommendations
- [ ] Training-recovery correlation analysis
- [ ] Mobile app (React Native)
- [ ] Wearable notifications
- [ ] Integration with other wearables (Oura, Fitbit)

## 🆘 Troubleshooting

**WHOOP data not loading?**
- Check browser console for errors
- Verify mock data is generating (should see random values)
- Clear cache and reload

**Firebase auth issues?**
- Verify `.env` has correct Firebase credentials
- Enable Email/Password auth in Firebase Console
- Check CORS settings

**Vercel deployment fails?**
- Check build logs: `vercel logs <project>`
- Verify environment variables in Vercel dashboard
- Ensure `node_modules` in `.gitignore`

## 📖 Documentation

- **WHOOP Setup & Features**: [WHOOP_DETAILED_GUIDE.md](WHOOP_DETAILED_GUIDE.md) ⭐ START HERE
- **Integration Details**: [README_WHOOP_INTEGRATION.md](README_WHOOP_INTEGRATION.md)
- **Setup Instructions**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Project Overview**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- StrengthInsight: https://github.com/Mhann37/Strengthinsight
- WHOOP API: https://developer.whoop.com
- Vercel: https://vercel.com/docs

## 📝 License

Personal fork of [StrengthInsight](https://github.com/Mhann37/Strengthinsight)

---

**Built with 💪 for personal health optimization**

[GitHub](https://github.com/Mhann37/Strengthinsight-personal) • [Vercel Deploy](#) • [Issues](https://github.com/Mhann37/Strengthinsight-personal/issues)
