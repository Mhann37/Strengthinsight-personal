# WHOOP Integration - Detailed Guide

**Version**: 2.0 (Enhanced with detailed metrics, trends, and smart caching)
**Last Updated**: March 27, 2026

---

## 📊 Overview

StrengthInsight Personal now includes a comprehensive WHOOP health dashboard with:

- **Real-time metrics**: Recovery score, HRV, RHR, body temperature, SpO₂
- **Sleep analysis**: Duration, efficiency, sleep stages (deep/REM/light), quality score
- **Strain tracking**: Daily score, cardio vs strength distribution, calories burned
- **Trend analysis**: 7-day and 30-day historical trends with charts
- **Smart caching**: Full historical import + incremental updates
- **Offline support**: Data persists in localStorage across sessions

---

## 🎯 Features

### Primary Metrics (Dashboard Cards)

#### 1. Recovery Score (0-100%)
- **Status Colors**:
  - 🟢 Green (>66%): Ready to train hard
  - 🟡 Yellow (33-66%): Moderate training recommended
  - 🔴 Red (<33%): Recovery day suggested

- **Underlying Data**:
  - HRV (Heart Rate Variability): 35-100+ ms
  - RHR (Resting Heart Rate): 50-65 bpm
  - Body Temperature: 36.8°C ± variation
  - SpO₂ (Blood Oxygen): 96-99%
  - Sleep Performance Score: 0-100

#### 2. Sleep Quality
- **Duration**: Hours slept (target 7-9 hours)
- **Efficiency**: Percentage of time actually sleeping vs in bed
- **Sleep Stages Breakdown**:
  - Deep Sleep: 15-25% (restoration)
  - REM Sleep: 20-30% (cognitive processing)
  - Light Sleep: 40-60% (transition)
- **Disturbances**: Awake minutes (keep <10% of total)
- **Quality Score**: 0-100 rating

#### 3. Strain Score (0-21)
- **Daily Strain**: Today's accumulated strain
- **Distribution**:
  - Cardio Strain: From cardiovascular activity
  - Strength Strain: From resistance training
- **Energy Metrics**:
  - Calories burned
  - Kilojoules expended
  - Average/max heart rate
- **Training Details**:
  - Sport type
  - Duration
  - Weekly cumulative strain

### Trend Charts (7/30-day History)

- **Recovery Trend**: Area chart showing recovery score over time
- **Sleep Quality**: Line chart of sleep quality progression
- **Strain Accumulation**: Bar chart of daily strain values
- **HRV/RHR Trends**: Historical averages and baselines

---

## 🔧 Technical Implementation

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ WHOOPDashboardComponent (React UI)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
         ┌───────────────────┐
         │ whoopService.ts   │  ← Service layer
         │ - getWHOOPData()  │
         └────────┬──────────┘
                  │
    ┌─────────────┴─────────────┐
    ↓                           ↓
┌─────────────┐         ┌───────────────┐
│ localStorage│         │ Mock/Real API │
│ (Cached)    │         │ (WHOOP CLI)   │
└─────────────┘         └───────────────┘
```

### Service Layer (`src/services/whoopService.ts`)

#### Key Functions

```typescript
// Get data with smart caching (5-minute cache)
const data = await getWHOOPData(forceRefresh?: boolean);

// Force full sync (pull all historical data)
const data = await forceFullSync();

// Get specific date range
const filtered = await getHistoricalData(startDate, endDate);

