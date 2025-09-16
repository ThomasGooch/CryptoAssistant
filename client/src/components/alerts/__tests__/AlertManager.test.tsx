import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlertManager } from "../AlertManager";
import { alertManager } from "../../../services/alertManagerService";
import { AlertCondition } from "../../../types/domain";

describe("AlertManager", () => {
  beforeEach(() => {
    alertManager.clearAll();
  });

  it("renders form to create a price alert", () => {
    render(<AlertManager />);

    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/condition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target value/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create alert/i })).toBeInTheDocument();
  });

  it("creates a new alert and shows it in the list", () => {
    render(<AlertManager />);

    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: "BTC" } });
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: "50000" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Test alert" } });
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    expect(screen.getByText(/BTC/)).toBeInTheDocument();
    expect(screen.getByText(/Test alert/)).toBeInTheDocument();
  });

  it("creates an RSI indicator alert and shows indicator details", () => {
    render(<AlertManager />);

    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: "BTC" } });
    fireEvent.change(screen.getByLabelText(/condition/i), { target: { value: String(AlertCondition.RSIAbove) } });
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: "70" } });
    // period and indicator inputs appear when RSI condition is selected
    const indicatorSelect = screen.getByLabelText(/indicator type|indicator/i);
    expect(indicatorSelect).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/period/i), { target: { value: "14" } });

    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

  expect(screen.getByText(/^BTC$/)).toBeInTheDocument();
  expect(screen.getByText(/70/)).toBeInTheDocument();
  expect(screen.getByText(/RelativeStrengthIndex/)).toBeInTheDocument();
  });

  it("edits an existing indicator alert and updates period", () => {
    render(<AlertManager />);

    // create RSI alert
    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: "BTC" } });
    fireEvent.change(screen.getByLabelText(/condition/i), { target: { value: String(AlertCondition.RSIAbove) } });
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText(/period/i), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    // edit
    const editButton = screen.getByRole("button", { name: /edit alert/i });
    fireEvent.click(editButton);

    const periodInput = screen.getByLabelText(/period/i);
    fireEvent.change(periodInput, { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

  // The list should reflect updated period (label or value may be present)
  expect(screen.getByText(/^BTC$/)).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it("allows dismissing (deleting) an alert", () => {
    render(<AlertManager />);

    // create
    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: "ETH" } });
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: "3000" } });
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    const deleteButton = screen.getByRole("button", { name: /delete alert/i });
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);

    expect(screen.queryByText(/ETH/)).not.toBeInTheDocument();
  });

  it("allows editing an existing alert", () => {
    render(<AlertManager />);

    // create
    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: "ADA" } });
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: "1.23" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Initial message" } });
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    // click edit
    const editButton = screen.getByRole("button", { name: /edit alert/i });
    fireEvent.click(editButton);

    const messageInput = screen.getByLabelText(/message/i);
    fireEvent.change(messageInput, { target: { value: "Updated message" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/Updated message/)).toBeInTheDocument();
  });

  it("disables create button when required fields are empty", () => {
    render(<AlertManager />);
    const createBtn = screen.getByRole("button", { name: /create alert/i });
    expect(createBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: "BTC" } });
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: "45000" } });
    expect(createBtn).not.toBeDisabled();
  });
});
