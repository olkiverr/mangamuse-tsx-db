import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './ForumPage.css';

interface Subreddit {
  id: string;
  name: string;
  description: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  userId: string;
  username: string;
  likes: number;
  subredditId: string;
  subreddit: {
    name: string;
  };
  tags?: string;
}

const ForumPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [selectedSubreddit, setSelectedSubreddit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubreddits();
    fetchPosts();
  }, [selectedSubreddit]);

  const fetchSubreddits = async () => {
    try {
      const response = await fetch('/api/subreddits', {
        headers: {
          'user-id': user?.id || ''
        }
      });
      const data = await response.json();
      setSubreddits(data);
    } catch (error) {
      console.error('Erreur lors du chargement des subreddits:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const url = selectedSubreddit
        ? `/api/posts?subredditId=${selectedSubreddit}`
        : '/api/posts';
      const response = await fetch(url, {
        headers: {
          'user-id': user?.id || ''
        }
      });
      const data = await response.json();
      setPosts(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des posts:', error);
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    navigate('/forum/create');
  };

  const handleManageSubreddits = () => {
    navigate('/forum/manage');
  };

  return (
    <div className="forum-container">
      <div className="forum-header">
        <h1>Forum</h1>
        <div className="forum-actions">
          {user?.isAdmin && (
            <button
              className="manage-subreddits-button"
              onClick={handleManageSubreddits}
            >
              Gérer les Subreddits
            </button>
          )}
          <button className="create-post-button" onClick={handleCreatePost}>
            Créer un Post
          </button>
        </div>
      </div>

      <div className="subreddits-sidebar">
        <h2>Subreddits</h2>
        <div
          className={`subreddit-item ${!selectedSubreddit ? 'selected' : ''}`}
          onClick={() => setSelectedSubreddit(null)}
        >
          Tous les posts
        </div>
        {subreddits.map((subreddit) => (
          <div
            key={subreddit.id}
            className={`subreddit-item ${
              selectedSubreddit === subreddit.id ? 'selected' : ''
            }`}
            onClick={() => setSelectedSubreddit(subreddit.id)}
          >
            m/{subreddit.name}
          </div>
        ))}
      </div>

      <div className="posts-container">
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-card"
                onClick={() => navigate(`/forum/post/${post.id}`)}
              >
                <div className="post-header">
                  <span className="subreddit">m/{post.subreddit.name}</span>
                  <span className="author">Posté par {post.username}</span>
                </div>
                <h2 className="post-title">{post.title}</h2>
                <p className="post-content">{post.content}</p>
                <div className="post-footer">
                  <span className="post-date">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  <span className="post-likes">{post.likes} likes</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumPage; 