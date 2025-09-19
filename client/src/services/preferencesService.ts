import type {
  UserPreferencesResponse,
  UserPreferencesRequest,
} from "../types/api";
import type { UserPreferences } from "../types/domain";
import { ChartType } from "../types/domain";
import { isDevelopment, showBackendUnavailableNotice } from "../utils/environment";

/**
 * Service for interacting with user preferences API endpoints
 */
class PreferencesService {
  private baseUrl = "/api/Preferences";
  private hasShownBackendNotice = false;

  /**
   * Get user preferences by user ID
   * @param userId The user ID
   * @returns Promise with the user preferences
   */
  public async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Return default preferences if user not found
          console.info(`No saved preferences found for user ${userId}. Loading defaults.`);
          return await this.getDefaultPreferences();
        }
        console.warn(`Error fetching user preferences (${response.status}): ${response.statusText}. Loading defaults.`);
        return await this.getDefaultPreferences();
      }
      const data: UserPreferencesResponse = await response.json();
      return this.convertResponseToDomain(data);
    } catch (error) {
      console.warn("Error fetching user preferences:", error instanceof Error ? error.message : error, ". Loading defaults.");
      // Fallback to default preferences (which will use hardcoded defaults if backend unavailable)
      return await this.getDefaultPreferences();
    }
  }

  /**
   * Save user preferences
   * @param userId The user ID
   * @param preferences The preferences to save
   * @returns Promise with the updated preferences
   */
  public async saveUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    try {
      const request: UserPreferencesRequest =
        this.convertDomainToRequest(preferences);

      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to save user preferences: ${response.statusText}`,
        );
      }

      const data: UserPreferencesResponse = await response.json();
      return this.convertResponseToDomain(data);
    } catch (error) {
      console.error("Error saving user preferences:", error);
      throw error;
    }
  }

  /**
   * Get default user preferences
   * @returns Promise with the default preferences
   */
  public async getDefaultPreferences(): Promise<UserPreferences> {
    try {
      const response = await fetch(`${this.baseUrl}/default`);
      if (!response.ok) {
        console.warn(`Backend preferences service unavailable (${response.status}): ${response.statusText}. Using client-side defaults.`);
        return this.getHardcodedDefaults();
      }
      const data: UserPreferencesResponse = await response.json();
      return this.convertResponseToDomain(data);
    } catch (error) {
      console.warn("Backend preferences service unavailable:", error instanceof Error ? error.message : error, ". Using client-side defaults.");
      
      // Show helpful notice in development mode (only once)
      if (isDevelopment() && !this.hasShownBackendNotice) {
        showBackendUnavailableNotice();
        this.hasShownBackendNotice = true;
      }
      
      // Return hardcoded defaults as fallback
      return this.getHardcodedDefaults();
    }
  }

  /**
   * Convert API response to domain model
   */
  private convertResponseToDomain(
    response: UserPreferencesResponse,
  ): UserPreferences {
    return {
      userId: response.userId,
      chart: response.chart,
      indicators: response.indicators,
      favoritePairs: response.favoritePairs,
      ui: response.ui,
      lastUpdated: response.lastUpdated,
    };
  }

  /**
   * Convert domain model to API request
   */
  private convertDomainToRequest(
    preferences: Partial<UserPreferences>,
  ): UserPreferencesRequest {
    const request: UserPreferencesRequest = {};

    if (preferences.chart) {
      request.chart = {
        type: preferences.chart.type,
        timeFrame: preferences.chart.timeFrame,
        showVolume: preferences.chart.showVolume,
        showGrid: preferences.chart.showGrid,
        colorScheme: preferences.chart.colorScheme,
      };
    }

    if (preferences.indicators) {
      request.indicators = preferences.indicators.map((indicator) => ({
        type: indicator.type,
        period: indicator.period,
        isVisible: indicator.isVisible,
        color: indicator.color,
        parameters: indicator.parameters,
      }));
    }

    if (preferences.favoritePairs) {
      request.favoritePairs = preferences.favoritePairs;
    }

    if (preferences.ui) {
      request.ui = {
        darkMode: preferences.ui.darkMode,
        language: preferences.ui.language,
        showAdvancedFeatures: preferences.ui.showAdvancedFeatures,
        refreshInterval: preferences.ui.refreshInterval,
      };
    }

    return request;
  }

  /**
   * Get hardcoded default preferences as ultimate fallback
   */
  private getHardcodedDefaults(): UserPreferences {
    return {
      userId: "guest",
      chart: {
        type: "line" as ChartType,
        timeFrame: "1h",
        showVolume: true,
        showGrid: true,
        colorScheme: "default",
      },
      indicators: [],
      favoritePairs: ["BTC-USD", "ETH-USD", "ADA-USD", "SOL-USD"],
      ui: {
        darkMode: false,
        language: "en",
        showAdvancedFeatures: true, // Enable Elliott Wave features by default
        refreshInterval: 5000,
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Create a singleton instance
export const preferencesService = new PreferencesService();
export default preferencesService;
