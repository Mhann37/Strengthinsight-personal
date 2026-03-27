// WHOOP API Integration Service (v2)
// Comprehensive health metrics with historical data, trends, and smart caching

// ============================================================================
// DATA INTERFACES
// ============================================================================

export interface HRVData {
  value: number; // Current HRV in ms
  average: number; // 7-day average
  min: number; // Min value in period
  max: number; // Max value in period
  status: 'low' | 'optimal' | 'high'; // Based on baseline
}

export interface RHRData {
  value: number; // Current RHR (bpm)
  average: number; // 7-day average
  trend: 'improving' | 'stable' | 'declining';
  dayCount: number; // Days tracked
}

export interface WHOOPSleep {
  timestamp: string;
  date: string; // YYYY-MM-DD format for consistency
  duration_minutes: number;
  efficiency_percentage: number;
  need_minutes: number;
  consistency_score: number; // 0-100: how consistent is sleep
  
  // Sleep stages breakdown
  deep_sleep_minutes: number;
  deep_sleep_percentage: number;
  rem_sleep_minutes: number;
  rem_sleep_percentage: number;
  light_sleep_minutes: number;
  light_sleep_percentage: number;
  awake_minutes: number; // Disturbances
  
  // Quality metrics
  sleep_quality_score: number; // 0-100
  qualitative_score: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  notes?: string;
}

export interface WHOOPRecovery {
  timestamp: string;
  date: string;
  recovery_score: number; // 0-100%
  recovery_status: 'red' | 'yellow' | 'green'; // Red (<33), yellow (33-66), green (>66)
  
  // HRV metrics
  hrv: HRVData;
  
  // RHR metrics
  resting_heart_rate: RHRData;
  
  // Body metrics
  body_temperature: {
    value: number; // Celsius
    trend: 'rising' | 'stable' | 'falling';
    anomaly: boolean; // Flag if unusual
  };
  
  spo2_percentage: number; // Blood oxygen
  
  // Sleep performance
  sleep_performance_score: number; // 0-100
  
  // Recovery readiness
  ready_to_train: boolean; // Composite score
  strain_capacity_remaining: number; // 0-21 capacity available today
}

export interface WHOOPStrain {
  timestamp: string;
  date: string;
  strain_score: number; // 0-21
  
  // Distribution
  cardio_strain: number; // 0-21 portion from cardio
  strength_strain: number; // 0-21 portion from strength
  
  // Activity metrics
  kilojoules: number; // Total energy burned
  calories_burned: number;
  average_heart_rate: number;
  max_heart_rate: number;
  time_zone?: string;
  
  // Training specifics
  sport: string;
  duration_minutes: number;
  
  // Cumulative
  weekly_strain_total?: number; // Total strain this week
  weekly_strain_capacity?: number; // Recommended weekly capacity
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface WHOOPTrends {
  recovery_7d: TrendPoint[];
  recovery_30d: TrendPoint[];
  sleep_quality_7d: TrendPoint[];
  sleep_quality_30d: TrendPoint[];
  strain_7d: TrendPoint[];
  strain_30d: TrendPoint[];
  hrv_7d: TrendPoint[];
  rhr_7d: TrendPoint[];
}

export interface WHOOPHistoricalData {
  sleeps: WHOOPSleep[];
  recoveries: WHOOPRecovery[];
  strains: WHOOPStrain[];
  trends: WHOOPTrends;
}

export interface WHOOPDashboard {
  // Current metrics
  recovery: WHOOPRecovery | null;
  sleep: WHOOPSleep | null; // Last night
  strain: WHOOPStrain | null; // Today or last workout
  
  // Historical data
  historical: WHOOPHistoricalData;
  
  // Metadata
  lastUpdated: string;
  lastFullSync?: string; // When we last pulled all history
  dataPoints: number; // Total data points in historical
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
}

// ============================================================================
// MOCK DATA GENERATION (Realistic Test Data)
// ============================================================================

const generateMockSleep = (daysAgo: number = 0): WHOOPSleep => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  const dateStr = baseDate.toISOString().split('T')[0];
  
  const totalMinutes = 300 + Math.random() * 180; // 5-8 hours
  const efficiency = 75 + Math.random() * 20; // 75-95%
  
  const deepPercentage = 15 + Math.random() * 10; // 15-25%
  const remPercentage = 20 + Math.random() * 10; // 20-30%
  const lightPercentage = 100 - deepPercentage - remPercentage;
  
  return {
    timestamp: baseDate.toISOString(),
    date: dateStr,
    duration_minutes: Math.round(totalMinutes),
    efficiency_percentage: Math.round(efficiency),
    need_minutes: 420 + Math.random() * 60, // 7-9 hours needed
    consistency_score: 70 + Math.random() * 25,
    
    deep_sleep_minutes: Math.round((totalMinutes * deepPercentage) / 100),
    deep_sleep_percentage: Math.round(deepPercentage),
    rem_sleep_minutes: Math.round((totalMinutes * remPercentage) / 100),
    rem_sleep_percentage: Math.round(remPercentage),
    light_sleep_minutes: Math.round((totalMinutes * lightPercentage) / 100),
    light_sleep_percentage: Math.round(lightPercentage),
    awake_minutes: Math.round(totalMinutes * (1 - efficiency / 100)),
    
    sleep_quality_score: 70 + Math.random() * 25,
    qualitative_score: ['Fair', 'Good', 'Good', 'Excellent'][Math.floor(Math.random() * 4)] as any,
  };
};

