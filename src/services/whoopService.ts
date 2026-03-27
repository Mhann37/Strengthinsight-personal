// WHOOP API Integration Service
// Fetches and caches recovery, HRV, strain, and sleep data

export interface WHOOPRecovery {
  timestamp: string;
  recovery_score: number; // 0-100
  resting_heart_rate: number;
  hrv_rmssd: number;
  hrv_balanced: boolean;
  spo2_percentage: number;
}

export interface WHOOPSleep {
  timestamp: string;
  need_minutes: number;
  total_minutes: number;
  efficiency_percentage: number;
  qualitative_score: string;
}

export interface WHOOPStrain {
  timestamp: string;
  strain_score: number; // 0-21
  kilojoules: number;
  average_heart_rate: number;
  max_heart_rate: number;
  sport: string;
}

export interface WHOOPDashboard {
  recovery: WHOOPRecovery | null;
  sleep: WHOOPSleep | null;
  strain: WHOOPStrain | null;
  lastUpdated: string;
}

// Mock data for development (will be replaced with real API calls)
const generateMockData = (): WHOOPDashboard => {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  return {
    recovery: {
      timestamp: now,
      recovery_score: 65 + Math.random() * 30,
      resting_heart_rate: 50 + Math.random() * 15,
      hrv_rmssd: 30 + Math.random() * 40,
      hrv_balanced: Math.random() > 0.5,
      spo2_percentage: 95 + Math.random() * 4,
    },
    sleep: {
      timestamp: yesterday,
      need_minutes: 420 + Math.random() * 60,
      total_minutes: 350 + Math.random() * 120,
      efficiency_percentage: 75 + Math.random() * 20,
      qualitative_score: ['Poor', 'Fair', 'Good', 'Excellent'][Math.floor(Math.random() * 4)],
    },
    strain: {
      timestamp: yesterday,
      strain_score: Math.random() * 15,
      kilojoules: 500 + Math.random() * 1500,
      average_heart_rate: 120 + Math.random() * 50,
      max_heart_rate: 160 + Math.random() * 40,
      sport: ['Strength Training', 'Running', 'Cycling', 'Recovery'][Math.floor(Math.random() * 4)],
    },
    lastUpdated: now,
  };
};

// Real API integration (to be implemented with WHOOP API credentials)
export const fetchWHOOPData = async (): Promise<WHOOPDashboard> => {
  try {
    // Try to use whoop-cli if available
    // For now, return mock data
    return generateMockData();
  } catch (error) {
    console.error('Failed to fetch WHOOP data:', error);
    return generateMockData();
  }
};

// Function to fetch data and cache it
let cachedData: WHOOPDashboard | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getWHOOPData = async (forceRefresh = false): Promise<WHOOPDashboard> => {
  const now = Date.now();
  if (!forceRefresh && cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  cachedData = await fetchWHOOPData();
  lastFetchTime = now;
  return cachedData;
};
