/**
 * Environment utilities for client-side environment detection
 */

export const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

export const isProduction = () => {
  return import.meta.env.PROD || import.meta.env.MODE === 'production';
};

export const getApiBaseUrl = () => {
  // In development, try to detect if we're running standalone (frontend only)
  if (isDevelopment()) {
    // Check if we're running on a typical Vite dev server port
    const currentPort = window.location.port;
    if (currentPort === '5173' || currentPort === '5174' || currentPort === '3000') {
      return ''; // Use relative URLs, which will fail gracefully if backend is not running
    }
  }
  return '';
};

export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    // Try a simple health check
    const response = await fetch('/api/health', { 
      method: 'HEAD',
      timeout: 2000 as any // TypeScript doesn't recognize timeout, but modern browsers do
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const showBackendUnavailableNotice = () => {
  if (isDevelopment()) {
    console.info(`
🌊 Elliott Wave Analysis - Frontend Only Mode
=============================================

The backend server appears to be unavailable. The application will work with:
✅ Client-side Elliott Wave pattern detection
✅ Client-side Fibonacci calculations  
✅ Default preferences and configuration
✅ Mock data for testing and development

⚠️  Backend-dependent features unavailable:
❌ Real-time market data
❌ User preferences persistence
❌ Alert notifications
❌ Multi-timeframe analysis

To start the full application:
1. Start the backend server
2. Refresh the page

For frontend-only development, all Elliott Wave features work with sample data.
    `);
  }
};

export default {
  isDevelopment,
  isProduction,
  getApiBaseUrl,
  isBackendAvailable,
  showBackendUnavailableNotice,
};