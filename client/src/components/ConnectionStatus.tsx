import React from 'react';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'error';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  let statusClass = '';
  let statusText = '';

  switch (status) {
    case 'connected':
      statusClass = 'bg-green-500';
      statusText = 'Connected';
      break;
    case 'error':
      statusClass = 'bg-red-500';
      statusText = 'Connection Error';
      break;
    default:
      statusClass = 'bg-yellow-500';
      statusText = 'Disconnected';
  }

  return (
    <div className="fixed bottom-4 right-4">
      <div 
        data-testid="connection-status"
        className={`px-4 py-2 rounded-full ${statusClass} text-white shadow-lg transition-colors duration-200`}
      >
        {statusText}
      </div>
    </div>
  );
};

export default ConnectionStatus;
