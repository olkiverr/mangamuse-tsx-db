import React from 'react';
import { Link } from 'react-router-dom';
import { Anime } from '../services/animeService';
import FavoriteButton from './FavoriteButton';
import WatchedButton from './WatchedButton';
import { useAuth } from '../contexts/AuthContext';
import './AnimeCard.css';

interface AnimeCardProps {
  anime: Anime;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
  const { isAuthenticated } = useAuth();
  
  // Format the air date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  // Determine CSS class based on status
  const getStatusClass = () => {
    if (anime.status === "Currently Airing") return "status-airing";
    if (anime.status === "Not yet aired") return "status-upcoming";
    return "status-finished";
  };

  // Vérifier si des métadonnées sont disponibles
  const hasMetadata = (anime.season && anime.year) || anime.episodes > 0;

  // Empêcher la propagation du clic sur les boutons
  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link to={`/anime/${anime.mal_id}`} className="anime-card-link">
      <div className="anime-card">
        <div className="anime-image">
          <img 
            src={anime.images.jpg.large_image_url || anime.images.jpg.image_url} 
            alt={anime.title} 
            loading="lazy"
          />
          {anime.score > 0 && (
            <div className="anime-score-badge">
              <span>{anime.score.toFixed(1)}</span>
            </div>
          )}
          <div className={`anime-status-badge ${getStatusClass()}`}>
            {anime.status === "Currently Airing" ? "Airing" : 
             anime.status === "Not yet aired" ? "Upcoming" : "Finished"}
          </div>
        </div>
        <div className="anime-info">
          <div className="anime-info-header">
            <h3 className="anime-title" title={anime.title}>{anime.title}</h3>
            {isAuthenticated && (
              <div className="anime-info-actions" onClick={handleActionClick}>
                <div className="anime-info-favorite">
                  <FavoriteButton 
                    animeId={anime.mal_id} 
                    title={anime.title}
                    imageUrl={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  />
                </div>
                <div className="anime-info-watched">
                  <WatchedButton 
                    animeId={anime.mal_id}
                    title={anime.title}
                    imageUrl={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  />
                </div>
              </div>
            )}
          </div>
          
          {hasMetadata && (
          <div className="anime-meta">
            {anime.season && anime.year && (
              <span className="anime-season">
                {anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} {anime.year}
              </span>
            )}
            {anime.episodes > 0 && (
              <span className="anime-episodes">
                  {anime.episodes} {anime.episodes > 1 ? 'eps.' : 'ep.'}
              </span>
            )}
          </div>
          )}
          
          <div className="anime-genres">
            {anime.genres.map((genre) => (
              <div key={genre.name} className="anime-genre-wrapper">
                <span className="anime-genre">
                {genre.name}
              </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard; 