/**
 * API response types that match the C# models from the backend
 */
import { IndicatorType } from "./domain";
import type { UserPreferences } from "./domain";

export interface CryptoPriceResponse {
  symbol: string;
  price: number;
  timestamp: string;
}

export interface IndicatorResponse {
  symbol: string;
  type: IndicatorType;
  value: number;
  startTime: string;
  endTime: string;
}

export interface IndicatorTypesResponse {
  indicators: IndicatorType[];
}

export interface CandlestickDataResponse {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalCandlestickResponse {
  symbol: string;
  timeframe: string;
  data: CandlestickDataResponse[];
}

export type UserPreferencesResponse = UserPreferences;

export interface UserPreferencesRequest {
  chart?: {
    type: string;
    timeFrame: string;
    showVolume: boolean;
    showGrid: boolean;
    colorScheme: string;
  };
  indicators?: Array<{
    type: IndicatorType;
    period: number;
    isVisible: boolean;
    color: string;
    parameters: Record<string, unknown>;
  }>;
  favoritePairs?: string[];
  ui?: {
    darkMode: boolean;
    language: string;
    showAdvancedFeatures: boolean;
    refreshInterval: number;
  };
}
