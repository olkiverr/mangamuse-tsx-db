import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';
import { fetchAnimeDetails, Anime } from '../services/animeService';
import LoadingSpinner from './LoadingSpinner';
import AnimeCard from './AnimeCard';
import './Profile.css';

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
  
  // États pour le changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      loadFavoriteAnimes();
      loadWatchedAnimes();
    }
  }, [user?.favorites, user?.watched]);

  const loadFavoriteAnimes = async () => {
    if (!user || !user.favorites || user.favorites.length === 0) {
      setFavoriteAnimes([]);
      return;
    }

    setLoadingFavorites(true);
    const animes: Anime[] = [];

    try {
      // Load details for each favorite anime
      // To avoid API rate limiting, add a delay between requests
      for (const favorite of user.favorites) {
        try {
          // Extraire l'ID de l'anime de l'objet favorite
          const animeId = typeof favorite === 'object' ? (favorite as Favorite).animeId : favorite;
          console.log('Loading favorite anime with ID:', animeId);
          
          const response = await fetchAnimeDetails(animeId);
          animes.push(response.data);
          
          // Small pause between each request to avoid rate limiting issues
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error loading anime ${favorite}:`, error);
        }
      }
      
      setFavoriteAnimes(animes);
    } catch (error) {
      console.error("Error loading favorite animes:", error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const loadWatchedAnimes = async () => {
    if (!user || !user.watched || user.watched.length === 0) {
      setWatchedAnimes([]);
      return;
    }

    setLoadingWatched(true);
    const animes: Anime[] = [];

    try {
      // Load details for each watched anime
      // To avoid API rate limiting, add a delay between requests
      for (const watched of user.watched) {
        try {
          // Extraire l'ID de l'anime de l'objet watched
          const animeId = typeof watched === 'object' ? (watched as Favorite).animeId : watched;
          console.log('Loading watched anime with ID:', animeId);
          
          const response = await fetchAnimeDetails(animeId);
          animes.push(response.data);
          
          // Small pause between each request to avoid rate limiting issues
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error loading anime ${watched}:`, error);
        }
      }
      
      setWatchedAnimes(animes);
    } catch (error) {
      console.error("Error loading watched animes:", error);
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
      
      // Only update if something changed
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
    
    // Validation
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
        // Reset fields
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