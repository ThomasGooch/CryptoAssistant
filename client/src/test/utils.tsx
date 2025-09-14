/* eslint-disable react-refresh/only-export-components */
import { render, act } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

type WrapperProps = {
  children: ReactNode;
};

const TestWrapper = ({ children }: WrapperProps) => children;

type RenderOptions = {
  route?: string;
};

export async function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  if (options.route) {
    window.history.pushState({}, 'Test page', options.route);
  }

  const wrappedUi = (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <TestWrapper>{ui}</TestWrapper>
    </BrowserRouter>
  );
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(wrappedUi);
  });

  return {
    ...result!,
    rerender: async (rerenderUi: ReactElement) => {
      await act(async () => {
        result!.rerender(
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <TestWrapper>{rerenderUi}</TestWrapper>
          </BrowserRouter>
        );
      });
    },
  };
}

// Test data factories
export const createMockPrice = (overrides = {}) => ({
  symbol: 'BTC',
  price: 50000,
  timestamp: new Date().toISOString(),
  ...overrides
});

export const createMockIndicator = (overrides = {}) => ({
  symbol: 'BTC',
  type: 'SMA',
  value: 49500,
  timestamp: new Date().toISOString(),
  ...overrides
});

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
