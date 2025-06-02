import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  fetchAdvancedSearch,
  fetchGenres,
  fetchProducers,
  fetchRandomAnimeWithFilters,
  AdvancedSearchParams,
  AnimeGenre,
  Anime
} from '../services/animeService';
import LoadingSpinner from './LoadingSpinner';
import ErrorPage from './ErrorPage';
import AnimeCard from './AnimeCard';
import './AdvancedSearch.css';

// Constants for filter options
const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "tv", label: "TV" },
  { value: "movie", label: "Movie" },
  { value: "ova", label: "OVA" },
  { value: "special", label: "Special" },
  { value: "ona", label: "ONA" },
  { value: "music", label: "Music" }
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "airing", label: "Airing" },
  { value: "complete", label: "Completed" },
  { value: "upcoming", label: "Upcoming" }
];

const SEASON_OPTIONS = [
  { value: "", label: "All Seasons" },
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" }
];

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "title", label: "Title" },
  { value: "score", label: "Score" },
  { value: "rank", label: "Rank" },
  { value: "favorites", label: "Favorites" }
];

const SORT_ORDER_OPTIONS = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" }
];

// Générer les années de 2024 à 1980
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [{ value: "", label: "All Years" }];
  
  for (let year = currentYear; year >= 1980; year--) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  
  return years;
};

const YEAR_OPTIONS = generateYearOptions();

// Liste des IDs de genres considérés comme NSFW
const NSFW_GENRE_IDS = [9, 12, 35, 44, 49, 65]; // 9=Ecchi, 12=Hentai, 35=Harem, 44=Gender Bender, 49=Erotica, 65=Reverse Harem

