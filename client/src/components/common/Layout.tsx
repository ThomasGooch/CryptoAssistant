import React from "react";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout component for the application
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AkashTrends
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Real-Time Crypto Trading Analysis
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="bg-white dark:bg-gray-800 shadow-inner mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} AkashTrends - Built with Clean
            Architecture
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
