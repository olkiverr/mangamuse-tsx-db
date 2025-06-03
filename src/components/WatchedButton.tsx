import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaEye, FaRegEye } from 'react-icons/fa';
import './WatchedButton.css';

interface WatchedButtonProps {
  animeId: number;
  title: string;
  imageUrl: string;
}

const WatchedButton: React.FC<WatchedButtonProps> = ({ animeId, title, imageUrl }) => {
  const { isAuthenticated, isWatched, toggleWatched } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWatchedState, setIsWatchedState] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setIsWatchedState(isWatched(animeId));
  }, [isWatched, animeId]);

  const handleToggleWatched = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await toggleWatched(animeId, title, imageUrl);
      if (response.success) {
        setIsWatchedState(!isWatchedState);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des animes vus:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="watched-button-container">
      <button
        className={`watched-button ${isWatchedState ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={handleToggleWatched}
        disabled={isProcessing}
        title={isAuthenticated ? (isWatchedState ? "Marquer comme non vu" : "Marquer comme vu") : "Connectez-vous pour marquer comme vu"}
      >
        {isWatchedState ? <FaEye /> : <FaRegEye />}
      </button>
      {showTooltip && (
        <div className="watched-tooltip">
          Connectez-vous pour marquer comme vu
        </div>
      )}
    </div>
  );
};

export default WatchedButton; 