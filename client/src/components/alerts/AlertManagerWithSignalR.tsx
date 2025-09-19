import React, { useState, useEffect } from "react";
import { alertManagerServiceV2 } from "../../services/alertManagerServiceV2";
import { useSignalRAlerts } from "../../hooks/useSignalRAlerts";
import {
  AlertCondition,
  AlertSeverity,
  AlertStatus,
  IndicatorType,
} from "../../types/domain";
import type { PriceAlert, IndicatorAlert, SignalRAlertNotification } from "../../types/domain";

export const AlertManagerWithSignalR: React.FC = () => {
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState<AlertCondition>(
    AlertCondition.PriceAbove,
  );
  const [targetValue, setTargetValue] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>(AlertSeverity.Info);
  const [indicatorType, setIndicatorType] = useState<IndicatorType>(
    IndicatorType.RelativeStrengthIndex,
  );
  const [period, setPeriod] = useState<number>(14);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(30);
  const [alerts, setAlerts] = useState<(PriceAlert | IndicatorAlert)[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user ID and initialize SignalR alerts
  const currentUserId = alertManagerServiceV2.getUserId();
  const { isConnected, error: signalRError, notifications, clearNotifications } = 
    useSignalRAlerts(currentUserId);

  // Load alerts from backend on component mount
  useEffect(() => {
    loadAlerts();
  }, []);

  // Reload alerts when notifications change (alert triggered)
  useEffect(() => {
    if (notifications.length > 0) {
      loadAlerts();
    }
  }, [notifications.length]);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedAlerts = await alertManagerServiceV2.getAlerts();
      setAlerts(fetchedAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
      console.error("Error loading alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // derived form validity
  const isIndicatorCondition =
    condition === AlertCondition.RSIAbove ||
    condition === AlertCondition.RSIBelow;

  const isFormValid =
    symbol.trim() !== "" && targetValue !== "" && targetValue > 0;

  const resetFormToDefaults = () => {
    setEditingId(null);
    setSymbol("");
    setTargetValue("");
    setMessage("");
    setCooldownSeconds(30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    try {
      setError(null);
      
      const newAlert = {
        symbol: symbol.trim(),
        condition,
        targetValue: Number(targetValue),
        message,
        severity,
        status: AlertStatus.Active,
        createdAt: new Date().toISOString(),
        cooldownSeconds,
        ...(isIndicatorCondition && {
          indicatorType,
          period,
        }),
      };

      if (editingId) {
        await alertManagerServiceV2.updateAlert(editingId, newAlert);
      } else {
        await alertManagerServiceV2.addAlert(newAlert);
      }

      await loadAlerts();
      resetFormToDefaults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
      console.error("Error with alert operation:", err);
    }
  };

  const handleEdit = (alert: PriceAlert | IndicatorAlert) => {
    setEditingId(alert.id);
    setSymbol(alert.symbol);
    setCondition(alert.condition);
    setTargetValue(alert.targetValue);
    setMessage(alert.message || "");
    setSeverity(alert.severity);
    setCooldownSeconds(alert.cooldownSeconds || 30);
    if ((alert as unknown as IndicatorAlert).indicatorType !== undefined) {
      setIndicatorType((alert as unknown as IndicatorAlert).indicatorType);
      setPeriod((alert as unknown as IndicatorAlert).period);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      setError(null);
      await alertManagerServiceV2.removeAlert(alertId);
      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert");
      console.error("Error deleting alert:", err);
    }
  };

  const formatTriggerTime = (triggerTime: string) => {
    return new Date(triggerTime).toLocaleString();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* SignalR Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Real-time Alerts
          </h3>
          <div className="flex items-center space-x-2">
            <span 
              className={`inline-block w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={`text-sm font-medium ${
              isConnected 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {isConnected ? 'Connected' : signalRError ? 'Disconnected' : 'Connecting...'}
            </span>
          </div>
        </div>
        
        {signalRError && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Error: {signalRError.message}
          </div>
        )}
      </div>

      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 flex items-center">
              🔔 Alert Notifications ({notifications.length} notifications)
            </h3>
            <button
              onClick={clearNotifications}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Clear Notifications
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <div
                key={`${notification.AlertId}-${index}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        {notification.Symbol}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        notification.Condition === 'Above' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {notification.Condition} {formatPrice(notification.Threshold)}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                      {notification.Message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Triggered at: {formatPrice(notification.TriggerPrice)}</span>
                      <span>Time: {formatTriggerTime(notification.TriggerTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Creation Form */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
          <span className="mr-2">🔔</span>
          {editingId ? "Edit Alert" : "Create New Alert"}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Symbol Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Symbol
              </label>
              <input
                aria-label="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
                placeholder="e.g., BTC"
              />
            </div>

            {/* Condition Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Condition
              </label>
              <select
                aria-label="condition"
                value={condition}
                onChange={(e) => setCondition(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value={AlertCondition.PriceAbove}>Price Above</option>
                <option value={AlertCondition.PriceBelow}>Price Below</option>
                <option value={AlertCondition.RSIAbove}>RSI Above</option>
                <option value={AlertCondition.RSIBelow}>RSI Below</option>
              </select>
            </div>

            {/* Target Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Value
              </label>
              <input
                aria-label="target value"
                type="number"
                step="0.01"
                value={String(targetValue)}
                onChange={(e) =>
                  setTargetValue(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
                placeholder="0.00"
              />
            </div>

            {/* Indicator-specific fields */}
            {isIndicatorCondition && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Indicator Type
                  </label>
                  <select
                    aria-label="indicator type"
                    value={indicatorType}
                    onChange={(e) => setIndicatorType(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value={IndicatorType.RelativeStrengthIndex}>RSI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Period
                  </label>
                  <input
                    aria-label="period"
                    type="number"
                    min="1"
                    max="100"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              </>
            )}

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity
              </label>
              <select
                aria-label="severity"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value={AlertSeverity.Info}>ℹ️ Info</option>
                <option value={AlertSeverity.Warning}>⚠️ Warning</option>
                <option value={AlertSeverity.Critical}>🚨 Critical</option>
              </select>
            </div>

            {/* Cooldown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cooldown Seconds
              </label>
              <input
                aria-label="cooldown seconds"
                type="number"
                min="0"
                value={cooldownSeconds}
                onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Message */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <input
                aria-label="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Optional custom message"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading 
                ? "Processing..." 
                : editingId 
                ? "Update Alert" 
                : "Create Alert"
              }
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetFormToDefaults}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 px-4 py-2 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Alerts List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Your Alerts ({alerts.length})
        </h3>

        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading alerts...</p>
          </div>
        )}

        {!isLoading && alerts.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No alerts created yet. Create your first alert above.
          </p>
        )}

        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {alert.symbol}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    alert.condition === AlertCondition.PriceAbove || alert.condition === AlertCondition.RSIAbove
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}>
                    {alert.condition === AlertCondition.PriceAbove && "Above"}
                    {alert.condition === AlertCondition.PriceBelow && "Below"}
                    {alert.condition === AlertCondition.RSIAbove && "RSI Above"}
                    {alert.condition === AlertCondition.RSIBelow && "RSI Below"}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(alert)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors"
                    aria-label="Edit alert"
                  >
                    <span className="text-sm">✏️</span>
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                    aria-label="Delete alert"
                  >
                    <span className="text-sm">🗑️</span>
                  </button>
                </div>
              </div>

              <div className="mb-6 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed italic font-medium">
                  "{alert.message || `${alert.symbol} alert`}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-semibold">Target Value</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                    ${alert.targetValue}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Trigger when {alert.condition === AlertCondition.PriceAbove || alert.condition === AlertCondition.RSIAbove ? "above" : "below"}
                  </div>
                </div>

                <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl shadow-sm border-2 border-blue-300 dark:border-blue-600 hover:shadow-md transition-all md:col-span-2 lg:col-span-1">
                  <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 font-semibold flex items-center justify-center">
                    <span className="mr-1">⏱️</span>
                    Cooldown
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">
                    {alert.cooldownSeconds}s
                  </div>
                  <div className="text-xs text-blue-500 dark:text-blue-400">Between notifications</div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Active & Monitoring
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Created: {new Date(alert.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};