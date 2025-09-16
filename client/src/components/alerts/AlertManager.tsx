import React, { useState } from "react";
import { alertManager } from "../../services/alertManagerService";
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
  const [alerts, setAlerts] = useState<(PriceAlert | IndicatorAlert)[]>(alertManager.getAlerts());
  const [editingId, setEditingId] = useState<string | null>(null);

  // derived form validity
  const isIndicatorCondition =
    condition === AlertCondition.RSIAbove || condition === AlertCondition.RSIBelow;

  const canCreate =
    symbol.trim() !== "" &&
    targetValue !== "" &&
    (!isIndicatorCondition || (period > 0 && indicatorType !== undefined));

  const createAlert = () => {
    if (!canCreate) return;

    const base = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol: symbol.toUpperCase(),
      condition,
      targetValue: Number(targetValue),
      message: message || `${symbol} alert`,
      severity,
      status: AlertStatus.Active,
      createdAt: new Date().toISOString(),
  } as PriceAlert;

  let newAlert: PriceAlert | IndicatorAlert = base;
    if (isIndicatorCondition) {
      newAlert = {
        ...base,
        indicatorType,
        period,
      } as IndicatorAlert;
    }

    alertManager.addAlert(newAlert);
    setAlerts(alertManager.getAlerts());
    setSymbol("");
    setTargetValue("");
    setMessage("");
    setPeriod(14);
  };

  const deleteAlert = (id: string) => {
    alertManager.deleteAlert(id);
    setAlerts(alertManager.getAlerts());
  };

  const startEdit = (id: string) => {
    const a = alertManager.getAlertById(id);
    if (!a) return;
    setEditingId(id);
    setSymbol(a.symbol);
    setCondition(a.condition);
    setTargetValue(a.targetValue);
    setMessage(a.message || "");
    setSeverity(a.severity);
    if ((a as unknown as IndicatorAlert).indicatorType !== undefined) {
      const ia = a as unknown as IndicatorAlert;
      setIndicatorType(ia.indicatorType);
      setPeriod(ia.period || 14);
    } else {
      setIndicatorType(IndicatorType.RelativeStrengthIndex);
      setPeriod(14);
    }
  };

  const saveEdit = () => {
    if (!editingId) return;
    const patch: Partial<PriceAlert & IndicatorAlert> = {
      symbol: symbol.toUpperCase(),
      condition,
      targetValue: Number(targetValue),
      message,
      severity,
    };

    if (isIndicatorCondition) {
      (patch as Partial<IndicatorAlert>).indicatorType = indicatorType;
      (patch as Partial<IndicatorAlert>).period = period;
    }

    alertManager.updateAlert(editingId, patch);
    setAlerts(alertManager.getAlerts());
    setEditingId(null);
    setSymbol("");
    setTargetValue("");
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSymbol("");
    setTargetValue("");
    setMessage("");
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Alert Management</h3>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <label>
          Symbol
          <input aria-label="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        </label>

        <label>
          Condition
          <select aria-label="condition" value={condition} onChange={(e) => setCondition(Number(e.target.value))}>
            <option value={AlertCondition.PriceAbove}>Price Above</option>
            <option value={AlertCondition.PriceBelow}>Price Below</option>
            <option value={AlertCondition.RSIAbove}>RSI Above</option>
            <option value={AlertCondition.RSIBelow}>RSI Below</option>
          </select>
        </label>

        <label>
          Target Value
          <input aria-label="target value" value={String(targetValue)} onChange={(e) => setTargetValue(e.target.value === "" ? "" : Number(e.target.value))} />
        </label>

        {isIndicatorCondition && (
          <>
            <label>
              Indicator
              <select aria-label="indicator type" value={indicatorType} onChange={(e) => setIndicatorType(Number(e.target.value))}>
                <option value={IndicatorType.RelativeStrengthIndex}>RSI</option>
                <option value={IndicatorType.SimpleMovingAverage}>SMA</option>
                <option value={IndicatorType.ExponentialMovingAverage}>EMA</option>
              </select>
            </label>

            <label>
              Period
              <input aria-label="period" type="number" value={period} onChange={(e) => setPeriod(Math.max(1, Number(e.target.value)))} />
            </label>
          </>
        )}

        <label>
          Severity
          <select aria-label="severity" value={severity} onChange={(e) => setSeverity(Number(e.target.value))}>
            <option value={AlertSeverity.Info}>Info</option>
            <option value={AlertSeverity.Warning}>Warning</option>
            <option value={AlertSeverity.Critical}>Critical</option>
          </select>
        </label>

        <label className="col-span-2">
          Message
          <input aria-label="message" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
      </div>

      <button onClick={createAlert} className="btn" aria-label="create alert" disabled={!canCreate}>Create Alert</button>
      {editingId && (
        <div className="mt-2">
          <button onClick={saveEdit} aria-label="save" className="btn">Save</button>
          <button onClick={cancelEdit} aria-label="cancel" className="btn ml-2">Cancel</button>
        </div>
      )}

      <div className="mt-4">
        <h4 className="font-medium">Active Alerts</h4>
        <ul>
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <div>
                <span className="font-medium">{a.symbol}</span>
                <div className="text-sm opacity-80">{a.message}</div>
                {/* Show indicator details when present */}
                {((a as unknown) as IndicatorAlert).indicatorType !== undefined && (
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const ia = a as IndicatorAlert;
                      return `Indicator: ${IndicatorType[ia.indicatorType]} | Period: ${ia.period} | Target: ${ia.targetValue}`;
                    })()}
                  </div>
                )}
              </div>
              <div>
                <button aria-label="edit alert" onClick={() => startEdit(a.id)}>Edit</button>
                <button aria-label="delete alert" onClick={() => deleteAlert(a.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AlertManager;
