import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { fetchAnimes, fetchMoreAnimes, fetchGenres, Anime, AnimeGenre } from '../services/animeService';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import AnimeCard from './AnimeCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorPage from './ErrorPage';
import './AnimeList.css';

// Liste des IDs de genres considérés comme NSFW
const NSFW_GENRE_IDS = [9, 12, 35, 44, 49, 65]; // 9=Ecchi, 12=Hentai, 35=Harem, 44=Gender Bender, 49=Erotica, 65=Reverse Harem

// Options de tri disponibles
const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "title", label: "Title" },
  { value: "score", label: "Score" },
  { value: "scored_by", label: "Number of votes" },
  { value: "rank", label: "Rank" },
  { value: "favorites", label: "Favorites" }
];

const AnimeList: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const existingAnimeIds = useRef(new Set<number>());
  const isInitialLoad = useRef(true);
  const initialLoadAttempted = useRef(false);
  // Add a flag to prevent double loading
  const isLoadingRef = useRef(false);
  const showNSFW = user?.showNSFW || false;
  const nsfwAuthorized = user?.nsfwAuthorized || false;
  
  // États pour les filtres de genres
  const [allGenres, setAllGenres] = useState<AnimeGenre[]>([]);
  const [displayedGenres, setDisplayedGenres] = useState<AnimeGenre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<number[]>([]);
  const [genreFilterVisible, setGenreFilterVisible] = useState(false);
  
  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // État pour le tri
  const [sortBy, setSortBy] = useState("popularity");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  // Vérifier si l'affichage NSFW est réellement permis
  const canShowNSFW = useMemo(() => showNSFW && nsfwAuthorized, [showNSFW, nsfwAuthorized]);

  useEffect(() => {
    // Suppression de tous les console.log
  }, [showNSFW, nsfwAuthorized, canShowNSFW, user]);

  // Focus sur l'input de recherche quand il devient visible
  useEffect(() => {
    if (searchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchVisible]);

  // Charger la liste des genres
  useEffect(() => {
    const loadGenres = async () => {
      try {
        setLoadingGenres(true);
        const response = await fetchGenres();
        
        // Trier les genres par ordre alphabétique
        const sortedGenres = [...response.data].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        setAllGenres(sortedGenres);
        
        // Filtrer les genres NSFW si l'option est désactivée ou non autorisée
        if (!canShowNSFW) {
          setDisplayedGenres(sortedGenres.filter(genre => !NSFW_GENRE_IDS.includes(genre.mal_id)));
        } else {
          setDisplayedGenres(sortedGenres);
        }
      } catch (err) {
        logger.error("Error loading genres:", err);
      } finally {
        setLoadingGenres(false);
      }
    };
    
    loadGenres();
  }, [canShowNSFW]);
  
  // Effet pour mettre à jour les filtres quand showNSFW ou nsfwAuthorized change
  useEffect(() => {
    if (!canShowNSFW) {
      // Retirer les genres NSFW des sélections actuelles
      setSelectedGenres(prev => prev.filter(id => !NSFW_GENRE_IDS.includes(id)));
      
      // Si NSFW est désactivé ou non autorisé, on ajoute automatiquement les genres NSFW aux exclusions
      const nsfwGenresToExclude = NSFW_GENRE_IDS.filter(
        id => !excludedGenres.includes(id)
      );
      
      if (nsfwGenresToExclude.length > 0) {
        setExcludedGenres(prev => [...prev, ...nsfwGenresToExclude]);
      }
      
      // Mettre à jour les genres affichés (déjà triés)
      setDisplayedGenres(allGenres.filter(genre => !NSFW_GENRE_IDS.includes(genre.mal_id)));
    } else {
      // Si NSFW est activé et autorisé, on retire les genres NSFW des exclusions automatiques
      setExcludedGenres(prev => prev.filter(id => !NSFW_GENRE_IDS.includes(id)));
      
      // Afficher tous les genres (déjà triés)
      setDisplayedGenres(allGenres);
    }
  }, [canShowNSFW, allGenres]);

  // Optimisation des genres exclus avec useMemo
  const effectiveExcludedGenres = useMemo(() => {
    const currentExcludedGenres = [...excludedGenres];
    
    if (!canShowNSFW) {
      // Ajouter les genres NSFW aux exclusions s'ils ne sont pas déjà présents
      NSFW_GENRE_IDS.forEach(id => {
        if (!currentExcludedGenres.includes(id)) {
          currentExcludedGenres.push(id);
        }
      });
    }
    
    return currentExcludedGenres;
  }, [excludedGenres, canShowNSFW]);

  // Optimisation de la fonction loadAnimes avec useCallback
  const loadAnimes = useCallback(async (pageNum: number) => {
    // Prevent concurrent loads of the same page
    if (isLoadingRef.current) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // If this is the initial load, wait a bit after the sliders have loaded
      // but reduce the wait time from 3000ms to 1000ms
      if (isInitialLoad.current) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        isInitialLoad.current = false;
      }
      
      const response = await (pageNum === 1 
        ? fetchAnimes(pageNum, showNSFW, selectedGenres, effectiveExcludedGenres, searchQuery, sortBy, nsfwAuthorized) 
        : fetchMoreAnimes(pageNum, showNSFW, selectedGenres, effectiveExcludedGenres, searchQuery, sortBy, nsfwAuthorized));
      
      // Filter duplicates more efficiently with Set operations
      const newAnimes = response.data.filter(anime => {
        const isDuplicate = existingAnimeIds.current.has(anime.mal_id);
        if (!isDuplicate) {
          existingAnimeIds.current.add(anime.mal_id);
        }
        return !isDuplicate;
      });
      
      if (pageNum === 1) {
        setAnimes(newAnimes);
      } else {
        setAnimes(prev => [...prev, ...newAnimes]);
      }
      
      // Only set hasMore to false if we're really at the end of pagination
      // and not just because we filtered out all duplicates
      const hasNextPage = response.pagination.has_next_page;
      
      // If we received data but filtered everything as duplicates, try next page immediately
      if (newAnimes.length === 0 && response.data.length > 0 && hasNextPage) {
        setTimeout(() => {
          setPage(pageNum + 1);
        }, 500); // Reduced from 1000ms to 500ms
      } else {
        setHasMore(hasNextPage);
      }
      
      initialLoadAttempted.current = true;
    } catch (err) {
      setError("An error occurred while fetching anime. This might be due to API rate limits. Please try again later.");
      initialLoadAttempted.current = true;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [showNSFW, nsfwAuthorized, selectedGenres, effectiveExcludedGenres, searchQuery, sortBy]);

  // Optimisation de la fonction handleRetry avec useCallback
  const handleRetry = useCallback(() => {
    isInitialLoad.current = false; // Skip initial delay on retry
    existingAnimeIds.current.clear();
    setPage(1);
    loadAnimes(1);
  }, [loadAnimes]);

  // Gérer la soumission du formulaire de recherche
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    existingAnimeIds.current.clear();
    setPage(1);
    loadAnimes(1);
  }, [loadAnimes]);

  // Fonction pour effacer la recherche
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    if (searchQuery) {  // Ne recharger que s'il y avait une recherche active
      existingAnimeIds.current.clear();
      setPage(1);
      loadAnimes(1);
    }
  }, [searchQuery, loadAnimes]);
  
  // Basculer la visibilité de la barre de recherche
  const toggleSearchBar = () => {
    setSearchVisible(prev => !prev);
    if (!searchVisible && searchInputRef.current) {
      // Timeout pour permettre au DOM de se mettre à jour avant de focus
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  };
  
  // Gérer le changement d'option de tri
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setSortMenuVisible(false);
    existingAnimeIds.current.clear();
    setPage(1);
    loadAnimes(1);
  };
  
  // Fonction pour basculer le menu de tri
  const toggleSortMenu = () => {
    setSortMenuVisible(prev => !prev);
  };

  // Recharger les animes quand les filtres changent
  useEffect(() => {
    // Reset the set of IDs on filter changes
    existingAnimeIds.current = new Set<number>();
    setPage(1);
    
    // Use a cleanup flag to prevent effect from running twice in React 18 Strict Mode
    let isMounted = true;
    
    if (isMounted) {
      loadAnimes(1);
    }
    
    // Return cleanup function to disconnect observer and prevent double loading
    return () => {
      isMounted = false;
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [showNSFW, selectedGenres, excludedGenres, searchQuery, sortBy]); // Recharger quand les filtres, la recherche ou le tri changent

  const lastAnimeElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || isLoadingRef.current) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingRef.current) {
        // Add a small delay before loading more to avoid hitting rate limits
        setTimeout(() => {
          setPage(prevPage => prevPage + 1);
        }, 1000);
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1 && hasMore && !isLoadingRef.current) {
      loadAnimes(page);
    }
  }, [page]);

  // Gérer la sélection d'un genre
  const handleGenreToggle = (genreId: number) => {
    // Si le genre est déjà sélectionné, le passer en mode exclusion
    if (selectedGenres.includes(genreId)) {
      setSelectedGenres(prev => prev.filter(id => id !== genreId));
      setExcludedGenres(prev => [...prev, genreId]);
    }
    // Si le genre est déjà exclu, le retirer complètement (retour à l'état neutre)
    else if (excludedGenres.includes(genreId)) {
      setExcludedGenres(prev => prev.filter(id => id !== genreId));
    }
    // Si le genre est neutre, l'ajouter aux sélections
    else {
      setSelectedGenres(prev => [...prev, genreId]);
    }
  };

  // Déterminer l'état d'un genre (0 = neutre, 1 = inclus, 2 = exclu)
  const getGenreState = (genreId: number) => {
    if (selectedGenres.includes(genreId)) return 1;
    if (excludedGenres.includes(genreId)) return 2;
    return 0;
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSelectedGenres([]);
    setExcludedGenres([]);
    setSearchQuery("");
    setSortBy("popularity");
  };

  // Obtenir le libellé de l'option de tri actuelle
  const getCurrentSortLabel = () => {
    return SORT_OPTIONS.find(option => option.value === sortBy)?.label || "Popularity";
  };

  if (isLoading && animes.length === 0 && !initialLoadAttempted.current) {
    return <LoadingSpinner message="Loading anime collection..." />;
  }

  if (error && animes.length === 0) {
    return (
      <ErrorPage 
        message={error} 
        onRetry={handleRetry}
      />
    );
  }

  if (animes.length === 0 && initialLoadAttempted.current && !isLoading) {
    return (
      <div className="no-anime-container">
        <div className="no-anime-message">
          <h2>No anime found</h2>
          <p>We couldn't find any anime to display at the moment.</p>
          <button className="retry-button" onClick={handleRetry}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="anime-list-container geometric-bg-1">
      <div className="anime-list-header">
        <h2 className="section-title">All Anime</h2>
        
        <div className="header-controls">
        
          <div className="search-container">
            <button 
              className="search-toggle-button" 
              onClick={toggleSearchBar}
              aria-label={searchVisible ? "Hide search" : "Show search"}
            >
              {searchVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              )}
            </button>
            
            {searchVisible && (
              <div className="search-bar-container">
                <form onSubmit={handleSearchSubmit} className="search-form">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-input"
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="search-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                  {searchQuery && (
                    <button 
                      type="button" 
                      className="clear-search-button"
                      onClick={clearSearch}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
          
          <button 
            className="filter-toggle-button" 
            onClick={() => setGenreFilterVisible(!genreFilterVisible)}
          >
            {genreFilterVisible ? 'Hide Filters' : 'Show Filters'} 
            <span className="filter-icon">{genreFilterVisible ? '▲' : '▼'}</span>
          </button>

          <div className="sort-container">
            <button 
              className="sort-toggle-button" 
              onClick={toggleSortMenu}
              aria-label="Sort options"
              aria-expanded={sortMenuVisible}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="9" x2="20" y2="9"></line>
                <line x1="4" y1="15" x2="20" y2="15"></line>
                <line x1="10" y1="3" x2="8" y2="21"></line>
                <line x1="16" y1="3" x2="14" y2="21"></line>
              </svg>
              <span className="sort-label">Sort: {getCurrentSortLabel()}</span>
            </button>
            
            {sortMenuVisible && (
              <div className="sort-menu">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    className={`sort-option ${sortBy === option.value ? 'active' : ''}`}
                    onClick={() => handleSortChange(option.value)}
                  >
                    {option.label}
                    {sortBy === option.value && (
                      <svg className="check-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {searchQuery && (
        <div className="active-search-query">
          <span>Search results for: <strong>{searchQuery}</strong></span>
          <button className="clear-search-button-inline" onClick={clearSearch}>
            Clear search
          </button>
        </div>
      )}

      {genreFilterVisible && (
        <div className="genre-filter-container">
          {loadingGenres ? (
            <div className="loading-genres">Loading genres...</div>
          ) : (
            <>
              <div className="filter-section">
                <h3>Filter by Genres</h3>
                <div className="filter-legend">
                  <span className="filter-legend-item neutral">Neutral</span>
                  <span className="filter-legend-item include">Include</span>
                  <span className="filter-legend-item exclude">Exclude</span>
                </div>
                <div className="genre-buttons">
                  {displayedGenres.map(genre => {
                    const state = getGenreState(genre.mal_id);
                    let stateClass = '';
                    if (state === 1) stateClass = 'include';
                    if (state === 2) stateClass = 'exclude';
                    
                    return (
                      <button
                        key={genre.mal_id}
                        className={`genre-button ${stateClass}`}
                        onClick={() => handleGenreToggle(genre.mal_id)}
                      >
                        {genre.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="filter-actions">
                <button className="reset-filters-button" onClick={resetFilters}>
                  Reset Filters
                </button>
                
                <div className="active-filters">
                  {selectedGenres.length > 0 && (
                    <div className="filter-summary">
                      <strong>Including:</strong> {selectedGenres.map(id => allGenres.find(g => g.mal_id === id)?.name).join(', ')}
                    </div>
                  )}
                  
                  {excludedGenres.length > 0 && (
                    <div className="filter-summary">
                      <strong>Excluding:</strong> {excludedGenres
                        .filter(id => !showNSFW ? !NSFW_GENRE_IDS.includes(id) : true) // Ne pas afficher les genres NSFW automatiquement exclus
                        .map(id => allGenres.find(g => g.mal_id === id)?.name)
                        .join(', ')}
                      {!showNSFW && <span className="auto-excluded"> (NSFW genres automatically excluded)</span>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="anime-grid">
        {animes.map((anime, index) => {
          if (animes.length === index + 1) {
            return (
              <div 
                key={anime.mal_id} 
                className="anime-grid-item"
                ref={lastAnimeElementRef}
              >
                <AnimeCard anime={anime} />
              </div>
            );
          } else {
            return (
              <div key={anime.mal_id} className="anime-grid-item">
                <AnimeCard anime={anime} />
              </div>
            );
          }
        })}
      </div>
      
      {isLoading && animes.length > 0 && (
        <div className="loading-more-container">
          <LoadingSpinner message="Loading more..." />
        </div>
      )}
      
      {!hasMore && animes.length > 0 && <div className="no-more-results">End of results</div>}
    </div>
  );
};

export default AnimeList; 