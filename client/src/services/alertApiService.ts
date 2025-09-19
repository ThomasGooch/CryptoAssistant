import type {
  AlertResponse,
  CreateAlertRequest,
  UpdateAlertRequest,
} from "../types/api";

/**
 * Service for interacting with the Alert API endpoints
 */
class AlertApiService {
  private baseUrl = "/api/alerts";

  /**
   * Get all alerts for a user
   * @param userId The user ID
   * @param onlyActive Filter to only active alerts
   * @param onlyTriggered Filter to only triggered alerts
   * @returns Promise with user's alerts
   */
  public async getUserAlerts(
    userId: string,
    onlyActive?: boolean,
    onlyTriggered?: boolean
  ): Promise<AlertResponse[]> {
    try {
      let url = `${this.baseUrl}/${userId}`;
      
      // Add query parameters if provided
      const params = new URLSearchParams();
      if (onlyActive !== undefined) {
        params.append("onlyActive", String(onlyActive));
      }
      if (onlyTriggered !== undefined) {
        params.append("onlyTriggered", String(onlyTriggered));
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch user alerts: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching user alerts:", error);
      throw error;
    }
  }

  /**
   * Create a new alert
   * @param createRequest The alert creation request
   * @returns Promise with the created alert
   */
  public async createAlert(
    createRequest: CreateAlertRequest
  ): Promise<AlertResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to create alert: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating alert:", error);
      throw error;
    }
  }

  /**
   * Update an existing alert
   * @param alertId The alert ID to update
   * @param updateRequest The alert update request
   * @returns Promise with the updated alert
   */
  public async updateAlert(
    alertId: string,
    updateRequest: UpdateAlertRequest
  ): Promise<AlertResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${alertId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to update alert: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating alert:", error);
      throw error;
    }
  }

  /**
   * Delete an alert
   * @param alertId The alert ID to delete
   * @returns Promise that resolves when the alert is deleted
   */
  public async deleteAlert(alertId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${alertId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete alert: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
      throw error;
    }
  }
}

// Create a singleton instance
export const alertApiService = new AlertApiService();
export default alertApiService;