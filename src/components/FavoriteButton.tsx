import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FavoriteButton.css';

interface FavoriteButtonProps {
  animeId: number;
  title: string;
  imageUrl: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ animeId, title, imageUrl }) => {
  const { isAuthenticated, isFavorite, toggleFavorite } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFav(isFavorite(animeId));
  }, [isFavorite, animeId]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await toggleFavorite(animeId, title, imageUrl);
      if (response.success) {
        setIsFav(!isFav);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoginRedirect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/login');
  };

  return (
    <div className="favorite-button-container">
      <button
        className={`favorite-button ${isFav ? 'is-favorite' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={handleToggleFavorite}
        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        <span className="favorite-icon">
          {isFav ? '★' : '☆'}
        </span>
      </button>
      
      {showTooltip && !isAuthenticated && (
        <div className="favorite-tooltip">
          <p>Please log in to add favorites</p>
          <button onClick={handleLoginRedirect} className="tooltip-login-button">
            Log in
          </button>
        </div>
      )}
    </div>
  );
};

export default FavoriteButton; 