// Clear all cached data
clearCache();
```

#### Data Caching Strategy

**First Connection** (New user):
1. Call `getWHOOPData()` → fetches current metrics + 30-day history
2. Data stored in memory + localStorage
3. Display dashboard with full timeline

**Subsequent Connections** (Same session):
1. Check if cache is fresh (<5 minutes old)
2. If fresh: return cached data instantly
3. If stale: fetch only new data since last update
4. Merge with existing data in localStorage

**Force Full Sync**:
- User can click "Full Sync" button
- Pulls entire WHOOP history (all available data)
- Updates localStorage
- Shows "Last sync" timestamp

### Mock Data (For Testing)

Mock data is **realistic** and **consistent**:

```typescript
// Generated with realistic ranges:
Recovery:    50-95%
HRV:         35-100 ms
RHR:         50-65 bpm
Sleep:       5-8 hours
Efficiency:  75-95%
Strain:      0-18 score
```

---

## 📱 Dashboard Layout

### Top Section (Primary Metrics)

```
┌─────────────────────────────────────────────────────┐
│ Recovery Score (%) │ Sleep Quality (hrs) │ Strain (0-21) │
│       65%          │       6.5 hrs       │      8.2      │
│   Ready: ✅ Yes   │   Need: 7.5 hrs    │ Capacity: 12.8│
└─────────────────────────────────────────────────────┘
```

### Middle Section (Detailed Analysis)

**Recovery Details**:
- HRV (Current & 7-day avg)
- RHR (Current & trend)
- Body Temperature & anomaly flag
- Blood Oxygen

**Sleep Analysis**:
- Deep, REM, Light sleep breakdown
- Sleep quality score
- Disturbances (awake minutes)

**Training Details**:
- Sport type & duration
- Cardio/Strength distribution
- Calories & kilojoules
- Heart rate ranges

### Bottom Section (Trends & Insights)

**Charts** (Responsive grid):
- Recovery Trend (7-day area chart)
- Sleep Quality Trend (7-day line chart)
- Strain Accumulation (7-day bar chart)
- Sleep Stages Breakdown (radar chart)

**Action Card**:
```
Ready to Train? ✅ Yes
Your recovery score is 75% - Plenty of strain capacity!

OR

Recovery Day Recommended ⚠️
Focus on recovery. Light activity only.
```

---

## 🔌 Real API Integration (whoop-cli)

### Prerequisites

1. **WHOOP Account**: Create at [whoop.com](https://whoop.com)
2. **Developer Access**: Get API credentials from [developer.whoop.com](https://developer.whoop.com)
3. **whoop-cli**: Already installed (`npm whoop-cli@2.7.1`)

### Setup Steps

#### 1. Authenticate whoop-cli

```bash
# One-time setup
whoop auth

# This will:
# 1. Open browser to WHOOP login
# 2. Generate API token
# 3. Store in ~/.whoop/config.json (or similar)
```

#### 2. Test API Access

```bash
# Get latest recovery
whoop recovery latest

# Get last 7 days
whoop recovery --days 7

# Get sleep data
whoop sleep latest

# Get strain data
whoop strain latest
```

#### 3. Update `whoopService.ts`

Replace mock API with real calls:

```typescript
// src/services/whoopService.ts
import { exec } from 'child_process'; // Node.js only
// OR use HTTP client for browser:
import axios from 'axios';