const generateMockRecovery = (daysAgo: number = 0): WHOOPRecovery => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  const dateStr = baseDate.toISOString().split('T')[0];
  
  const recoveryScore = 50 + Math.random() * 45; // 50-95%
  
  return {
    timestamp: baseDate.toISOString(),
    date: dateStr,
    recovery_score: Math.round(recoveryScore),
    recovery_status: recoveryScore < 33 ? 'red' : recoveryScore < 66 ? 'yellow' : 'green',
    
    hrv: {
      value: 35 + Math.random() * 65, // Current HRV 35-100ms
      average: 45 + Math.random() * 45, // 7-day average
      min: 25 + Math.random() * 30,
      max: 60 + Math.random() * 50,
      status: Math.random() > 0.5 ? 'optimal' : (Math.random() > 0.5 ? 'low' : 'high'),
    },
    
    resting_heart_rate: {
      value: 50 + Math.random() * 15, // 50-65 bpm
      average: 52 + Math.random() * 12,
      trend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
      dayCount: 7,
    },
    
    body_temperature: {
      value: 36.8 + (Math.random() - 0.5) * 0.6, // ±0.3°C around 36.8
      trend: ['rising', 'stable', 'falling'][Math.floor(Math.random() * 3)] as any,
      anomaly: Math.random() > 0.9, // 10% chance
    },
    
    spo2_percentage: 96 + Math.random() * 3, // 96-99%
    
    sleep_performance_score: 75 + Math.random() * 20,
    
    ready_to_train: recoveryScore > 40,
    strain_capacity_remaining: 21 - (10 + Math.random() * 5), // Remaining capacity
  };
};

const generateMockStrain = (daysAgo: number = 0): WHOOPStrain => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  const dateStr = baseDate.toISOString().split('T')[0];
  
  const strainScore = Math.random() * 18; // 0-18
  const cardioStrain = strainScore * (0.4 + Math.random() * 0.3);
  const strengthStrain = strainScore - cardioStrain;
  
  return {
    timestamp: baseDate.toISOString(),
    date: dateStr,
    strain_score: Math.round(strainScore * 10) / 10,
    
    cardio_strain: Math.round(cardioStrain * 10) / 10,
    strength_strain: Math.round(strengthStrain * 10) / 10,
    
    kilojoules: 800 + Math.random() * 1200, // 800-2000 kJ
    calories_burned: 250 + Math.random() * 400, // 250-650 cal
    average_heart_rate: 110 + Math.random() * 70, // 110-180
    max_heart_rate: 160 + Math.random() * 40, // 160-200
    
    sport: ['Strength Training', 'Running', 'Cycling', 'Swimming', 'HIIT', 'Recovery Workout'][
      Math.floor(Math.random() * 6)
    ],
    duration_minutes: 30 + Math.random() * 90, // 30-120 min workouts
    
    weekly_strain_total: 60 + Math.random() * 50,
    weekly_strain_capacity: 100,
  };
};

const generateMockTrendData = (metric: 'recovery' | 'sleep' | 'strain' | 'hrv' | 'rhr'): TrendPoint[] => {
  const points: TrendPoint[] = [];
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    let value = 0;
    switch (metric) {
      case 'recovery':
        value = 50 + Math.random() * 45;
        break;
      case 'sleep':
        value = 70 + Math.random() * 25;
        break;
      case 'strain':
        value = 5 + Math.random() * 13;
        break;
      case 'hrv':
        value = 35 + Math.random() * 65;
        break;
      case 'rhr':
        value = 50 + Math.random() * 15;
        break;
    }
    
    points.push({
      date: dateStr,
      value: Math.round(value * 10) / 10,
    });
  }
  
  return points;
};

const generateMockHistoricalData = (): WHOOPHistoricalData => {
  const sleeps: WHOOPSleep[] = [];
  const recoveries: WHOOPRecovery[] = [];
  const strains: WHOOPStrain[] = [];
  
  // Generate 30 days of data
  for (let i = 30; i >= 0; i--) {
    sleeps.push(generateMockSleep(i));
    recoveries.push(generateMockRecovery(i));
    if (Math.random() > 0.3) {
      // Not every day has strain
      strains.push(generateMockStrain(i));
    }
  }
  
  return {
    sleeps,
    recoveries,
    strains,
    trends: {
      recovery_7d: generateMockTrendData('recovery').slice(-7),
      recovery_30d: generateMockTrendData('recovery'),
      sleep_quality_7d: generateMockTrendData('sleep').slice(-7),
      sleep_quality_30d: generateMockTrendData('sleep'),
      strain_7d: generateMockTrendData('strain').slice(-7),
      strain_30d: generateMockTrendData('strain'),
      hrv_7d: generateMockTrendData('hrv').slice(-7),
      rhr_7d: generateMockTrendData('rhr').slice(-7),
    },
  };
};

