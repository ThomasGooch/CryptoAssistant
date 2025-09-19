import React, { useState, useEffect } from "react";
import { alertManagerServiceV2 } from "../../services/alertManagerServiceV2";
import {
  AlertCondition,
  AlertSeverity,
  AlertStatus,
  IndicatorType,
} from "../../types/domain";
import type { PriceAlert, IndicatorAlert } from "../../types/domain";

export const AlertManager: React.FC = () => {
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

  // Load alerts from backend on component mount
  useEffect(() => {
    loadAlerts();
  }, []);

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

  const canCreate =
    symbol.trim() !== "" &&
    targetValue !== "" &&
    (!isIndicatorCondition || (period > 0 && indicatorType !== undefined));

  const createAlert = async () => {
    if (!canCreate) return;

    try {
      setIsLoading(true);
      setError(null);

      const base = {
        symbol: symbol.toUpperCase(),
        condition,
        targetValue: Number(targetValue),
        message: message || `${symbol} alert`,
        severity,
        status: AlertStatus.Active,
        createdAt: new Date().toISOString(),
        cooldownSeconds,
      } as Omit<PriceAlert, "id">;

      let newAlert: Omit<PriceAlert | IndicatorAlert, "id"> = base;
      if (isIndicatorCondition) {
        newAlert = {
          ...base,
          indicatorType,
          period,
        } as Omit<IndicatorAlert, "id">;
      }

      await alertManagerServiceV2.addAlert(newAlert);
      await loadAlerts(); // Refresh the list
      
      // Clear form
      setSymbol("");
      setTargetValue("");
      setMessage("");
      setPeriod(14);
      setCooldownSeconds(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alert");
      console.error("Error creating alert:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await alertManagerServiceV2.removeAlert(id);
      await loadAlerts(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert");
      console.error("Error deleting alert:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (id: string) => {
    const a = alerts.find(alert => alert.id === id);
    if (!a) return;
    setEditingId(id);
    setSymbol(a.symbol);
    setCondition(a.condition);
    setTargetValue(a.targetValue);
    setMessage(a.message || "");
    setSeverity(a.severity);
    setCooldownSeconds(a.cooldownSeconds || 30);
    if ((a as unknown as IndicatorAlert).indicatorType !== undefined) {
      const ia = a as unknown as IndicatorAlert;
      setIndicatorType(ia.indicatorType);
      setPeriod(ia.period || 14);
    } else {
      setIndicatorType(IndicatorType.RelativeStrengthIndex);
      setPeriod(14);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const patch: Partial<PriceAlert & IndicatorAlert> = {
        symbol: symbol.toUpperCase(),
        condition,
        targetValue: Number(targetValue),
        message,
        severity,
        cooldownSeconds,
      };

      if (isIndicatorCondition) {
        (patch as Partial<IndicatorAlert>).indicatorType = indicatorType;
        (patch as Partial<IndicatorAlert>).period = period;
      }

      await alertManagerServiceV2.updateAlert(editingId, patch);
      await loadAlerts(); // Refresh the list
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alert");
      console.error("Error updating alert:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSymbol("");
    setTargetValue("");
    setMessage("");
    setCooldownSeconds(30);
  };

  return (
    <div className="space-y-6">
      {/* Create Alert Form */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
          <span className="mr-2">🔔</span>
          {editingId ? "Edit Alert" : "Create New Alert"}
        </h3>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

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
                  <option value={IndicatorType.RelativeStrengthIndex}>
                    RSI
                  </option>
                  <option value={IndicatorType.SimpleMovingAverage}>SMA</option>
                  <option value={IndicatorType.ExponentialMovingAverage}>
                    EMA
                  </option>
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
                  value={period}
                  onChange={(e) =>
                    setPeriod(Math.max(1, Number(e.target.value)))
                  }
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

          {/* Cooldown - Highlighted as the new feature */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <span className="mr-1">⏱️</span>
              Cooldown (seconds)
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                NEW
              </span>
            </label>
            <input
              aria-label="cooldown seconds"
              type="number"
              min="0"
              value={cooldownSeconds}
              onChange={(e) =>
                setCooldownSeconds(Math.max(0, Number(e.target.value)))
              }
              className="w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
              placeholder="30"
            />
            <p className="mt-1 text-xs text-gray-500">
              Time between alert notifications
            </p>
          </div>

          {/* Message */}
          <div className="md:col-span-2">
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

        {/* Action Buttons */}
        <div className="flex justify-end mt-6 space-x-3">
          {editingId && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={editingId ? saveEdit : createAlert}
            disabled={!canCreate || isLoading}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              canCreate && !isLoading
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {editingId ? "Updating..." : "Creating..."}
              </span>
            ) : (
              editingId ? "✓ Update Alert" : "+ Create Alert"
            )}
          </button>
        </div>
      </div>

      {/* Active Alerts List */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
          <span className="mr-2">📋</span>
          Active Alerts ({alerts.length})
        </h4>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">⏳</div>
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No alerts created yet. Create your first alert above!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {alerts.map((a) => {
              const isIndicator =
                (a as unknown as IndicatorAlert).indicatorType !== undefined;
              const indicator = isIndicator ? (a as IndicatorAlert) : null;

              const severityColors = {
                [AlertSeverity.Info]:
                  "border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-600",
                [AlertSeverity.Warning]:
                  "border-yellow-300 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:border-yellow-600",
                [AlertSeverity.Critical]:
                  "border-red-300 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 dark:border-red-600",
              };

              const severityIcons = {
                [AlertSeverity.Info]: "ℹ️",
                [AlertSeverity.Warning]: "⚠️",
                [AlertSeverity.Critical]: "🚨",
              };

              return (
                <div
                  key={a.id}
                  className={`p-8 rounded-2xl border-2 ${severityColors[a.severity]} shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform`}
                >
                  {/* Header with symbol, severity, and actions */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-600">
                        {a.symbol}
                      </div>
                      <div
                        className="text-3xl drop-shadow-sm"
                        title={`${AlertSeverity[a.severity]} Alert`}
                      >
                        {severityIcons[a.severity]}
                      </div>
                      <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold border border-gray-300 dark:border-gray-600">
                        {AlertCondition[a.condition]
                          .replace(/([A-Z])/g, " $1")
                          .trim()}
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => startEdit(a.id)}
                        className="p-4 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-all hover:scale-110 shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                        title="Edit Alert"
                        aria-label="Edit Alert"
                      >
                        <span className="text-xl">✏️</span>
                      </button>
                      <button
                        onClick={() => deleteAlert(a.id)}
                        className="p-4 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-all hover:scale-110 shadow-sm hover:shadow-md border border-transparent hover:border-red-200"
                        title="Delete Alert"
                        aria-label="Delete Alert"
                      >
                        <span className="text-xl">🗑️</span>
                      </button>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-6 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed italic font-medium">
                      "{a.message || `${a.symbol} alert`}"
                    </p>
                  </div>

                  {/* Alert Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {/* Target Value */}
                    <div className="text-center p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-semibold">
                        Target Value
                      </div>
                      <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                        ${a.targetValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {AlertCondition[a.condition].includes("Above")
                          ? "Trigger when above"
                          : "Trigger when below"}
                      </div>
                    </div>

                    {/* Indicator Details (if applicable) */}
                    {indicator && (
                      <>
                        <div className="text-center p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-semibold">
                            Indicator
                          </div>
                          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                            {IndicatorType[indicator.indicatorType]}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Technical indicator
                          </div>
                        </div>
                        <div className="text-center p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-semibold">
                            Period
                          </div>
                          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                            {indicator.period}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Time periods
                          </div>
                        </div>
                      </>
                    )}

                    {/* Cooldown - Highlighted */}
                    <div
                      className={`text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl shadow-sm border-2 border-blue-300 dark:border-blue-600 hover:shadow-md transition-all ${!indicator ? "md:col-span-2 lg:col-span-1" : ""}`}
                    >
                      <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 font-semibold flex items-center justify-center">
                        <span className="mr-1">⏱️</span>
                        Cooldown
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">
                        {a.cooldownSeconds || 30}s
                      </div>
                      <div className="text-xs text-blue-500 dark:text-blue-400">
                        Between notifications
                      </div>
                    </div>
                  </div>

                  {/* Status and Timestamps */}
                  <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          Active & Monitoring
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Created:{" "}
                        {new Date(a.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertManager;
