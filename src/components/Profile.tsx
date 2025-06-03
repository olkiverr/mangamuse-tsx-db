import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import './Auth.css';
import { fetchAnimeDetails, Anime } from '../services/animeService';
import LoadingSpinner from './LoadingSpinner';
import AnimeCard from './AnimeCard';
import './Profile.css';
import { checkAuth } from '../services/authService';

interface Favorite {
  animeId: number;
  title: string;
  imageUrl: string;
}

const Profile: React.FC = () => {
  const { user, isAuthenticated, updateProfile, logout, changePassword } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [favoriteAnimes, setFavoriteAnimes] = useState<Anime[]>([]);
  const [watchedAnimes, setWatchedAnimes] = useState<Anime[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingWatched, setLoadingWatched] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [refreshing, setRefreshing] = useState(false);
  
  // États pour le changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Fonction pour rafraîchir les données utilisateur
  const refreshUserData = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      const response = await checkAuth(user.id);
      
      if (response.success && response.user) {
        localStorage.setItem('mangamuse_current_user', JSON.stringify(response.user));
        
        if (response.user.favorites) {
          loadFavoriteAnimes(response.user);
        }
        
        if (response.user.watched) {
          loadWatchedAnimes(response.user);
        }
      }
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement des données utilisateur:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      // Rafraîchir les données au chargement de la page
      refreshUserData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadFavoriteAnimes();
      loadWatchedAnimes();
    }
  }, [user?.favorites, user?.watched]);

  const loadFavoriteAnimes = async (currentUser = user) => {
    if (!currentUser || !currentUser.favorites || currentUser.favorites.length === 0) {
      setFavoriteAnimes([]);
      return;
    }

    setLoadingFavorites(true);
    const animes: Anime[] = [];

    try {
      for (const favorite of currentUser.favorites) {
        try {
          const animeId = typeof favorite === 'object' ? (favorite as Favorite).animeId : favorite;
          
          const response = await fetchAnimeDetails(animeId);
          animes.push(response.data);
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          logger.error(`Error loading anime ${favorite}:`, error);
        }
      }
      
      setFavoriteAnimes(animes);
    } catch (error) {
      logger.error("Error loading favorite animes:", error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const loadWatchedAnimes = async (currentUser = user) => {
    if (!currentUser || !currentUser.watched || currentUser.watched.length === 0) {
      setWatchedAnimes([]);
      return;
    }

    setLoadingWatched(true);
    const animes: Anime[] = [];

    try {
      for (const watched of currentUser.watched) {
        try {
          const animeId = typeof watched === 'object' ? (watched as Favorite).animeId : watched;
          
          const response = await fetchAnimeDetails(animeId);
          animes.push(response.data);
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          logger.error(`Error loading anime ${watched}:`, error);
        }
      }
      
      setWatchedAnimes(animes);
    } catch (error) {
      logger.error("Error loading watched animes:", error);
    } finally {
      setLoadingWatched(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!username || !email) {
      setError('Please fill in all fields');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      const updates = {
        username: username !== user.username ? username : undefined,
        email: email !== user.email ? email : undefined
      };
      
      if (updates.username || updates.email) {
        const response = await updateProfile(user.id, updates);
        
        if (response.success) {
          setSuccess('Profile successfully updated');
          setIsEditing(false);
        } else {
          setError(response.message);
        }
      } else {
        setSuccess('No changes detected');
        setIsEditing(false);
      }
    } catch (err) {
      setError('An error occurred while updating the profile');
      console.error('Profile update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setChangingPassword(true);
    
    try {
      const response = await changePassword(user.id, currentPassword, newPassword);
      
      if (response.success) {
        setSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('An error occurred while changing the password');
      console.error('Password change error:', err);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Redirect to login page if user is not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>My Profile</h2>
        <div className="profile-actions-top">
          <button 
            className="refresh-button" 
            onClick={refreshUserData}
            disabled={refreshing}
            title="Rafraîchir les données"
          >
            {refreshing ? "Rafraîchissement..." : "Rafraîchir"}
          </button>
        </div>
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Information
          </button>
          <button 
            className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Password
          </button>
        </div>
      </div>
      
      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}
      
      {activeTab === 'profile' && (
        <>
          <div className="profile-card">
            {!isEditing && (
              <button 
                className="profile-edit-button"
                onClick={handleEdit}
              >
                Edit
              </button>
            )}
            
            {isEditing ? (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="profile-actions">
                  <button 
                    type="submit" 
                    className="auth-submit-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save changes'}
                  </button>
                  
                  <button 
                    type="button" 
                    className="auth-cancel-button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="profile-item">
                  <span className="profile-label">Username:</span>
                  <span className="profile-value">{user?.username}</span>
                </div>
                
                <div className="profile-item">
                  <span className="profile-label">Email:</span>
                  <span className="profile-value">{user?.email}</span>
                </div>
                
                <div className="profile-item">
                  <span className="profile-label">Member since:</span>
                  <span className="profile-value">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : 'N/A'}
                  </span>
                </div>
                
                <button 
                  className="auth-logout-button"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
          
          <div className="favorite-animes-section">
            <h3>My favorite animes</h3>
            
            {loadingFavorites ? (
              <div className="loading-favorites">
                <LoadingSpinner message="Loading your favorites..." />
              </div>
            ) : favoriteAnimes.length > 0 ? (
              <div className="favorites-grid">
                {favoriteAnimes.map(anime => (
                  <div key={anime.mal_id} className="favorite-anime-card">
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-favorites">
                <p>You don't have any favorite animes yet.</p>
                <p>Explore the collection and add animes to your favorites!</p>
              </div>
            )}
          </div>
          
          <div className="watched-animes-section">
            <h3>My watched animes</h3>
            
            {loadingWatched ? (
              <div className="loading-watched">
                <LoadingSpinner message="Loading your watched animes..." />
              </div>
            ) : watchedAnimes.length > 0 ? (
              <div className="watched-grid">
                {watchedAnimes.map(anime => (
                  <div key={anime.mal_id} className="watched-anime-card">
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-watched">
                <p>You haven't marked any animes as watched yet.</p>
                <p>Explore the collection and mark animes you've watched!</p>
              </div>
            )}
          </div>
        </>
      )}
      
      {activeTab === 'password' && (
        <div className="password-section">
          <div className="profile-card">
            <h3>Change my password</h3>
            
            <form className="auth-form" onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label htmlFor="current-password">Current password</label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={changingPassword}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="new-password">New password</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changingPassword}
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="auth-submit-button"
                disabled={changingPassword}
              >
                {changingPassword ? 'Changing password...' : 'Change password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 