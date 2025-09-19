import type { PriceAlert } from "../types/domain";

const alerts: PriceAlert[] = [];

export const alertManager = {
  addAlert(alert: PriceAlert) {
    alerts.push(alert);
  },

  getAlerts(): PriceAlert[] {
    return [...alerts];
  },

  getActiveAlertsForSymbol(symbol: string): PriceAlert[] {
    const s = symbol.trim().toUpperCase();
    return alerts.filter((a) => a.symbol.toUpperCase() === s && a.status === 0);
  },

  getAlertById(id: string) {
    return alerts.find((a) => a.id === id) || null;
  },

  updateAlert(id: string, patch: Partial<PriceAlert>) {
    const idx = alerts.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    alerts[idx] = { ...alerts[idx], ...patch };
    return alerts[idx];
  },

  deleteAlert(id: string) {
    const idx = alerts.findIndex((a) => a.id === id);
    if (idx >= 0) {
      alerts.splice(idx, 1);
    }
  },

  clearAll() {
    alerts.splice(0, alerts.length);
  },
};

export default alertManager;
