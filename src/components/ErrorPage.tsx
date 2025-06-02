import React from 'react';
import { Link } from 'react-router-dom';
import './ErrorPage.css';

interface ErrorPageProps {
  message: string;
  actionText?: string;
  actionLink?: string;
  onRetry?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ 
  message, 
  actionText = 'Return to Home', 
  actionLink = '/',
  onRetry
}) => {
  return (
    <div className="error-page">
      <div className="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
          <path fill="none" d="M0 0h24v24H0z"/>
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z" 
            fill="rgba(255,72,66,1)"/>
        </svg>
      </div>
      <h2 className="error-title">Something went wrong</h2>
      <p className="error-message">{message}</p>
      <div className="error-actions">
        {onRetry && (
          <button className="retry-button" onClick={onRetry}>
            Try Again
          </button>
        )}
        <Link to={actionLink} className="home-link">
          {actionText}
        </Link>
      </div>
    </div>
  );
};

export default ErrorPage; 