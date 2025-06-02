import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  fetchAnimeDetails, 
  fetchAnimeCharacters,
  fetchAnimeStaff,
  Anime, 
  Character,
  StaffMember
} from '../services/animeService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import ErrorPage from './ErrorPage';
import FavoriteButton from './FavoriteButton';
import WatchedButton from './WatchedButton';
import './AnimeDetails.css';

const AnimeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'synopsis' | 'characters' | 'staff' | 'relations'>('synopsis');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [charactersError, setCharactersError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const loadAnimeData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const animeId = parseInt(id);
      const response = await fetchAnimeDetails(animeId);
      setAnime(response.data);
    } catch (err) {
      setError("An error occurred while retrieving anime details. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCharactersData = async () => {
    if (!id) return;
    
    try {
      setLoadingCharacters(true);
      setCharactersError(null);
      const animeId = parseInt(id);
      const response = await fetchAnimeCharacters(animeId);
      setCharacters(response.data);
    } catch (err) {
      setCharactersError("Unable to load characters.");
      console.error("Error loading characters:", err);
    } finally {
      setLoadingCharacters(false);
    }
  };

  const loadStaffData = async () => {
    if (!id) return;
    
    try {
      setLoadingStaff(true);
      setStaffError(null);
      const animeId = parseInt(id);
      const response = await fetchAnimeStaff(animeId);
      setStaff(response.data);
    } catch (err) {
      setStaffError("Unable to load staff.");
      console.error("Error loading staff:", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadAnimeData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'characters' && characters.length === 0 && !loadingCharacters && !charactersError) {
      loadCharactersData();
    }
  }, [activeTab, characters.length, loadingCharacters, charactersError]);

  useEffect(() => {
    if (activeTab === 'staff' && staff.length === 0 && !loadingStaff && !staffError) {
      loadStaffData();
    }
  }, [activeTab, staff.length, loadingStaff, staffError]);

  const handleRetry = () => {
    loadAnimeData();
  };

  const handleCharactersRetry = () => {
    loadCharactersData();
  };

  const handleStaffRetry = () => {
    loadStaffData();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <LoadingSpinner message="Loading anime details..." />;
  }

  if (error || !anime) {
    return (
      <ErrorPage 
        message={error || "Anime not found"}
        onRetry={handleRetry}
      />
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(date);
  };

  // Format air start and end dates
  const formatAiredPeriod = () => {
    if (!anime.aired) return 'Unknown';
    const start = formatDate(anime.aired.from);
    const end = anime.aired.to ? formatDate(anime.aired.to) : 'Ongoing';
    return `${start} to ${end}`;
  };

  return (
    <div className="anime-details-container">
      <div className="back-link">
        <button onClick={handleGoBack} className="back-button">← Revenir</button>
      </div>
      
      <div className="anime-details-header">
        <div className="anime-poster">
          <img 
            src={anime.images.jpg.large_image_url} 
            alt={anime.title} 
          />
          {anime.status && (
            <div className={`anime-status ${anime.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {anime.status === "Currently Airing" ? "Currently Airing" : 
               anime.status === "Not yet aired" ? "Coming Soon" : "Finished"}
            </div>
          )}
        </div>
        
        {isAuthenticated && (
          <div className="anime-favorite-button-container">
            <FavoriteButton 
              animeId={anime.mal_id}
              title={anime.title}
              imageUrl={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
            />
            <WatchedButton 
              animeId={anime.mal_id}
              title={anime.title}
              imageUrl={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
            />
          </div>
        )}
        
        <div className="anime-header-info">
          <h1 className="anime-title">{anime.title}</h1>
          {anime.title_english && anime.title_english !== anime.title && (
            <h2 className="anime-title-alt">{anime.title_english}</h2>
          )}
          {anime.title_japanese && (
            <h3 className="anime-title-jp">{anime.title_japanese}</h3>
          )}
          
          <div className="anime-genres">
            {/* Displaying only genres, not themes */}
            {anime.genres && anime.genres.length > 0 ? (
              anime.genres.map((genre: { name: string }) => (
                <div key={genre.name} className="anime-genre-wrapper">
                  <span className="anime-genre">
                    {genre.name}
                  </span>
                </div>
              ))
            ) : (
              <span className="no-genres">No genres specified</span>
            )}
          </div>
          
          <div className="anime-info-container">
            {anime.score > 0 && (
              <div className="anime-info-score">
                <span className="info-score-value">★ {anime.score.toFixed(1)}</span>
                <span className="info-score-count">({anime.scored_by?.toLocaleString('en-US') || '?'} votes)</span>
                {anime.rank && <span className="info-rank-value">#{anime.rank} Ranked</span>}
              </div>
            )}
            
            <div className="anime-info-section">
              <h3 className="info-heading">Détails</h3>
              <div className="info-grid">
                {anime.status && (
                  <div className="info-item">
                    <div className="info-label">Status:</div>
                    <div className="info-value">{anime.status === "Currently Airing" ? "Currently Airing" : 
                      anime.status === "Not yet aired" ? "Coming Soon" : "Finished"}</div>
            </div>
                )}
            
            {anime.aired && (
                  <div className="info-item">
                    <div className="info-label">Aired:</div>
                    <div className="info-value">{formatAiredPeriod()}</div>
                  </div>
                )}
                
                {anime.season && anime.year && (
                  <div className="info-item">
                    <div className="info-label">Season:</div>
                    <div className="info-value">{anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} {anime.year}</div>
              </div>
            )}
            
            {anime.episodes > 0 && (
                  <div className="info-item">
                    <div className="info-label">Episodes:</div>
                    <div className="info-value">{anime.episodes}</div>
              </div>
            )}
            
            {anime.duration && (
                  <div className="info-item">
                    <div className="info-label">Duration:</div>
                    <div className="info-value">{anime.duration}</div>
              </div>
            )}
            
            {anime.rating && (
                  <div className="info-item">
                    <div className="info-label">Rating:</div>
                    <div className="info-value">{anime.rating}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="anime-info-section">
              <h3 className="info-heading">Production</h3>
              <div className="info-grid">
            {anime.studios && anime.studios.length > 0 && (
                  <div className="info-item">
                    <div className="info-label">Studio:</div>
                    <div className="info-value">{anime.studios.map(studio => studio.name).join(', ')}</div>
                  </div>
                )}
                
                {anime.producers && anime.producers.length > 0 && (
                  <div className="info-item">
                    <div className="info-label">Producers:</div>
                    <div className="info-value">{anime.producers?.map((producer: { name: string }) => producer.name).join(', ')}</div>
              </div>
            )}
            
            {anime.source && (
                  <div className="info-item">
                    <div className="info-label">Source:</div>
                    <div className="info-value">{anime.source}</div>
                  </div>
                )}
                
                {anime.type && (
                  <div className="info-item">
                    <div className="info-label">Type:</div>
                    <div className="info-value">{anime.type}</div>
              </div>
            )}
          </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="anime-content-tabs">
        <div className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'synopsis' ? 'active' : ''}`}
            onClick={() => setActiveTab('synopsis')}
          >
            Synopsis
          </button>
          <button 
            className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            Characters
          </button>
          <button 
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            Staff
          </button>
          <button 
            className={`tab-btn ${activeTab === 'relations' ? 'active' : ''}`}
            onClick={() => setActiveTab('relations')}
          >
            Relations
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'synopsis' && (
      <div className="anime-synopsis">
        <h2>Synopsis</h2>
        <p>{anime.synopsis || "No synopsis available."}</p>
              
              <h3>Genres</h3>
              <div className="genres-detail-section">
                {anime.genres && anime.genres.length > 0 ? (
                  anime.genres.map((genre: { name: string }) => (
                    <div key={genre.name} className="anime-genre-detail-wrapper">
                      <span className="anime-genre-detail">
                        {genre.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No genres specified for this anime.</p>
                )}
      </div>
              
              {anime.background && (
                <>
                  <h3>Background</h3>
                  <p>{anime.background}</p>
                </>
              )}
      
      {anime.trailer && anime.trailer.youtube_id && (
        <div className="anime-trailer">
                  <h3>Trailer</h3>
          <div className="trailer-container">
            <iframe
              width="100%"
              height="400"
              src={`https://www.youtube.com/embed/${anime.trailer.youtube_id}`}
              title={`${anime.title} trailer`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
            </div>
          )}
          
          {activeTab === 'characters' && (
            <div className="anime-characters">
              <h2>Characters</h2>
              
              {loadingCharacters ? (
                <div className="characters-loading">
                  <LoadingSpinner message="Loading characters..." />
                </div>
              ) : charactersError ? (
                <div className="characters-error">
                  <p className="error-message">{charactersError}</p>
                  <button onClick={handleCharactersRetry} className="retry-button">
                    Retry
                  </button>
                </div>
              ) : characters.length > 0 ? (
                <div className="characters-sections">
                  {/* Main Characters Section */}
                  <div className="characters-section">
                    <h3 className="section-subtitle">Main Characters</h3>
                    <div className="characters-grid">
                      {characters
                        .filter(char => char.role === "Main")
                        .map((charData) => (
                          <div key={charData.character.mal_id} className="character-card">
                            <div className="character-image">
                              <img 
                                src={charData.character.images.jpg.image_url} 
                                alt={charData.character.name} 
                                loading="lazy"
                              />
                            </div>
                            <div className="character-info">
                              <h3 className="character-name">{charData.character.name}</h3>
                              <p className="character-role">{charData.role}</p>
                              {charData.voice_actors && charData.voice_actors.length > 0 && (
                                <p className="character-va">
                                  <small>
                                    VA: {charData.voice_actors.find(va => va.language === "Japanese")?.person.name || charData.voice_actors[0].person.name}
                                  </small>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* Supporting Characters Section */}
                  <div className="characters-section">
                    <h3 className="section-subtitle">Supporting Characters</h3>
                    <div className="characters-grid">
                      {characters
                        .filter(char => char.role !== "Main")
                        .map((charData) => (
                          <div key={charData.character.mal_id} className="character-card">
                            <div className="character-image">
                              <img 
                                src={charData.character.images.jpg.image_url} 
                                alt={charData.character.name} 
                                loading="lazy"
                              />
                            </div>
                            <div className="character-info">
                              <h3 className="character-name">{charData.character.name}</h3>
                              <p className="character-role">{charData.role}</p>
                              {charData.voice_actors && charData.voice_actors.length > 0 && (
                                <p className="character-va">
                                  <small>
                                    VA: {charData.voice_actors.find(va => va.language === "Japanese")?.person.name || charData.voice_actors[0].person.name}
                                  </small>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="characters-grid">
                  {/* Placeholder character data */}
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={`char-${item}`} className="character-card">
                      <div className="character-image placeholder-image">
                        <div className="character-placeholder-icon">👤</div>
                      </div>
                      <div className="character-info">
                        <h3 className="character-name">Character {item}</h3>
                        <p className="character-role">{item % 2 === 0 ? 'Main Character' : 'Supporting Character'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingCharacters && !charactersError && characters.length === 0 && (
                <p className="placeholder-note">
                  This section will display the anime characters when the API provides them.
                </p>
              )}
            </div>
          )}
          
          {activeTab === 'staff' && (
            <div className="anime-staff">
              <h2>Staff</h2>
              
              {loadingStaff ? (
                <div className="staff-loading">
                  <LoadingSpinner message="Loading staff..." />
                </div>
              ) : staffError ? (
                <div className="staff-error">
                  <p className="error-message">{staffError}</p>
                  <button onClick={handleStaffRetry} className="retry-button">
                    Retry
                  </button>
                </div>
              ) : staff.length > 0 ? (
                <div className="staff-sections">
                  {/* Group staff by positions */}
                  {(() => {
                    // Group staff by their primary position
                    const staffByPosition: Record<string, StaffMember[]> = {};
                    
                    // Common positions to prioritize
                    const priorityPositions = ["Director", "Producer", "Original Creator", "Character Design"];
                    
                    staff.forEach(staffMember => {
                      // Choose the first position as the primary one
                      const primaryPosition = staffMember.positions[0];
                      if (!staffByPosition[primaryPosition]) {
                        staffByPosition[primaryPosition] = [];
                      }
                      staffByPosition[primaryPosition].push(staffMember);
                    });
                    
                    // Sort keys to show important positions first
                    const sortedPositions = Object.keys(staffByPosition).sort((a, b) => {
                      // First check if position is in priority list
                      const aIndex = priorityPositions.indexOf(a);
                      const bIndex = priorityPositions.indexOf(b);
                      
                      if (aIndex !== -1 && bIndex !== -1) {
                        return aIndex - bIndex;
                      } else if (aIndex !== -1) {
                        return -1;
                      } else if (bIndex !== -1) {
                        return 1;
                      }
                      
                      // Alphabetical sort for non-priority positions
                      return a.localeCompare(b);
                    });
                    
                    return sortedPositions.map(position => (
                      <div key={position} className="staff-section">
                        <h3 className="section-subtitle">{position}</h3>
                        <div className="staff-grid">
                          {staffByPosition[position].map((staffMember) => (
                            <div key={`${staffMember.person.mal_id}-${staffMember.positions.join('-')}`} className="staff-card">
                              <div className="staff-image">
                                <img 
                                  src={staffMember.person.images.jpg.image_url} 
                                  alt={staffMember.person.name} 
                                  loading="lazy"
                                />
                              </div>
                              <div className="staff-info">
                                <h3 className="staff-name">{staffMember.person.name}</h3>
                                <p className="staff-role">
                                  {staffMember.positions.length > 1 && (
                                    <small>
                                      Also: {staffMember.positions.slice(1, 3).join(', ')}
                                      {staffMember.positions.length > 3 && ' and more...'}
                                    </small>
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="staff-grid">
                  {/* Placeholder staff data */}
                  {[1, 2, 3, 4].map((item) => (
                    <div key={`staff-${item}`} className="staff-card">
                      <div className="staff-image placeholder-image">
                        <div className="staff-placeholder-icon">👨‍💼</div>
                      </div>
                      <div className="staff-info">
                        <h3 className="staff-name">Staff Member {item}</h3>
                        <p className="staff-role">
                          {item === 1 ? 'Director' : item === 2 ? 'Writer' : item === 3 ? 'Character Designer' : 'Producer'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!loadingStaff && !staffError && staff.length === 0 && (
                <p className="placeholder-note">
                  This section will display the anime production team when the API provides them.
                </p>
              )}
            </div>
          )}
          
          {activeTab === 'relations' && (
            <div className="anime-relations">
              <h2>Relations</h2>
              {anime.relations && anime.relations.length > 0 ? (
                <div className="relations-list">
                  {anime.relations?.map((relation: { relation: string, entry: Array<{ mal_id: number, name: string, type: string }> }, index: number) => (
                    <div key={index} className="relation-item">
                      <h3 className="relation-type">{relation.relation}</h3>
                      <ul className="relation-entries">
                        {relation.entry.map((entry: { mal_id: number, name: string, type: string }) => (
                          <li key={entry.mal_id} className="relation-entry">
                            {entry.name} ({entry.type})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="placeholder-content">
                  No relations are available for this anime.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="anime-stats">
        <h2>Statistics</h2>
        <div className="stats-grid">
          {anime.popularity && (
            <div className="stat-item">
              <div className="stat-value">#{anime.popularity}</div>
              <div className="stat-label">Popularity</div>
            </div>
          )}
          
          {anime.members && (
            <div className="stat-item">
              <div className="stat-value">{anime.members.toLocaleString('en-US')}</div>
              <div className="stat-label">Members</div>
            </div>
          )}
          
          {anime.favorites && (
            <div className="stat-item">
              <div className="stat-value">{anime.favorites.toLocaleString('en-US')}</div>
              <div className="stat-label">Favorites</div>
            </div>
          )}
          
          {anime.score_by_distribution && Object.keys(anime.score_by_distribution).length > 0 && (
            <div className="stat-item wide">
              <div className="stat-label">Score Distribution</div>
              <div className="score-distribution">
                {/* To implement: score distribution chart */}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {anime.streaming && anime.streaming.length > 0 && (
        <div className="anime-streaming">
          <h2>Available on Streaming</h2>
          <div className="streaming-links">
            {anime.streaming?.map((platform: { name: string, url: string }, index: number) => (
              <a 
                key={index} 
                href={platform.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="streaming-link"
              >
                {platform.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimeDetails; 