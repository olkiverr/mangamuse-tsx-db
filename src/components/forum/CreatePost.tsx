import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './CreatePost.css';

interface Subreddit {
  id: string;
  name: string;
  description: string;
}

const CreatePost: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subredditId, setSubredditId] = useState('');
  const [tags, setTags] = useState('');
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubreddits();
  }, []);

  const fetchSubreddits = async () => {
    try {
      const response = await fetch('/api/subreddits');
      const data = await response.json();
      setSubreddits(data);
    } catch (error) {
      console.error('Erreur lors du chargement des subreddits:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Vous devez être connecté pour créer un post');
      return;
    }

    if (!subredditId) {
      setError('Veuillez sélectionner un subreddit');
      return;
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          subredditId,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du post');
      }

      navigate('/forum');
    } catch (err) {
      setError('Une erreur est survenue lors de la création du post');
    }
  };

  return (
    <div className="create-post-container">
      <h1>Créer un nouveau post</h1>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="create-post-form">
        <div className="form-group">
          <label htmlFor="subreddit">Subreddit</label>
          <select
            id="subreddit"
            value={subredditId}
            onChange={(e) => setSubredditId(e.target.value)}
            required
          >
            <option value="">Sélectionner un subreddit</option>
            {subreddits.map((subreddit) => (
              <option key={subreddit.id} value={subreddit.id}>
                m/{subreddit.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="title">Titre</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du post"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Contenu</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenu du post"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (séparés par des virgules)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tag1, tag2, tag3"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/forum')} className="cancel-button">
            Annuler
          </button>
          <button type="submit" className="submit-button">
            Créer le post
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost; 