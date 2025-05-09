/**
 * API response types that match the C# models from the backend
 */
import { IndicatorType } from './domain';

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
