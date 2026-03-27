# StrengthInsight Personal Edition

A unified health & fitness dashboard combining **StrengthInsight** strength training analytics with **WHOOP** real-time recovery metrics.

## 🚀 Features

### Strength Training Analytics
- Track workout sessions with detailed exercise data
- Monitor personal records (PRs) and progression
- Analyze training volume, muscle balance, and weekly trends
- Generate next workouts using AI
- Share progress cards with friends

### Live Health Metrics  
- **Recovery Score** (0-100): RHR, HRV, SpO₂, balance
- **Sleep Quality**: Total time, efficiency, sleep need  
- **Strain Score** (0-21): Daily exertion, HR zones, energy burned
- **Real-time Updates**: Dashboard refreshes with latest data

### Unified Dashboard
```
┌─────────────────────────────────────┐
│  WHOOP Metrics (Recovery/Sleep)     │
├─────────────────────────────────────┤
│  StrengthInsight Analytics          │
├─────────────────────────────────────┤
│  Combined Health Insights           │
└─────────────────────────────────────┘
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

- **WHOOP Metrics**: Mock data (realistic values for testing)
- **StrengthInsight**: Firebase-backed, real user data
- **Ready for Real API**: Can integrate live WHOOP data via environment config

## 🎯 Roadmap

- [ ] Real WHOOP API integration
- [ ] 7/30/90-day trend analysis
- [ ] AI-powered recovery recommendations
- [ ] Mobile app (React Native)
- [ ] Wearable notifications
- [ ] Training-recovery correlations

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

- Full setup guide: [README_WHOOP_INTEGRATION.md](README_WHOOP_INTEGRATION.md)
- StrengthInsight: https://github.com/Mhann37/Strengthinsight
- WHOOP API: https://developer.whoop.com
- Vercel: https://vercel.com/docs

## 📝 License

Personal fork of [StrengthInsight](https://github.com/Mhann37/Strengthinsight)

---

**Built with 💪 for personal health optimization**

[GitHub](https://github.com/Mhann37/Strengthinsight-personal) • [Vercel Deploy](#) • [Issues](https://github.com/Mhann37/Strengthinsight-personal/issues)
