import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './SubredditManager.css';

interface Subreddit {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  admins: SubredditAdmin[];
}

interface SubredditAdmin {
  id: string;
  userId: string;
  username: string;
  role: string;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

const SubredditManager: React.FC = () => {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [newSubreddit, setNewSubreddit] = useState({ name: '', description: '' });
  const [selectedSubreddit, setSelectedSubreddit] = useState<Subreddit | null>(null);
  const [newAdmin, setNewAdmin] = useState({ username: '', role: 'moderator' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchSubreddits = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/subreddits`, {
        headers: {
          'user-id': user?.id || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setSubreddits(data);
      } else {
        console.error('Les données reçues ne sont pas un tableau:', data);
        setSubreddits([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des subreddits:', error);
      setError('Erreur lors du chargement des subreddits');
      setSubreddits([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchSubreddits();
    }
  }, [user]);

  const handleCreateSubreddit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/subreddits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user?.id || ''
        },
        body: JSON.stringify(newSubreddit),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Erreur lors de la création du subreddit');
      }

      await fetchSubreddits();
      setNewSubreddit({ name: '', description: '' });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du subreddit');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubreddit) return;

    try {
      const response = await fetch(`${API_BASE_URL}/subreddits/${selectedSubreddit.id}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user?.id || ''
        },
        body: JSON.stringify(newAdmin),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Erreur lors de l\'ajout de l\'administrateur');
      }

      await fetchSubreddits();
      setNewAdmin({ username: '', role: 'moderator' });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'ajout de l\'administrateur');
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!selectedSubreddit) return;

    try {
      const response = await fetch(`${API_BASE_URL}/subreddits/${selectedSubreddit.id}/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'user-id': user?.id || ''
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Erreur lors de la suppression de l\'administrateur');
      }

      await fetchSubreddits();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression de l\'administrateur');
    }
  };

  if (!user?.isAdmin) {
    return <div className="error-message">Accès non autorisé</div>;
  }

  if (isLoading) {
    return <div className="loading">Chargement des subreddits...</div>;
  }

  return (
    <div className="subreddit-manager">
      <h1>Gestion des Subreddits</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="subreddit-manager-content">
        <div className="subreddit-list">
          <h2>Liste des Subreddits</h2>
          {Array.isArray(subreddits) && subreddits.length > 0 ? (
            subreddits.map((subreddit) => (
              <div
                key={subreddit.id}
                className={`subreddit-item ${selectedSubreddit?.id === subreddit.id ? 'selected' : ''}`}
                onClick={() => setSelectedSubreddit(subreddit)}
              >
                <h3>m/{subreddit.name}</h3>
                <p>{subreddit.description}</p>
              </div>
            ))
          ) : (
            <p>Aucun subreddit trouvé</p>
          )}
        </div>

        <div className="subreddit-actions">
          <div className="create-subreddit">
            <h2>Créer un nouveau Subreddit</h2>
            <form onSubmit={handleCreateSubreddit}>
              <div className="form-group">
                <label htmlFor="name">Nom du Subreddit</label>
                <input
                  type="text"
                  id="name"
                  value={newSubreddit.name}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, name: e.target.value })}
                  placeholder="Nom du subreddit (sans m/)"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={newSubreddit.description}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, description: e.target.value })}
                  placeholder="Description du subreddit"
                  required
                />
              </div>
              <button type="submit" className="submit-button">Créer</button>
            </form>
          </div>

          {selectedSubreddit && (
            <div className="manage-admins">
              <h2>Gérer les Administrateurs de m/{selectedSubreddit.name}</h2>
              <form onSubmit={handleAddAdmin}>
                <div className="form-group">
                  <label htmlFor="username">Nom d'utilisateur</label>
                  <input
                    type="text"
                    id="username"
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    placeholder="Nom d'utilisateur"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role">Rôle</label>
                  <select
                    id="role"
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  >
                    <option value="moderator">Modérateur</option>
                    <option value="junior_moderator">Modérateur Junior</option>
                  </select>
                </div>
                <button type="submit" className="submit-button">Ajouter</button>
              </form>

              <div className="admins-list">
                <h3>Administrateurs actuels</h3>
                {selectedSubreddit.admins.map((admin) => (
                  <div key={admin.id} className="admin-item">
                    <span>{admin.username}</span>
                    <span className="admin-role">{admin.role}</span>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="remove-button"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubredditManager; 