const AdvancedSearch: React.FC = () => {
  // States for filters
  const [searchParams, setSearchParams] = useState<AdvancedSearchParams>({
    page: 1,
    searchQuery: "",
    orderBy: "popularity",
    sort: "desc"
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<number[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [season, setSeason] = useState("");
  const [year, setYear] = useState("");
  const [minScore, setMinScore] = useState<number | "">("");
  const [selectedProducers, setSelectedProducers] = useState<number[]>([]);
  const [orderBy, setOrderBy] = useState("popularity");
  const [sort, setSort] = useState("desc");
  const [producerSearchQuery, setProducerSearchQuery] = useState("");

  // States for data
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [allGenres, setAllGenres] = useState<AnimeGenre[]>([]);
  const [displayedGenres, setDisplayedGenres] = useState<AnimeGenre[]>([]);
  const [producers, setProducers] = useState<{mal_id: number, name: string}[]>([]);
  const [filteredProducers, setFilteredProducers] = useState<{mal_id: number, name: string}[]>([]);
  
  // States for loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [loadingProducers, setLoadingProducers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // States for display
  const [activeFilterTab, setActiveFilterTab] = useState<'basic' | 'genres' | 'advanced'>('basic');
  
  // Access to user for NSFW preferences
  const { user } = useAuth();
  const showNSFW = user?.showNSFW || false;
  const nsfwAuthorized = user?.nsfwAuthorized || false;
  const canShowNSFW = showNSFW && nsfwAuthorized;
  
  const navigate = useNavigate();
  
  // Charger les genres
  useEffect(() => {
    const loadGenres = async () => {
      try {
        setLoadingGenres(true);
        const response = await fetchGenres();
        const sortedGenres = [...response.data].sort((a, b) => a.name.localeCompare(b.name));
        setAllGenres(sortedGenres);
        
        // Filtrer les genres NSFW si nécessaire
        if (!canShowNSFW) {
          setDisplayedGenres(sortedGenres.filter(genre => !NSFW_GENRE_IDS.includes(genre.mal_id)));
        } else {
          setDisplayedGenres(sortedGenres);
        }
      } catch (err) {
        console.error("Error loading genres:", err);
      } finally {
        setLoadingGenres(false);
      }
    };
    
    loadGenres();
  }, [canShowNSFW]);
  
  // Charger les producteurs
  useEffect(() => {
    const loadProducers = async () => {
      try {
        setLoadingProducers(true);
        const response = await fetchProducers();
        const sortedProducers = [...response.data].sort((a, b) => a.name.localeCompare(b.name));
        setProducers(sortedProducers);
        setFilteredProducers(sortedProducers);
      } catch (err) {
        console.error("Error loading producers:", err);
      } finally {
        setLoadingProducers(false);
        setInitialLoading(false);
      }
    };
    
    loadProducers();
  }, []);
  
  // Filtrer les producteurs basé sur la recherche
  useEffect(() => {
    if (producerSearchQuery.trim()) {
      const filtered = producers.filter(producer => 
        producer.name.toLowerCase().includes(producerSearchQuery.toLowerCase())
      );
      setFilteredProducers(filtered);
    } else {
      setFilteredProducers(producers);
    }
  }, [producerSearchQuery, producers]);
  
  // Fonction principale pour effectuer la recherche
  const performSearch = async (newPage: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Si c'est une nouvelle recherche, réinitialiser la page et les animes
      if (newPage === 1) {
        setAnimes([]);
        setPage(1);
      }
      
      const params: AdvancedSearchParams = {
        page: newPage,
        searchQuery,
        showNSFW,
        nsfwAuthorized,
        includeGenres: selectedGenres,
        excludeGenres: excludedGenres,
        orderBy,
        sort,
        status: status || undefined,
        type: type || undefined,
        season: season || undefined,
        year: year ? parseInt(year) : undefined,
        minScore: typeof minScore === 'number' ? minScore : undefined,
        producers: selectedProducers.length > 0 ? selectedProducers : undefined
      };
      
      setSearchParams(params);
      
      const response = await fetchAdvancedSearch(params);
      
      // For new searches, replace the results
      // For additional loading, add to existing results
      if (newPage === 1) {
        setAnimes(response.data);
      } else {
        setAnimes(prev => [...prev, ...response.data]);
      }
      
      // Vérifier s'il y a plus de résultats
      setHasMore(response.pagination.has_next_page);
      setHasSearched(true);
    } catch (err) {
      console.error("Error performing search:", err);
      setError("An error occurred while searching. This might be due to API rate limits. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour trouver un anime aléatoire avec les filtres actuels
  const findRandomAnimeWithFilters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: AdvancedSearchParams = {
        searchQuery,
        showNSFW,
        nsfwAuthorized,
        includeGenres: selectedGenres,
        excludeGenres: excludedGenres,
        orderBy,
        sort,
        status: status || undefined,
        type: type || undefined,
        season: season || undefined,
        year: year ? parseInt(year) : undefined,
        minScore: typeof minScore === 'number' ? minScore : undefined,
        producers: selectedProducers.length > 0 ? selectedProducers : undefined
      };
      
      const animeId = await fetchRandomAnimeWithFilters(params);
      navigate(`/anime/${animeId}`);
    } catch (err: any) {
      console.error("Error searching for random anime:", err);
      setError(err.message || "An error occurred while searching for a random anime. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };
  
  // Gérer le changement de page
  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      performSearch(nextPage);
    }
  };
  
  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedGenres([]);
    setExcludedGenres([]);
    setType("");
    setStatus("");
    setSeason("");
    setYear("");
    setMinScore("");
    setSelectedProducers([]);
    setOrderBy("popularity");
    setSort("desc");
    setPage(1);
    setAnimes([]);
    setHasSearched(false);
  };
  
  // Gérer les clics sur les genres
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
  
  // Gérer les clics sur les producteurs
  const handleProducerToggle = (producerId: number) => {
    if (selectedProducers.includes(producerId)) {
      setSelectedProducers(prev => prev.filter(id => id !== producerId));
    } else {
      setSelectedProducers(prev => [...prev, producerId]);
    }
  };
  
  // Gérer la réponse à une erreur
  const handleRetry = () => {
    performSearch();
  };

  // Fonction pour générer les balises de filtres actifs
  const renderActiveFilterTags = () => {
    const tags = [];
    
    if (searchQuery) {
      tags.push(
        <span key="query" className="active-filter-tag">
          Search: {searchQuery}
          <button onClick={() => setSearchQuery('')}>×</button>
        </span>
      );
    }
    
    if (type) {
      const typeLabel = TYPE_OPTIONS.find(option => option.value === type)?.label;
      tags.push(
        <span key="type" className="active-filter-tag">
          Type: {typeLabel}
          <button onClick={() => setType('')}>×</button>
        </span>
      );
    }
    
    if (status) {
      const statusLabel = STATUS_OPTIONS.find(option => option.value === status)?.label;
      tags.push(
        <span key="status" className="active-filter-tag">
          Status: {statusLabel}
          <button onClick={() => setStatus('')}>×</button>
        </span>
      );
    }
    
    if (season) {
      const seasonLabel = SEASON_OPTIONS.find(option => option.value === season)?.label;
      tags.push(
        <span key="season" className="active-filter-tag">
          Season: {seasonLabel}
          <button onClick={() => setSeason('')}>×</button>
        </span>
      );
    }
    
    if (year) {
      tags.push(
        <span key="year" className="active-filter-tag">
          Year: {year}
          <button onClick={() => setYear('')}>×</button>
        </span>
      );
    }
    
    if (typeof minScore === 'number') {
      tags.push(
        <span key="score" className="active-filter-tag">
          Min Score: {minScore}
          <button onClick={() => setMinScore('')}>×</button>
        </span>
      );
    }
    
    // Ajout des genres inclus
    selectedGenres.forEach(genreId => {
      const genreName = allGenres.find(g => g.mal_id === genreId)?.name;
      if (genreName) {
        tags.push(
          <span key={`include-${genreId}`} className="active-filter-tag">
            Genre +: {genreName}
            <button onClick={() => setSelectedGenres(prev => prev.filter(id => id !== genreId))}>×</button>
          </span>
        );
      }
    });
    
    // Ajout des genres exclus
    excludedGenres.forEach(genreId => {
      const genreName = allGenres.find(g => g.mal_id === genreId)?.name;
      if (genreName) {
        tags.push(
          <span key={`exclude-${genreId}`} className="active-filter-tag">
            Genre -: {genreName}
            <button onClick={() => setExcludedGenres(prev => prev.filter(id => id !== genreId))}>×</button>
          </span>
        );
      }
    });
    
    // Ajout des producteurs
    selectedProducers.forEach(producerId => {
      const producerName = producers.find(p => p.mal_id === producerId)?.name;
      if (producerName) {
        tags.push(
          <span key={`producer-${producerId}`} className="active-filter-tag">
            Studio: {producerName}
            <button onClick={() => setSelectedProducers(prev => prev.filter(id => id !== producerId))}>×</button>
          </span>
        );
      }
    });
    
    return tags;
  };
  
  // Compter le nombre de filtres actifs
  const countActiveFilters = () => {
    let count = 0;
    if (searchQuery) count++;
    if (type) count++;
    if (status) count++;
    if (season) count++;
    if (year) count++;
    if (typeof minScore === 'number') count++;
    count += selectedGenres.length;
    count += excludedGenres.length;
    count += selectedProducers.length;
    return count;
  };

  if (initialLoading) {
    return <LoadingSpinner message="Loading search options..." />;
  }
  
  return (
    <div className="advanced-search">
      <h1 className="search-title">Advanced Anime Search</h1>
      
      <div className="search-container">
        {/* Section des filtres */}
        <div className="filters-section">
          {/* Barre des filtres actifs */}
          <div className="active-filters-bar">
            {countActiveFilters() > 0 ? (
              renderActiveFilterTags()
            ) : (
              <span className="no-filters-text">No active filters. Use the options below to refine your search.</span>
            )}
          </div>
          
          {/* Navigation des filtres */}
          <div className="filter-nav">
            <button 
              className={`filter-nav-button ${activeFilterTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveFilterTab('basic')}
            >
              Basic Search
              {(searchQuery || type || status) && (
                <span className="filter-count">
                  {(searchQuery ? 1 : 0) + (type ? 1 : 0) + (status ? 1 : 0)}
                </span>
              )}
            </button>
            <button 
              className={`filter-nav-button ${activeFilterTab === 'genres' ? 'active' : ''}`}
              onClick={() => setActiveFilterTab('genres')}
            >
              Genres
              {(selectedGenres.length > 0 || excludedGenres.length > 0) && (
                <span className="filter-count">
                  {selectedGenres.length + excludedGenres.length}
                </span>
              )}
            </button>
            <button 
              className={`filter-nav-button ${activeFilterTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveFilterTab('advanced')}
            >
              Advanced Filters
              {(season || year || typeof minScore === 'number' || selectedProducers.length > 0) && (
                <span className="filter-count">
                  {(season ? 1 : 0) + (year ? 1 : 0) + (typeof minScore === 'number' ? 1 : 0) + selectedProducers.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Panneau de filtres actif */}
          {activeFilterTab === 'basic' && (
            <div className="filter-panel">
              <h2 className="filter-panel-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Basic Search
              </h2>
              
              <div className="filter-section">
                <div className="form-group">
                  <label htmlFor="searchQuery">Keyword Search</label>
                  <input
                    type="text"
                    id="searchQuery"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter keywords to search..."
                    className="search-input"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="orderBy">Sort by</label>
                    <select
                      id="orderBy"
                      value={orderBy}
                      onChange={(e) => setOrderBy(e.target.value)}
                      className="select-input"
                    >
                      {SORT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="sort">Order</label>
                    <select
                      id="sort"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="select-input"
                    >
                      {SORT_ORDER_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="type">Type</label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="select-input"
                    >
                      {TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="select-input"
                    >
                      {STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeFilterTab === 'genres' && (
            <div className="filter-panel">
              <h2 className="filter-panel-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Filter by Genres
              </h2>
              
              {loadingGenres ? (
                <div className="loading-genres">Loading genres...</div>
              ) : (
                <div className="filter-section">
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
                          type="button"
                          className={`genre-button ${stateClass}`}
                          onClick={() => handleGenreToggle(genre.mal_id)}
                        >
                          {genre.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeFilterTab === 'advanced' && (
            <div className="filter-panel">
              <h2 className="filter-panel-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Advanced Filters
              </h2>
              
              <div className="filter-section">
                <h3 className="filter-section-title">Season and Year</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="season">Season</label>
                    <select
                      id="season"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="select-input"
                    >
                      {SEASON_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="year">Year</label>
                    <select
                      id="year"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="select-input"
                    >
                      {YEAR_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="filter-section">
                <h3 className="filter-section-title">Score</h3>
                <div className="form-group">
                  <label htmlFor="minScore">Minimum score: {minScore === "" ? "None" : minScore}</label>
                  <div className="range-input-container">
                    <input
                      type="range"
                      id="minScore"
                      min="1"
                      max="10"
                      step="0.1"
                      value={minScore === "" ? "1" : minScore}
                      onChange={(e) => setMinScore(parseFloat(e.target.value))}
                      className="range-input"
                    />
                    <div className="range-value">
                      {minScore === "" ? "None" : minScore}
                    </div>
                    {minScore !== "" && (
                      <button
                        type="button"
                        className="clear-range"
                        onClick={() => setMinScore("")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="filter-section">
                <h3 className="filter-section-title">Studios and Producers</h3>
                <div className="form-group">
                  <input
                    type="text"
                    value={producerSearchQuery}
                    onChange={(e) => setProducerSearchQuery(e.target.value)}
                    placeholder="Search for studios or producers..."
                    className="search-input"
                  />
                  
                  <div className="producers-container">
                    {loadingProducers ? (
                      <div className="loading-producers">Loading studios and producers...</div>
                    ) : (
                      <div className="producer-buttons">
                        {filteredProducers.slice(0, 50).map(producer => (
                          <button
                            key={producer.mal_id}
                            type="button"
                            className={`producer-button ${selectedProducers.includes(producer.mal_id) ? 'selected' : ''}`}
                            onClick={() => handleProducerToggle(producer.mal_id)}
                          >
                            {producer.name}
                          </button>
                        ))}
                        {filteredProducers.length > 50 && (
                          <div className="too-many-results">
                            Showing first 50 results. Please refine your search.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Boutons d'action au milieu */}
        <div className="search-controls">
          <button
            type="button"
            className="search-btn"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          
          <button
            type="button"
            className="random-btn"
            onClick={findRandomAnimeWithFilters}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4M7 4L3 8M7 4L11 8"></path>
              <path d="M17 8v12M17 20l4-4M17 20l-4-4"></path>
            </svg>
            Random Anime
          </button>
          
          <button
            type="button"
            className="reset-btn"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
        
        {/* Search results at the bottom */}
        <div className="search-results">
          {error ? (
            <ErrorPage message={error} onRetry={handleRetry} />
          ) : (
            <>
              {hasSearched && (
                <div className="results-header">
                  <h2>{animes.length > 0 ? `${animes.length} results found` : 'No anime found'}</h2>
                </div>
              )}
              
              {animes.length > 0 ? (
                <>
                  <div className="anime-grid">
                    {animes.map(anime => (
                      <div key={anime.mal_id}>
                        <AnimeCard anime={anime} />
                      </div>
                    ))}
                  </div>
                  
                  {hasMore && (
                    <div className="load-more-container">
                      <button
                        className="load-more-button"
                        onClick={loadMore}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                hasSearched && !isLoading && (
                  <div className="no-results">
                    <p>No anime matches your criteria.</p>
                    <p>Try adjusting your filters to get more results.</p>
                  </div>
                )
              )}
              
              {isLoading && (
                <div className="loading-container">
                  <LoadingSpinner message="Searching for anime..." />
                </div>
              )}
              
              {!hasSearched && !isLoading && (
                <div className="no-search-yet">
                  <div className="search-help">
                    <h3>Advanced Search</h3>
                    <p>Use the filters above to search for anime that match your preferences.</p>
                    <ul>
                      <li>Search by title, season, year or type</li>
                      <li>Include or exclude specific genres</li>
                      <li>Filter by minimum score</li>
                      <li>Find anime from your favorite studios</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch; 