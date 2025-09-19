import React from "react";
import { AlertSeverity, AlertCondition } from "../../types/domain";
import type { AlertNotification } from "../../types/domain";

interface AlertBannerProps {
  alerts: AlertNotification[];
  onDismiss: (alertId: string) => void;
  onMarkAsRead: (alertId: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onDismiss,
  onMarkAsRead,
}) => {
  // Don't render if no alerts
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Sort alerts by severity (Critical > Warning > Info)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = [
      AlertSeverity.Critical,
      AlertSeverity.Warning,
      AlertSeverity.Info,
    ];
    return (
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );
  });

  const getSeverityStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.Critical:
        return {
          container: "bg-red-50 border-red-200 text-red-800",
          icon: "text-red-600",
          button: "text-red-600 hover:text-red-800",
        };
      case AlertSeverity.Warning:
        return {
          container: "bg-yellow-50 border-yellow-200 text-yellow-800",
          icon: "text-yellow-600",
          button: "text-yellow-600 hover:text-yellow-800",
        };
      case AlertSeverity.Info:
      default:
        return {
          container: "bg-blue-50 border-blue-200 text-blue-800",
          icon: "text-blue-600",
          button: "text-blue-600 hover:text-blue-800",
        };
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.Critical:
        return (
          <svg
            data-testid="critical-icon"
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case AlertSeverity.Warning:
        return (
          <svg
            data-testid="warning-icon"
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case AlertSeverity.Info:
      default:
        return (
          <svg
            data-testid="info-icon"
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const formatValue = (condition: AlertCondition, value: number) => {
    switch (condition) {
      case AlertCondition.PriceAbove:
      case AlertCondition.PriceBelow:
        return `$${value.toLocaleString()}`;
      case AlertCondition.RSIAbove:
      case AlertCondition.RSIBelow:
        return value.toFixed(2);
      case AlertCondition.VolumeAbove:
        return value.toLocaleString();
      case AlertCondition.PriceChangeAbove:
      case AlertCondition.PriceChangeBelow:
        return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
      default:
        return value.toString();
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60)
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {sortedAlerts.map((alert) => {
        const styles = getSeverityStyles(alert.severity);

        return (
          <div
            key={alert.id}
            role="alert"
            className={`border rounded-lg p-4 shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl ${styles.container}`}
            onClick={() => onMarkAsRead(alert.id)}
          >
            <div className="flex items-start">
              <div className={`flex-shrink-0 mr-3 ${styles.icon}`}>
                {getSeverityIcon(alert.severity)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{alert.symbol}</span>
                  <span className="text-xs opacity-75">
                    {getRelativeTime(alert.triggeredAt)}
                  </span>
                </div>

                <p className="text-sm mb-2">{alert.message}</p>

                <div className="text-xs opacity-75">
                  Current: {formatValue(alert.condition, alert.currentValue)}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
                className={`flex-shrink-0 ml-2 ${styles.button}`}
                aria-label="Close alert"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