export const fetchWHOOPData = async (): Promise<WHOOPDashboard> => {
  try {
    // Option 1: Use whoop-cli (Node.js/Electron)
    const recovery = await execCommand('whoop recovery latest');
    const sleep = await execCommand('whoop sleep latest');
    const strain = await execCommand('whoop strain latest');
    
    // Option 2: Use HTTP API (Browser)
    const token = process.env.VITE_WHOOP_API_KEY;
    const userId = process.env.VITE_WHOOP_USER_ID;
    
    const recovery = await axios.get(
      `https://api.whoop.com/developer/v1/user/${userId}/recovery/latest`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Parse and return
    return parseWHOOPResponse(recovery, sleep, strain);
  } catch (error) {
    console.error('Real API failed, falling back to mock data');
    return generateMockData();
  }
};
```

#### 4. Set Environment Variables

In Vercel (or `.env.local`):

```env
VITE_WHOOP_API_KEY=your_api_key_here
VITE_WHOOP_USER_ID=your_user_id_here
```

---

## 📊 Data Structures

### WHOOPRecovery Interface

```typescript
{
  timestamp: "2026-03-27T10:30:00Z",
  date: "2026-03-27",
  recovery_score: 75,           // 0-100%
  recovery_status: "green",     // red|yellow|green
  
  hrv: {
    value: 52,                  // Current HRV (ms)
    average: 48,                // 7-day average
    min: 35,
    max: 78,
    status: "optimal"           // low|optimal|high
  },
  
  resting_heart_rate: {
    value: 54,                  // Current RHR (bpm)
    average: 55,                // 7-day average
    trend: "improving",         // improving|stable|declining
    dayCount: 7
  },
  
  body_temperature: {
    value: 36.7,                // Celsius
    trend: "stable",
    anomaly: false              // Flag if unusual
  },
  
  spo2_percentage: 97.5,        // Blood oxygen
  sleep_performance_score: 78,  // 0-100
  ready_to_train: true,
  strain_capacity_remaining: 8.3
}
```

### WHOOPSleep Interface

```typescript
{
  timestamp: "2026-03-27T06:30:00Z",
  date: "2026-03-27",
  
  duration_minutes: 390,        // Total time asleep
  efficiency_percentage: 88,    // Time asleep vs in bed
  need_minutes: 450,            // How much sleep needed
  
  // Sleep stages
  deep_sleep_minutes: 65,       // Deep/slow-wave
  deep_sleep_percentage: 17,
  rem_sleep_minutes: 100,       // Rapid eye movement
  rem_sleep_percentage: 26,
  light_sleep_minutes: 225,     // Light/transitional
  light_sleep_percentage: 58,
  
  awake_minutes: 45,            // Disturbances
  
  sleep_quality_score: 82,      // 0-100
  qualitative_score: "Good",    // Poor|Fair|Good|Excellent
  consistency_score: 84         // How consistent sleep is
}
```

### WHOOPStrain Interface

```typescript
{
  timestamp: "2026-03-27T16:45:00Z",
  date: "2026-03-27",
  
  strain_score: 8.2,            // 0-21 scale
  cardio_strain: 4.8,           // From cardio
  strength_strain: 3.4,         // From lifting
  
  kilojoules: 1245,             // Energy burned
  calories_burned: 310,
  
  average_heart_rate: 145,      // During workout
  max_heart_rate: 178,
  
  sport: "Strength Training",   // Activity type
  duration_minutes: 75,
  
  weekly_strain_total: 62,      // This week's total
  weekly_strain_capacity: 100   // Recommended max
}
```

---

## 💾 Local Storage

Data persists using browser localStorage:

```javascript
// Keys used:
localStorage['whoop_dashboard_cache']    // Current metrics + history
localStorage['whoop_last_full_sync']     // Timestamp of last sync
localStorage['whoop_historical_data']    // Full historical export

// Cache expiration:
- Current metrics: 5 minutes
- Full history: 24 hours
```

---

## 🎨 UI Components

### MetricCard Component

```tsx
<MetricCard
  title="Recovery Score"
  value={75}
  unit="%"
  status="good"  // good|caution|warning
  icon={<HeartIcon />}
  trend="up"     // up|down|stable
  secondaryValue="Ready: ✅ Yes"
/>
```

### Chart Components

- `RecoveryTrendChart` - Area chart with gradient
- `SleepQualityChart` - Line chart over time
- `StrainTrendChart` - Bar chart daily accumulation
- `SleepBreakdownChart` - Radar chart for sleep stages

---

## 🔄 Data Sync Workflow

### Initial Setup

```
1. User loads dashboard
2. Check localStorage for cached data
3. If no cache: fetch full 30-day history
4. Store in localStorage
5. Display dashboard
```

### Subsequent Visits

```
1. Load from localStorage
2. Check if cache is fresh (<5 min)
3. If fresh: display immediately
4. If stale: fetch new data only
5. Merge with cached data
6. Update localStorage
```

### User Force Sync

```
1. User clicks "Full Sync" button
2. Clear existing cache
3. Fetch entire WHOOP history (all days)
4. Parse and store
5. Update "Last sync" timestamp
6. Refresh dashboard
```

---

## 📈 Trend Analysis

### 7-Day Trends
- Last 7 days of data
- Shows recent patterns
- Quick insight into current state

### 30-Day Trends
- Last 30 days of data
- Identifies longer-term patterns
- Useful for optimization

### Metrics Tracked
- Recovery score trend
- Sleep quality trend
- Strain accumulation
- HRV progression
- RHR progression

---

## 🚨 Error Handling

### Fallback Behavior

```typescript
// If WHOOP API fails:
1. Check localStorage for cached data
2. If cache exists: use cached (even if stale)
3. If no cache: generate realistic mock data
4. Show "offline mode" indicator

// Never crashes - always has fallback
```

### Error Messages

- **Connection Failed**: "Unable to sync. Using cached data from [time]"
- **No Data**: "No WHOOP data available. Using demo data."
- **Permission Error**: "WHOOP API access denied. Check credentials."

---

## 🎯 Usage Examples

### Get Current Metrics

```typescript
import { getWHOOPData } from './services/whoopService';

const data = await getWHOOPData();
console.log(`Recovery: ${data.recovery?.recovery_score}%`);
console.log(`Sleep: ${data.sleep?.duration_minutes} minutes`);
console.log(`Strain: ${data.strain?.strain_score}/21`);
```

### Force Full Sync

```typescript
import { forceFullSync } from './services/whoopService';

const data = await forceFullSync();
console.log(`Imported ${data.dataPoints} data points`);
console.log(`Date range: ${data.dateRange.start} to ${data.dateRange.end}`);
```

### Get Historical Range

```typescript
import { getHistoricalData } from './services/whoopService';

const week = await getHistoricalData('2026-03-21', '2026-03-27');
console.log(`Sleep entries: ${week?.sleeps.length}`);
console.log(`Avg recovery: ${week?.recoveries.map(r => r.recovery_score).reduce((a,b) => a+b)/week.recoveries.length}`);
```

---

## 🔐 Security & Privacy

### Data Handling

- ✅ No sensitive data sent to 3rd parties
- ✅ API keys stored in environment variables only
- ✅ localStorage is browser-only (not synced)
- ✅ HTTPS enforced in production

### API Credentials

```env
# Store in Vercel environment (never in code):
VITE_WHOOP_API_KEY=...
VITE_WHOOP_USER_ID=...
```

### Firestore Security Rules

```rules
// Only user can access their own data
match /whoop_metrics/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## 📱 Mobile Responsiveness

### Breakpoints

- **Mobile** (<640px): Stacked cards, single column
- **Tablet** (640-1024px): 2-column layout
- **Desktop** (>1024px): 3-4 column grid for metrics, side-by-side charts

### Performance

- Charts resize responsively
- Touch-friendly tap targets
- Optimized for slow connections
- Offline mode works seamlessly

---

## 🐛 Troubleshooting

### Dashboard Blank

**Solution**: Check browser console (F12)
```
Error: Failed to load WHOOP data
→ Retry or refresh page
→ Check .env.local for API keys
```

### No Historical Data

**Solution**: Click "Full Sync" button
```
If sync fails:
1. Verify whoop-cli is authenticated
2. Check API credentials in .env
3. Check WHOOP account has data
```

### Cache Not Updating

**Solution**: Clear localStorage and refresh
```javascript
localStorage.removeItem('whoop_dashboard_cache');
location.reload();
```

### Charts Not Showing

**Solution**: Ensure Recharts is installed
```bash
npm install recharts
```

---

## 🚀 Future Roadmap

- [ ] Real-time WebSocket updates
- [ ] Wearable notifications
- [ ] AI-powered recommendations
- [ ] Integration with other wearables (Oura, Fitbit)
- [ ] Mobile app (React Native)
- [ ] Community leaderboards
- [ ] Training program recommendations
- [ ] Correlation analysis (recovery vs training)

---

## 📚 Resources

| Resource | Link |
|----------|------|
| WHOOP API Docs | https://developer.whoop.com |
| whoop-cli | https://github.com/willthejerk/whoop-cli |
| Recharts | https://recharts.org |
| Firebase | https://firebase.google.com |

---

## ❓ FAQ

**Q: Is my WHOOP data private?**
A: Yes. Data never leaves your device unless you explicitly sync to Firebase.

**Q: Can I use this offline?**
A: Yes. Cached data works offline. Sync when connection returns.

**Q: How often should I sync?**
A: Automatically every 5 minutes. Manually click "Full Sync" weekly.

**Q: Can I export my data?**
A: Not yet, but you can screenshot trends or implement CSV export.

**Q: Does this work without WHOOP?**
A: Yes. Uses realistic mock data for demo/testing.

---

**Built with 💪 for personal health optimization**

Last Updated: March 27, 2026 | Version 2.0
