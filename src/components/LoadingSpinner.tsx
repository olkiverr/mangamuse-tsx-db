import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-spinner-container">
      <div className="spinner-wrapper">
        <div className="glow-spinner-container">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      {message && <div className="loading-message">{message}</div>}
    </div>
  );
};

export default LoadingSpinner; 