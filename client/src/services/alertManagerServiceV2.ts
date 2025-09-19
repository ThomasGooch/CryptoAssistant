import type { PriceAlert, IndicatorAlert } from "../types/domain";
import { alertApiService } from "./alertApiService";
import { alertMappingService } from "./alertMappingService";
import { AlertStatus } from "../types/domain";

/**
 * Enhanced Alert Manager Service with backend integration
 * This replaces the in-memory alertManagerService with persistent storage
 */
class AlertManagerServiceV2 {
  private currentUserId: string = "default-user"; // TODO: Replace with actual user authentication

  /**
   * Get all alerts for the current user
   */
  public async getAlerts(): Promise<(PriceAlert | IndicatorAlert)[]> {
    try {
      const apiAlerts = await alertApiService.getUserAlerts(this.currentUserId);
      return apiAlerts.map(apiAlert => alertMappingService.apiToFrontend(apiAlert));
    } catch (error) {
      console.error("Error fetching alerts:", error);
      // Return empty array on error to prevent UI crashes
      return [];
    }
  }

  /**
   * Get only active alerts for the current user
   */
  public async getActiveAlerts(): Promise<(PriceAlert | IndicatorAlert)[]> {
    try {
      const apiAlerts = await alertApiService.getUserAlerts(this.currentUserId, true, false);
      return apiAlerts.map(apiAlert => alertMappingService.apiToFrontend(apiAlert));
    } catch (error) {
      console.error("Error fetching active alerts:", error);
      return [];
    }
  }

  /**
   * Create a new alert
   */
  public async addAlert(alert: Omit<PriceAlert | IndicatorAlert, "id">): Promise<PriceAlert | IndicatorAlert> {
    try {
      const alertWithId = {
        ...alert,
        id: crypto.randomUUID(), // Temporary ID - backend will provide the real one
      } as PriceAlert | IndicatorAlert;

      const createRequest = alertMappingService.frontendToCreateRequest(alertWithId, this.currentUserId);
      const apiResponse = await alertApiService.createAlert(createRequest);
      
      return alertMappingService.apiToFrontend(apiResponse);
    } catch (error) {
      console.error("Error creating alert:", error);
      throw error; // Re-throw so UI can handle the error
    }
  }

  /**
   * Update an existing alert
   */
  public async updateAlert(alertId: string, updates: Partial<PriceAlert | IndicatorAlert>): Promise<PriceAlert | IndicatorAlert> {
    try {
      // First get the current alert to merge updates
      const currentAlerts = await this.getAlerts();
      const currentAlert = currentAlerts.find(a => a.id === alertId);
      
      if (!currentAlert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      const updatedAlert = { ...currentAlert, ...updates };
      const updateRequest = alertMappingService.frontendToUpdateRequest(updatedAlert);
      
      const apiResponse = await alertApiService.updateAlert(alertId, updateRequest);
      return alertMappingService.apiToFrontend(apiResponse);
    } catch (error) {
      console.error("Error updating alert:", error);
      throw error;
    }
  }

  /**
   * Delete an alert
   */
  public async removeAlert(alertId: string): Promise<void> {
    try {
      await alertApiService.deleteAlert(alertId);
    } catch (error) {
      console.error("Error deleting alert:", error);
      throw error;
    }
  }

  /**
   * Toggle alert active status
   */
  public async toggleAlert(alertId: string): Promise<PriceAlert | IndicatorAlert> {
    try {
      const currentAlerts = await this.getAlerts();
      const alert = currentAlerts.find(a => a.id === alertId);
      
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      const newStatus = alert.status === AlertStatus.Active ? AlertStatus.Inactive : AlertStatus.Active;
      return await this.updateAlert(alertId, { status: newStatus });
    } catch (error) {
      console.error("Error toggling alert:", error);
      throw error;
    }
  }

  /**
   * Set the current user ID (for when authentication is implemented)
   */
  public setUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Get the current user ID
   */
  public getUserId(): string {
    return this.currentUserId;
  }

  /**
   * Clear all alerts for the current user (for testing/development)
   */
  public async clearAllAlerts(): Promise<void> {
    try {
      const alerts = await this.getAlerts();
      await Promise.all(alerts.map(alert => this.removeAlert(alert.id)));
    } catch (error) {
      console.error("Error clearing alerts:", error);
      throw error;
    }
  }
}

// Create singleton instance
export const alertManagerServiceV2 = new AlertManagerServiceV2();
export default alertManagerServiceV2;