import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AlertManager } from "../AlertManager";
import { AlertCondition, AlertSeverity, AlertStatus } from "../../../types/domain";
import type { PriceAlert, IndicatorAlert } from "../../../types/domain";

// Mock the AlertManagerServiceV2
vi.mock("../../../services/alertManagerServiceV2", () => {
  const mockService = {
    getAlerts: vi.fn(),
    getActiveAlerts: vi.fn(), 
    addAlert: vi.fn(),
    updateAlert: vi.fn(),
    removeAlert: vi.fn(),
    setUserId: vi.fn(),
    getUserId: vi.fn(),
  };
  return {
    alertManagerServiceV2: mockService,
  };
});

import { alertManagerServiceV2 } from "../../../services/alertManagerServiceV2";
const mockAlertService = vi.mocked(alertManagerServiceV2);

describe("AlertManager", () => {
  const mockPriceAlert: PriceAlert = {
    id: "alert-1",
    symbol: "BTC",
    condition: AlertCondition.PriceAbove,
    targetValue: 50000,
    message: "Test alert",
    severity: AlertSeverity.Info,
    status: AlertStatus.Active,
    createdAt: "2023-01-01T00:00:00Z",
    cooldownSeconds: 30,
  };

  const mockIndicatorAlert: IndicatorAlert = {
    id: "alert-2",
    symbol: "BTC",
    condition: AlertCondition.RSIAbove,
    targetValue: 70,
    message: "RSI alert",
    severity: AlertSeverity.Info,
    status: AlertStatus.Active,
    createdAt: "2023-01-01T00:00:00Z",
    indicatorType: 2, // RelativeStrengthIndex
    period: 14,
    cooldownSeconds: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mockAlertService.getAlerts.mockResolvedValue([]);
    mockAlertService.addAlert.mockResolvedValue(mockPriceAlert);
    mockAlertService.updateAlert.mockResolvedValue(mockPriceAlert);
    mockAlertService.removeAlert.mockResolvedValue();
  });

  it("renders form to create a price alert", async () => {
    render(<AlertManager />);

    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/condition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cooldown seconds/i)).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
    });
  });

  it("creates a new alert and shows it in the list", async () => {
    // Mock the service to return the created alert after creation
    mockAlertService.getAlerts
      .mockResolvedValueOnce([]) // Initial empty state
      .mockResolvedValueOnce([mockPriceAlert]); // After creation

    render(<AlertManager />);

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: "BTC" },
    });
    fireEvent.change(screen.getByLabelText(/target value/i), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Test alert" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    // Wait for the alert to be created and list to refresh
    await waitFor(() => {
      expect(mockAlertService.addAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "BTC",
          targetValue: 50000,
          message: "Test alert",
        })
      );
    });

    // Check that the alert appears in the list
    await waitFor(() => {
      expect(screen.getByText(/BTC/)).toBeInTheDocument();
      expect(screen.getByText(/Test alert/)).toBeInTheDocument();
    });
  });

  it("creates an RSI indicator alert and shows indicator details", async () => {
    // Mock the service to return the indicator alert after creation
    mockAlertService.getAlerts
      .mockResolvedValueOnce([]) // Initial empty state
      .mockResolvedValueOnce([mockIndicatorAlert]); // After creation

    render(<AlertManager />);

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
    });

    // Fill out the form for RSI indicator alert
    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: "BTC" },
    });
    fireEvent.change(screen.getByLabelText(/condition/i), {
      target: { value: String(AlertCondition.RSIAbove) },
    });
    fireEvent.change(screen.getByLabelText(/target value/i), {
      target: { value: "70" },
    });

    // Check that indicator-specific fields appear
    await waitFor(() => {
      expect(screen.getByLabelText(/indicator type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/period/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/period/i), {
      target: { value: "14" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    // Wait for the alert to be created
    await waitFor(() => {
      expect(mockAlertService.addAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "BTC",
          targetValue: 70,
          indicatorType: expect.any(Number),
          period: 14,
        })
      );
    });

    // Check that the alert appears in the list with indicator details
    await waitFor(() => {
      expect(screen.getByText(/BTC/)).toBeInTheDocument();
      expect(screen.getByText(/70/)).toBeInTheDocument();
    });
  });

  it("edits an existing indicator alert and updates period", async () => {
    // Mock the service to show an existing alert, then show the updated alert
    const updatedAlert = { ...mockIndicatorAlert, period: 7 };
    mockAlertService.getAlerts
      .mockResolvedValueOnce([mockIndicatorAlert]) // Initial state with existing alert
      .mockResolvedValueOnce([updatedAlert]); // After update

    render(<AlertManager />);

    // Wait for initial loading and alert to appear
    await waitFor(() => {
      expect(screen.getByText(/BTC/)).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole("button", { name: /edit alert/i });
    fireEvent.click(editButton);

    // Wait for the form to be populated with existing values
    await waitFor(() => {
      expect(screen.getByDisplayValue("BTC")).toBeInTheDocument();
      expect(screen.getByDisplayValue("14")).toBeInTheDocument(); // period field
    });

    // Update the period
    const periodInput = screen.getByLabelText(/period/i);
    fireEvent.change(periodInput, { target: { value: "7" } });

    // Submit the update
    fireEvent.click(screen.getByRole("button", { name: /update alert/i }));

    // Wait for the update to complete
    await waitFor(() => {
      expect(mockAlertService.updateAlert).toHaveBeenCalledWith(
        mockIndicatorAlert.id,
        expect.objectContaining({
          period: 7,
        })
      );
    });

    // Check that form is reset after successful update
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
    });
  });

  it("allows dismissing (deleting) an alert", async () => {
    const ethAlert = { ...mockPriceAlert, symbol: "ETH", targetValue: 3000 };
    mockAlertService.getAlerts
      .mockResolvedValueOnce([ethAlert]) // Initial state with existing alert
      .mockResolvedValueOnce([]); // After deletion

    render(<AlertManager />);

    // Wait for initial loading and alert to appear
    await waitFor(() => {
      expect(screen.getByText(/ETH/)).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole("button", { name: /delete alert/i });
    fireEvent.click(deleteButton);

    // Wait for deletion to complete
    await waitFor(() => {
      expect(mockAlertService.removeAlert).toHaveBeenCalledWith(ethAlert.id);
    });

    // Check that the alert is no longer visible
    await waitFor(() => {
      expect(screen.queryByText(/ETH/)).not.toBeInTheDocument();
    });
  });

  it("allows editing an existing alert", async () => {
    const adaAlert = { ...mockPriceAlert, symbol: "ADA", targetValue: 1.23, message: "Initial message" };
    const updatedAdaAlert = { ...adaAlert, message: "Updated message" };
    
    mockAlertService.getAlerts
      .mockResolvedValueOnce([]) // Initial empty state
      .mockResolvedValueOnce([adaAlert]) // After creation
      .mockResolvedValueOnce([adaAlert]) // When loading for edit
      .mockResolvedValueOnce([updatedAdaAlert]); // After update
    
    mockAlertService.addAlert.mockResolvedValue(adaAlert);
    mockAlertService.updateAlert.mockResolvedValue(updatedAdaAlert);

    render(<AlertManager />);

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
    });

    // Create alert
    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: "ADA" },
    });
    fireEvent.change(screen.getByLabelText(/target value/i), {
      target: { value: "1.23" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Initial message" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    // Wait for creation to complete and alert to appear
    await waitFor(() => {
      expect(screen.getByText(/ADA/)).toBeInTheDocument();
      expect(screen.getByText(/Initial message/)).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole("button", { name: /edit alert/i });
    fireEvent.click(editButton);

    // Wait for form to be populated
    await waitFor(() => {
      expect(screen.getByDisplayValue("Initial message")).toBeInTheDocument();
    });

    // Update the message
    const messageInput = screen.getByLabelText(/message/i);
    fireEvent.change(messageInput, { target: { value: "Updated message" } });
    fireEvent.click(screen.getByRole("button", { name: /update alert/i }));

    // Wait for update to complete
    await waitFor(() => {
      expect(mockAlertService.updateAlert).toHaveBeenCalledWith(
        adaAlert.id,
        expect.objectContaining({
          message: "Updated message",
        })
      );
    });

    // Check that form is reset after successful update
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
      // Form should be cleared after successful update - check that symbol field is empty
      const symbolInput = screen.getByLabelText(/symbol/i);
      expect(symbolInput).toHaveValue("");
    });
  });

  it("disables create button when required fields are empty", async () => {
    render(<AlertManager />);
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
    });
    
    const createBtn = screen.getByRole("button", { name: /create alert/i });
    expect(createBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: "BTC" },
    });
    fireEvent.change(screen.getByLabelText(/target value/i), {
      target: { value: "45000" },
    });
    expect(createBtn).not.toBeDisabled();
  });
});