// ============================================================================
// CACHE & SYNC MANAGEMENT
// ============================================================================

interface CacheState {
  data: WHOOPDashboard | null;
  lastUpdated: number;
  lastFullSync: number;
}

let cacheState: CacheState = {
  data: null,
  lastUpdated: 0,
  lastFullSync: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for current metrics
const FULL_SYNC_DURATION = 24 * 60 * 60 * 1000; // 24 hours for historical data

const STORAGE_KEYS = {
  CACHE: 'whoop_dashboard_cache',
  LAST_SYNC: 'whoop_last_full_sync',
  HISTORICAL: 'whoop_historical_data',
};

// Load cache from localStorage (client-side)
const loadFromLocalStorage = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.CACHE);
    if (cached) {
      cacheState.data = JSON.parse(cached);
    }
    
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (lastSync) {
      cacheState.lastFullSync = parseInt(lastSync);
    }
  } catch (error) {
    console.warn('Failed to load WHOOP cache from localStorage:', error);
  }
};

// Save cache to localStorage
const saveToLocalStorage = (data: WHOOPDashboard): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.warn('Failed to save WHOOP cache to localStorage:', error);
  }
};

// ============================================================================
// MAIN API FUNCTIONS
// ============================================================================

// Real API integration (whoop-cli or HTTP)
export const fetchWHOOPData = async (): Promise<WHOOPDashboard> => {
  try {
    // NOTE: When whoop-cli is authenticated, replace this with actual API calls
    // This would look like:
    // const recovery = await exec('whoop recovery latest');
    // const sleep = await exec('whoop sleep latest');
    // const strain = await exec('whoop strain latest');
    
    // For now: return mock data with proper structure
    const historical = generateMockHistoricalData();
    
    return {
      recovery: generateMockRecovery(0),
      sleep: generateMockSleep(1), // Last night
      strain: generateMockStrain(0), // Today
      historical,
      lastUpdated: new Date().toISOString(),
      lastFullSync: new Date().toISOString(),
      dataPoints: historical.sleeps.length + historical.recoveries.length + historical.strains.length,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
    };
  } catch (error) {
    console.error('Failed to fetch WHOOP data:', error);
    
    // Fallback: generate mock data
    const historical = generateMockHistoricalData();
    return {
      recovery: generateMockRecovery(0),
      sleep: generateMockSleep(1),
      strain: generateMockStrain(0),
      historical,
      lastUpdated: new Date().toISOString(),
      dataPoints: historical.sleeps.length + historical.recoveries.length + historical.strains.length,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
    };
  }
};

// Smart caching: use cache if fresh, otherwise fetch and cache
export const getWHOOPData = async (forceRefresh = false): Promise<WHOOPDashboard> => {
  const now = Date.now();
  
  // Load from localStorage on first call
  if (!cacheState.data) {
    loadFromLocalStorage();
  }
  
  // Return cached data if still fresh
  if (!forceRefresh && cacheState.data && now - cacheState.lastUpdated < CACHE_DURATION) {
    return cacheState.data;
  }
  
  // Fetch new data
  const data = await fetchWHOOPData();
  
  // Update cache
  cacheState.data = data;
  cacheState.lastUpdated = now;
  
  // Save to localStorage for persistence across sessions
  saveToLocalStorage(data);
  
  return data;
};

// Force full historical sync (pull all available data)
export const forceFullSync = async (): Promise<WHOOPDashboard> => {
  console.log('🔄 Starting full WHOOP data sync...');
  const data = await fetchWHOOPData();
  
  cacheState.data = data;
  cacheState.lastUpdated = Date.now();
  cacheState.lastFullSync = Date.now();
  
  saveToLocalStorage(data);
  
  console.log(`✅ Full sync complete: ${data.dataPoints} data points imported`);
  return data;
};

// Get historical data for a specific date range
export const getHistoricalData = async (
  startDate: string,
  endDate: string
): Promise<WHOOPHistoricalData | null> => {
  const data = await getWHOOPData();
  
  if (!data.historical) return null;
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return {
    sleeps: data.historical.sleeps.filter(
      (s) => new Date(s.date).getTime() >= start && new Date(s.date).getTime() <= end
    ),
    recoveries: data.historical.recoveries.filter(
      (r) => new Date(r.date).getTime() >= start && new Date(r.date).getTime() <= end
    ),
    strains: data.historical.strains.filter(
      (s) => new Date(s.date).getTime() >= start && new Date(s.date).getTime() <= end
    ),
    trends: data.historical.trends,
  };
};

// Clear all cached data
export const clearCache = (): void => {
  cacheState = { data: null, lastUpdated: 0, lastFullSync: 0 };
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.CACHE);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }
};
