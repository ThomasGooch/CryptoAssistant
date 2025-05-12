import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

// Add any providers here (e.g., Router, Store Provider)
export function renderWithProviders(ui: ReactElement) {
  return render(ui);
}

// Add more test utilities as needed
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
