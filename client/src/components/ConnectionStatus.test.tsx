import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  test('displays connected state', () => {
    render(<ConnectionStatus status="connected" />);
    
    const statusElement = screen.getByTestId('connection-status');
    expect(statusElement).toHaveTextContent(/Connected/i);
    expect(statusElement).toHaveClass('bg-green-500');
  });
  
  test('displays disconnected state', () => {
    render(<ConnectionStatus status="disconnected" />);
    
    const statusElement = screen.getByTestId('connection-status');
    expect(statusElement).toHaveTextContent(/Disconnected/i);
    expect(statusElement).toHaveClass('bg-yellow-500');
  });
  
  test('displays error state', () => {
    render(<ConnectionStatus status="error" />);
    
    const statusElement = screen.getByTestId('connection-status');
    expect(statusElement).toHaveTextContent(/Connection Error/i);
    expect(statusElement).toHaveClass('bg-red-500');
  });
});
