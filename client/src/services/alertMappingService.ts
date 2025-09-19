import type { AlertResponse, CreateAlertRequest, UpdateAlertRequest } from "../types/api";
import type { PriceAlert, IndicatorAlert } from "../types/domain";
import { AlertCondition, AlertSeverity, AlertStatus } from "../types/domain";

/**
 * Service for mapping between frontend domain models and backend API models
 */
export class AlertMappingService {
  /**
   * Convert backend AlertResponse to frontend PriceAlert or IndicatorAlert
   */
  public apiToFrontend(apiAlert: AlertResponse): PriceAlert | IndicatorAlert {
    // Determine if this is an indicator alert based on the presence of indicator fields
    const isIndicatorAlert = false; // For now, we'll just create price alerts
    
    const baseAlert = {
      id: apiAlert.id,
      symbol: apiAlert.symbol,
      condition: this.mapConditionFromApi(apiAlert.condition),
      targetValue: apiAlert.threshold,
      message: apiAlert.message,
      severity: AlertSeverity.Info, // Default severity for now
      status: this.mapStatusFromApi(apiAlert.isActive, apiAlert.isTriggered),
      createdAt: apiAlert.createdAt,
      cooldownSeconds: apiAlert.cooldownSeconds,
    };

    if (isIndicatorAlert) {
      // For future indicator alert support
      return {
        ...baseAlert,
        indicatorType: 0, // placeholder
        period: 14, // placeholder
      } as IndicatorAlert;
    }

    return baseAlert as PriceAlert;
  }

  /**
   * Convert frontend PriceAlert to backend CreateAlertRequest
   */
  public frontendToCreateRequest(
    frontendAlert: PriceAlert | IndicatorAlert,
    userId: string
  ): CreateAlertRequest {
    return {
      userId,
      symbol: frontendAlert.symbol,
      threshold: frontendAlert.targetValue,
      condition: this.mapConditionToApi(frontendAlert.condition),
      title: frontendAlert.symbol + " Alert", // Generate title from symbol
      message: frontendAlert.message,
      cooldownSeconds: frontendAlert.cooldownSeconds,
    };
  }

  /**
   * Convert frontend PriceAlert to backend UpdateAlertRequest
   */
  public frontendToUpdateRequest(
    frontendAlert: PriceAlert | IndicatorAlert
  ): UpdateAlertRequest {
    return {
      threshold: frontendAlert.targetValue,
      condition: this.mapConditionToApi(frontendAlert.condition),
      title: frontendAlert.symbol + " Alert",
      message: frontendAlert.message,
      isActive: frontendAlert.status === AlertStatus.Active,
      cooldownSeconds: frontendAlert.cooldownSeconds,
    };
  }

  /**
   * Map frontend AlertCondition to backend condition string
   */
  private mapConditionToApi(condition: AlertCondition): "Above" | "Below" {
    switch (condition) {
      case AlertCondition.PriceAbove:
      case AlertCondition.RSIAbove:
        return "Above";
      case AlertCondition.PriceBelow:
      case AlertCondition.RSIBelow:
        return "Below";
      default:
        return "Above";
    }
  }

  /**
   * Map backend condition string to frontend AlertCondition
   */
  private mapConditionFromApi(condition: "Above" | "Below"): AlertCondition {
    switch (condition) {
      case "Above":
        return AlertCondition.PriceAbove;
      case "Below":
        return AlertCondition.PriceBelow;
      default:
        return AlertCondition.PriceAbove;
    }
  }

  /**
   * Map backend isActive/isTriggered to frontend AlertStatus
   */
  private mapStatusFromApi(isActive: boolean, isTriggered: boolean): AlertStatus {
    if (isTriggered) {
      return AlertStatus.Triggered;
    }
    if (isActive) {
      return AlertStatus.Active;
    }
    return AlertStatus.Inactive;
  }
}

// Create singleton instance
export const alertMappingService = new AlertMappingService();
export default alertMappingService;