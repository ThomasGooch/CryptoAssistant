import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlertBanner } from "../AlertBanner";
import {
  AlertNotification,
  AlertSeverity,
  AlertCondition,
} from "../../../types/domain";

describe("AlertBanner", () => {
  const mockOnDismiss = vi.fn();
  const mockOnMarkAsRead = vi.fn();

  const mockInfoAlert: AlertNotification = {
    id: "alert-1",
    alertId: "price-alert-1",
    symbol: "BTC",
    message: "Bitcoin price reached $50,000",
    severity: AlertSeverity.Info,
    triggeredAt: "2025-01-15T12:00:00.000Z",
    currentValue: 50000,
    targetValue: 50000,
    condition: AlertCondition.PriceAbove,
    isRead: false,
  };

  const mockWarningAlert: AlertNotification = {
    id: "alert-2",
    alertId: "rsi-alert-1",
    symbol: "ETH",
    message: "Ethereum RSI indicates overbought conditions",
    severity: AlertSeverity.Warning,
    triggeredAt: "2025-01-15T12:00:00.000Z",
    currentValue: 75,
    targetValue: 70,
    condition: AlertCondition.RSIAbove,
    isRead: false,
  };

  const mockCriticalAlert: AlertNotification = {
    id: "alert-3",
    alertId: "price-alert-2",
    symbol: "BTC",
    message: "Bitcoin price dropped below stop-loss level",
    severity: AlertSeverity.Critical,
    triggeredAt: "2025-01-15T12:00:00.000Z",
    currentValue: 40000,
    targetValue: 42000,
    condition: AlertCondition.PriceBelow,
    isRead: false,
  };

  beforeEach(() => {
    mockOnDismiss.mockClear();
    mockOnMarkAsRead.mockClear();
  });

  describe("rendering", () => {
    it("should not render when no alerts are provided", () => {
      render(
        <AlertBanner
          alerts={[]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should render info alert with correct styling", () => {
      render(
        <AlertBanner
          alerts={[mockInfoAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const alertElement = screen.getByRole("alert");
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveClass("bg-blue-50", "border-blue-200");
      expect(screen.getByText("Bitcoin price reached $50,000")).toBeInTheDocument();
      expect(screen.getByText("BTC")).toBeInTheDocument();
      expect(screen.getByText("Current: $50,000")).toBeInTheDocument();
    });

    it("should render warning alert with correct styling", () => {
      render(
        <AlertBanner
          alerts={[mockWarningAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const alertElement = screen.getByRole("alert");
      expect(alertElement).toHaveClass("bg-yellow-50", "border-yellow-200");
      expect(
        screen.getByText("Ethereum RSI indicates overbought conditions"),
      ).toBeInTheDocument();
      expect(screen.getByText("ETH")).toBeInTheDocument();
      expect(screen.getByText("Current: 75.00")).toBeInTheDocument();
    });

    it("should render critical alert with correct styling", () => {
      render(
        <AlertBanner
          alerts={[mockCriticalAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const alertElement = screen.getByRole("alert");
      expect(alertElement).toHaveClass("bg-red-50", "border-red-200");
      expect(
        screen.getByText("Bitcoin price dropped below stop-loss level"),
      ).toBeInTheDocument();
    });

    it("should render multiple alerts", () => {
      render(
        <AlertBanner
          alerts={[mockInfoAlert, mockWarningAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const alertElements = screen.getAllByRole("alert");
      expect(alertElements).toHaveLength(2);
      expect(screen.getByText("Bitcoin price reached $50,000")).toBeInTheDocument();
      expect(
        screen.getByText("Ethereum RSI indicates overbought conditions"),
      ).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onDismiss when close button is clicked", () => {
      render(
        <AlertBanner
          alerts={[mockInfoAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const closeButton = screen.getByRole("button", { name: /close alert/i });
      fireEvent.click(closeButton);

      expect(mockOnDismiss).toHaveBeenCalledWith("alert-1");
    });

    it("should call onMarkAsRead when alert is clicked", () => {
      render(
        <AlertBanner
          alerts={[mockInfoAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const alertElement = screen.getByRole("alert");
      fireEvent.click(alertElement);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith("alert-1");
    });

    it("should show timestamp in human readable format", () => {
      render(
        <AlertBanner
          alerts={[mockInfoAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      // Should show relative time like "just now", "2 minutes ago", etc.
      expect(screen.getByText(/ago|just now/)).toBeInTheDocument();
    });
  });

  describe("severity icons", () => {
    it("should show info icon for info alerts", () => {
      render(
        <AlertBanner
          alerts={[mockInfoAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByTestId("info-icon")).toBeInTheDocument();
    });

    it("should show warning icon for warning alerts", () => {
      render(
        <AlertBanner
          alerts={[mockWarningAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
    });

    it("should show critical icon for critical alerts", () => {
      render(
        <AlertBanner
          alerts={[mockCriticalAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByTestId("critical-icon")).toBeInTheDocument();
    });
  });

  describe("alert prioritization", () => {
    it("should display critical alerts first", () => {
      render(
        <AlertBanner
          alerts={[mockInfoAlert, mockCriticalAlert, mockWarningAlert]}
          onDismiss={mockOnDismiss}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const alertElements = screen.getAllByRole("alert");
      expect(alertElements[0]).toHaveClass("bg-red-50"); // Critical first
      expect(alertElements[1]).toHaveClass("bg-yellow-50"); // Warning second
      expect(alertElements[2]).toHaveClass("bg-blue-50"); // Info last
    });
  });
});