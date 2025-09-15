import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Mock crypto service responses
beforeAll(() => {
  // Mock fetch to handle relative URLs in test environment
  global.fetch = vi.fn().mockImplementation((url) => {
    // Convert relative URLs to string for matching, don't try to parse as URL objects
    let urlString = '';
    if (url instanceof Request) {
      // For Request objects, just extract the URL string
      try {
        urlString = url.url;
      } catch {
        urlString = '';
      }
    } else {
      // For string URLs (including relative ones), use as-is
      urlString = url?.toString() || '';
    }
    
    // Mock price endpoint
    if (urlString.includes('/price/') || urlString.includes('price/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          symbol: 'BTC',
          price: 50000,
          timestamp: new Date().toISOString(),
          priceChange24h: 1000,
          percentChange24h: 2.0
        })
      } as Response);
    }
    
    // Mock historical prices endpoint  
    if (urlString.includes('/historical/') || urlString.includes('historical/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          symbol: 'BTC',
          timeframe: '1h',
          prices: [
            { timestamp: new Date().toISOString(), price: 49000 },
            { timestamp: new Date().toISOString(), price: 50000 }
          ]
        })
      } as Response);
    }
    
    // Mock candlestick endpoint
    if (urlString.includes('/candlestick/') || urlString.includes('candlestick/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          symbol: 'BTC',
          timeframe: '1h',
          data: [
            { 
              timestamp: new Date().toISOString(),
              open: 49000,
              high: 50500,
              low: 48500,
              close: 50000,
              volume: 1000
            }
          ]
        })
      } as Response);
    }
    
    // Default mock response
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    } as Response);
  });

  // Mock HTMLCanvasElement.getContext for Chart.js
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Array(4),
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;
});

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
});
