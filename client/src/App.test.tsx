import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from './test/utils';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    renderWithProviders(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays the application title', () => {
    renderWithProviders(<App />);
    const header = screen.getByRole('heading', { level: 1 });
    expect(header).toHaveTextContent('AkashTrends');
  });

  it('displays the cryptocurrency price section', () => {
    renderWithProviders(<App />);
    expect(screen.getByText('Cryptocurrency Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
  });

  it('displays the technical indicator section', () => {
    renderWithProviders(<App />);
    expect(screen.getByText('Technical Indicator')).toBeInTheDocument();
    expect(screen.getByLabelText('Indicator Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Period (days)')).toBeInTheDocument();
  });

  it('displays the footer with copyright', () => {
    renderWithProviders(<App />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} AkashTrends`))).toBeInTheDocument();
  });
});
