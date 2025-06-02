import React, { useEffect, useState } from 'react';
import { Anime } from '../services/animeService';
import AnimeCard from './AnimeCard';
import LoadingSpinner from './LoadingSpinner';
import './AnimeSlider.css';

interface AnimeSliderProps {
  title: string;
  animes: Anime[];
  loading: boolean;
}

const AnimeSlider: React.FC<AnimeSliderProps> = ({ title, animes, loading }) => {
  const scrollLeft = () => {
    const slider = document.getElementById(`slider-${title.replace(/\s+/g, '-').toLowerCase()}`);
    if (slider) {
      slider.scrollBy({ left: -slider.clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const slider = document.getElementById(`slider-${title.replace(/\s+/g, '-').toLowerCase()}`);
    if (slider) {
      slider.scrollBy({ left: slider.clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  if (loading && animes.length === 0) {
    return (
      <div className="anime-slider-container">
        <h2 className="slider-title">{title}</h2>
        <LoadingSpinner message={`Loading ${title.toLowerCase()}...`} />
      </div>
    );
  }

  return (
    <div className="anime-slider-container">
      <h2 className="slider-title">{title}</h2>
      <div className="slider-controls">
        <button className="slider-control prev" onClick={scrollLeft}>
          &lt;
        </button>
        <div 
          id={`slider-${title.replace(/\s+/g, '-').toLowerCase()}`} 
          className="anime-slider"
        >
          {animes.map((anime) => (
            <div key={anime.mal_id} className="slider-item">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
        <button className="slider-control next" onClick={scrollRight}>
          &gt;
        </button>
      </div>
    </div>
  );
};

export default AnimeSlider; 