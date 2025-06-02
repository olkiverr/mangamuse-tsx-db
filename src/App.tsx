import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import AnimeList from './components/AnimeList';
import AnimeDetails from './components/AnimeDetails';
import AnimeSlider from './components/AnimeSlider';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorPage from './components/ErrorPage';
import ThemeToggle from './components/ThemeToggle';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { fetchTrendingAnimes, fetchUpcomingAnimes, fetchRandomAnime, Anime } from './services/animeService';
import AdvancedSearch from './components/AdvancedSearch';

// Composant de protection des routes admin
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

// Header with authentication state
const Header: React.FC = () => {
  const { isAuthenticated, user, logout, isAdmin, toggleNSFW } = useAuth();
  const nsfwAuthorized = user?.nsfwAuthorized || false;
  const navigate = useNavigate();
  const [showNsfwPopup, setShowNsfwPopup] = useState(false);

  // Function to toggle NSFW option
  const handleToggleNSFW = async () => {
    if (isAuthenticated) {
      console.log("Header: NSFW toggle clicked, current state:", user?.showNSFW);
      try {
        const result = await toggleNSFW();
        console.log("Header: Result of NSFW toggle:", result);
      } catch (error) {
        console.error("Header: Error toggling NSFW:", error);
      }
    }
  };

  // Function to open a random anime
  const openRandomAnime = async () => {
    try {
      const showNSFW = user?.showNSFW || false;
      const animeId = await fetchRandomAnime(showNSFW, nsfwAuthorized);
      navigate(`/anime/${animeId}`);
    } catch (error) {
      console.error("Error fetching random anime:", error);
    }
  };

  // Log toggle state on each render
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Header: Current NSFW state =", user?.showNSFW);
    }
  }, [isAuthenticated, user?.showNSFW]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNsfwPopup && !target.closest('.nsfw-popup-content') && !target.closest('.nsfw-access-info')) {
        setShowNsfwPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNsfwPopup]);

  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo-container">
          <Link to="/" className="logo-link">
            <h1>Mangamuse</h1>
            <p>Explore the anime database with Jikan API</p>
          </Link>
        </div>
        <div className="header-actions">
          <button onClick={openRandomAnime} className="random-anime-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
              <path d="M7 16V4M7 4L3 8M7 4L11 8"></path>
              <path d="M17 8v12M17 20l4-4M17 20l-4-4"></path>
            </svg>
            Random Anime
          </button>
          <Link to="/search" className="search-advanced-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Advanced Search
          </Link>
          <div className="auth-nav">
            {isAuthenticated ? (
              <div className="user-menu">
                {nsfwAuthorized ? (
                  <div className="nsfw-toggle-container">
                    <label htmlFor="nsfw-toggle" className="nsfw-toggle-label">
                      NSFW {user?.showNSFW ? 'On' : 'Off'}
                    </label>
                    <div className="toggle-wrapper">
                      <input
                        id="nsfw-toggle"
                        type="checkbox"
                        className="nsfw-toggle-input"
                        checked={!!user?.showNSFW}
                        onChange={handleToggleNSFW}
                      />
                      <label htmlFor="nsfw-toggle" className="nsfw-toggle-slider"></label>
                    </div>
                  </div>
                ) : (
                  <div className="nsfw-access-info" onClick={() => setShowNsfwPopup(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="nsfw-lock-icon">
                      <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                    </svg>
                  </div>
                )}
                <span className="welcome-user">Welcome, {user?.username}</span>
                <Link to="/profile" className="auth-button profile-button">My Profile</Link>
                {isAdmin && (
                  <Link to="/admin" className="auth-button admin-button">Admin Panel</Link>
                )}
                <button onClick={logout} className="auth-button logout-button">Logout</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="auth-button login-button">Login</Link>
                <Link to="/register" className="auth-button register-button">Register</Link>
              </>
            )}
          </div>
          <div className="theme-toggle-container">
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      {/* NSFW Popup */}
      <div className={`nsfw-popup ${showNsfwPopup ? 'active' : ''}`}>
        <div className="nsfw-popup-content">
          <div className="nsfw-popup-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
            Restricted Content
          </div>
          <div className="nsfw-popup-message">
            This content is restricted. To access NSFW content, you need special authorization from an administrator. Please contact an administrator to request access.
          </div>
          <div className="nsfw-popup-buttons">
            <button className="nsfw-popup-close" onClick={() => setShowNsfwPopup(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const HomePage: React.FC = () => {
  const [trendingAnimes, setTrendingAnimes] = useState<Anime[]>([]);
  const [upcomingAnimes, setUpcomingAnimes] = useState<Anime[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const showNSFW = user?.showNSFW || false;
  const nsfwAuthorized = user?.nsfwAuthorized || false;
  
  // Check if NSFW display is actually allowed
  const canShowNSFW = useMemo(() => showNSFW && nsfwAuthorized, [showNSFW, nsfwAuthorized]);
  
  useEffect(() => {
    console.log(`HomePage: NSFW preference detected: ${showNSFW}, NSFW Authorization: ${nsfwAuthorized}, Can view NSFW: ${canShowNSFW}, user:`, user);
  }, [showNSFW, nsfwAuthorized, canShowNSFW, user]);

  const loadSlidersData = useCallback(async () => {
    try {
      setLoadingTrending(true);
      setLoadingUpcoming(true);
      
      console.log(`loadSlidersData: Loading with showNSFW=${showNSFW}, nsfwAuthorized=${nsfwAuthorized}, canShowNSFW=${canShowNSFW}`);
      
      // First, load trending anime
      const trendingResponse = await fetchTrendingAnimes(showNSFW, nsfwAuthorized);
      
      // Filter duplicates by mal_id for trending anime
      const trendingUniqueIds = new Set<number>();
      const filteredTrendingAnimes = trendingResponse.data.filter(anime => {
        if (trendingUniqueIds.has(anime.mal_id)) {
          return false;
        }
        trendingUniqueIds.add(anime.mal_id);
        return true;
      });
      
      setTrendingAnimes(filteredTrendingAnimes);
      setLoadingTrending(false);
      
      // Wait only 500ms between API calls instead of 2000ms
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then load upcoming anime
      const upcomingResponse = await fetchUpcomingAnimes(showNSFW, nsfwAuthorized);
      
      // Filter duplicates by mal_id for upcoming anime
      const upcomingUniqueIds = new Set<number>();
      const filteredUpcomingAnimes = upcomingResponse.data.filter(anime => {
        if (upcomingUniqueIds.has(anime.mal_id)) {
          return false;
        }
        upcomingUniqueIds.add(anime.mal_id);
        return true;
      });
      
      setUpcomingAnimes(filteredUpcomingAnimes);
      setLoadingUpcoming(false);
    } catch (err) {
      setError("An error occurred while retrieving data. This may be due to API rate limits. Please refresh after a few seconds.");
      console.error(err);
      setLoadingTrending(false);
      setLoadingUpcoming(false);
    }
  }, [showNSFW, nsfwAuthorized, canShowNSFW]);

  useEffect(() => {
    loadSlidersData();
  }, [loadSlidersData]); // Dépend uniquement de loadSlidersData qui contient déjà les dépendances nécessaires

  const handleRetry = useCallback(() => {
    setError(null);
    loadSlidersData();
  }, [loadSlidersData]);

  if (loadingTrending && loadingUpcoming && !error) {
    return <LoadingSpinner message="Loading anime collections..." />;
  }

  if (error && trendingAnimes.length === 0 && upcomingAnimes.length === 0) {
    return (
      <ErrorPage 
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <section className="sliders-section">
        <AnimeSlider 
          title="Trending Anime" 
          animes={trendingAnimes} 
          loading={loadingTrending} 
        />
        
        <AnimeSlider 
          title="Upcoming Anime" 
          animes={upcomingAnimes} 
          loading={loadingUpcoming} 
        />
      </section>
      
      <AnimeList />
    </>
  );
};

// Global error handling component
const GlobalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <ErrorPage 
        message="Something unexpected went wrong. Please try refreshing the page."
        actionText="Refresh Page"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <>{children}</>;
};

// Main App component
function AppContent() {
  return (
    <div className="app geometric-bg-2">
      <Header />
      
      <main className="main">
        <div className="container">
          <GlobalErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/anime/:id" element={<AnimeDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/search" element={<AdvancedSearch />} />
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              } />
              <Route path="*" element={
                <ErrorPage 
                  message="Page not found" 
                  actionText="Back to Home"
                />
              } />
            </Routes>
          </GlobalErrorBoundary>
        </div>
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>Data provided by <a href="https://jikan.moe/" target="_blank" rel="noopener noreferrer">Jikan API</a></p>
          <p className="copyright">© {new Date().getFullYear()} __Bios__. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Wrapper App with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 