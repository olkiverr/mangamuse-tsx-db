import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { fetchAnimeDetails } from '../services/animeService';
import './AdminPanel.css';

// Import the chart components at the top of the file
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface ServerStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
}

interface UserDetail {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  nsfwAuthorized: boolean;
  lastLogin: string;
  status: 'active' | 'inactive' | 'suspended';
  activity: {
    logins: number;
    searches: number;
    lastActive: string;
  };
  favoriteAnimes: {
    id: number;
    title: string;
    imageUrl: string;
    addedAt: string;
    rating?: number;
  }[];
  watchedAnimes: {
    id: number;
    title: string;
    imageUrl: string;
    watchedAt: string;
    episodesWatched?: number;
  }[];
  recentSearches: {
    query: string;
    timestamp: string;
  }[];
}

type ViewMode = 'table' | 'grid';
type UserFilter = 'all' | 'active' | 'inactive' | 'admin';

const AdminPanel: React.FC = () => {
  const { isAuthenticated, isAdmin, user, getAllUsers: authGetAllUsers, deleteUser, changePassword, adminChangePassword, updateProfile, toggleUserNsfwAuthorization } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | ''; }>({ text: '', type: '' });
  const [activeSection, setActiveSection] = useState<'dashboard' | 'users' | 'password'>('dashboard');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<UserFilter>('all');
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // Dashboard stats
  const [stats, setStats] = useState<StatCard[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus[]>([]);
  const [apiCalls, setApiCalls] = useState<{ endpoint: string, count: number }[]>([]);
  // Cache pour les animes
  const [animeCache, setAnimeCache] = useState<Record<number, any>>({});
  // État pour l'édition d'utilisateur
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    newPassword: '',
    isAdmin: false
  });
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  // Add these new states to the component
  const [activityData, setActivityData] = useState<{
    labels: string[];
    visits: number[];
    searches: number[];
    signups: number[];
  }>({ labels: [], visits: [], searches: [], signups: [] });
  
  const [genreDistribution, setGenreDistribution] = useState<{
    labels: string[];
    data: number[];
    backgroundColor: string[];
  }>({ labels: [], data: [], backgroundColor: [] });
  
  const [popularAnime, setPopularAnime] = useState<{
    title: string;
    viewCount: number;
    favoriteCount: number;
  }[]>([]);
  
  // Fonction pour charger les utilisateurs
  const loadUsers = async () => {
    if (!user) {
      console.error('Aucun utilisateur connecté');
      return;
    }

    setLoading(true);
    try {
      const users = await authGetAllUsers();
      setUsers(users);
      generateDashboardStats(users);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setMessage({ text: 'Erreur lors du chargement des utilisateurs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      navigate('/');
      return;
    }

    loadUsers();
    initDashboardData();
  }, [isAuthenticated, isAdmin, navigate]);

  // Add this function to initialize the dashboard data
  const initDashboardData = () => {
    // Simulate server status
    setServerStatus([
      { name: "Jikan API", status: 'online' },
      { name: "Database", status: 'online' },
      { name: "Web Server", status: 'online' },
      { name: "Cache Server", status: 'warning' }
    ]);

    // Simulate API calls
    setApiCalls([
      { endpoint: "/anime/trending", count: 2873 },
      { endpoint: "/anime/details", count: 1954 },
      { endpoint: "/anime/upcoming", count: 1245 },
      { endpoint: "/anime/staff", count: 724 },
      { endpoint: "/anime/characters", count: 653 }
    ]);
    
    // Generate simulated activity data for the last 7 days
    const labels = [];
    const visits = [];
    const searches = [];
    const signups = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      
      // Generate random data
      visits.push(Math.floor(Math.random() * 500) + 200);
      searches.push(Math.floor(Math.random() * 300) + 100);
      signups.push(Math.floor(Math.random() * 20) + 5);
    }
    
    setActivityData({ labels, visits, searches, signups });
    
    // Generate genre distribution data
    setGenreDistribution({
      labels: ['Action', 'Romance', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi'],
      data: [45, 25, 30, 20, 35, 15],
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)'
      ]
    });
    
    // Set popular anime
    setPopularAnime([
      { title: "Demon Slayer", viewCount: 1245, favoriteCount: 421 },
      { title: "Attack on Titan", viewCount: 1122, favoriteCount: 385 },
      { title: "Jujutsu Kaisen", viewCount: 987, favoriteCount: 347 },
      { title: "My Hero Academia", viewCount: 876, favoriteCount: 298 },
      { title: "One Piece", viewCount: 765, favoriteCount: 254 }
    ]);
  };

  // Generate dashboard statistics
  const generateDashboardStats = (users: User[]) => {
    // User statistics
    const totalUsers = users.length;
    const adminUsers = users.filter(user => user.isAdmin).length;
    const regularUsers = totalUsers - adminUsers;
    const activeUsers = Math.floor(totalUsers * 0.7); // Simulate active users (70% of total)
    
    // Update state
    setStats([
      {
        title: "Total Users",
        value: totalUsers,
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
        color: "#4361ee"
      },
      {
        title: "Administrators",
        value: adminUsers,
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 6 6 1-4.5 4.5 1 6-5.5-3-5.5 3 1-6L3 9l6-1 3-6z"/></svg>,
        color: "#3a0ca3"
      },
      {
        title: "Regular Users",
        value: regularUsers,
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
        color: "#4cc9f0"
      },
      {
        title: "Active Users",
        value: activeUsers,
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
        color: "#38b000"
      }
    ]);
  };

  // Delete a user
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action is irreversible.')) {
      try {
        const response = await deleteUser(userId);
        if (response.success) {
          setMessage({ text: response.message, type: 'success' });
          if (selectedUser && selectedUser.id === userId) {
            setSelectedUser(null);
          }
          loadUsers(); // Reload the list
        } else {
          setMessage({ text: response.message, type: 'error' });
        }
      } catch (error) {
        setMessage({ text: "An error occurred during deletion", type: 'error' });
      }
    }
  };

  // Format current date with time
  const formatCurrentDateTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return now.toLocaleDateString('en-US', options);
  };

  // Change password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Field validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ text: "All fields are required", type: 'error' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords don't match", type: 'error' });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ text: "New password must contain at least 6 characters", type: 'error' });
      return;
    }
    
    if (!user) {
      setMessage({ text: "User not logged in", type: 'error' });
      return;
    }
    
    try {
      const response = await changePassword(user.id, currentPassword, newPassword);
      if (response.success) {
        setMessage({ text: "Password changed successfully", type: 'success' });
        // Reset fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ text: response.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: "An error occurred while changing the password", type: 'error' });
    }
  };

  // Fonction pour récupérer les détails d'un anime avec cache
  const getAnimeDetails = async (animeId: number) => {
    // Vérifier si les détails sont déjà en cache
    if (animeCache[animeId]) {
      return animeCache[animeId];
    }
    
    try {
      // Récupérer depuis l'API
      const response = await fetchAnimeDetails(animeId);
      const animeData = response.data;
      
      // Mettre en cache
      setAnimeCache(prevCache => ({
        ...prevCache,
        [animeId]: animeData
      }));
      
      return animeData;
    } catch (error) {
      console.error(`Error retrieving anime details ${animeId}:`, error);
      throw error;
    }
  };

  // Optimisation de récupération des détails utilisateur avec cache
  const userDetailsCache = useRef<Record<string, UserDetail>>({});

  const getUserDetails = async (userId: string): Promise<UserDetail> => {
    // Vérifier si les détails utilisateur sont déjà en cache
    if (userDetailsCache.current[userId]) {
      console.log(`Using cached user details for ${userId}`);
      return userDetailsCache.current[userId];
    }
    
    // Si l'utilisateur n'est pas trouvé, renvoyer une erreur
    const userToDetail = users.find(u => u.id === userId);
    if (!userToDetail) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Simuler un délai réduit (juste pour démonstration)
    await new Promise(resolve => setTimeout(resolve, 200)); // Réduit de 500ms à 200ms
    
    // Générer des données utilisateur détaillées fictives
    const userDetail: UserDetail = {
      ...userToDetail,
      isAdmin: userToDetail.isAdmin ?? false,
      lastLogin: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      status: Math.random() > 0.2 ? 'active' : (Math.random() > 0.5 ? 'inactive' : 'suspended'),
      activity: {
        logins: Math.floor(Math.random() * 100) + 1,
        searches: Math.floor(Math.random() * 500) + 1,
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()
      },
      favoriteAnimes: [],
      watchedAnimes: [],
      recentSearches: [],
      nsfwAuthorized: userToDetail.nsfwAuthorized ?? false
    };
    
    // Générer des recherches récentes fictives
    const searchQueries = ['Naruto', 'One Piece', 'Attack on Titan', 'Demon Slayer', 'My Hero Academia', 'Dragon Ball'];
    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      userDetail.recentSearches.push({
        query: searchQueries[Math.floor(Math.random() * searchQueries.length)],
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)).toISOString()
      });
    }
    
    // Générer 0 à 5 favoris aléatoires
    for (let i = 0; i < Math.floor(Math.random() * 6); i++) {
      const animeId = Math.floor(Math.random() * 40000) + 1;
      try {
        // Vérifier si l'anime est déjà en cache
        const animeDetails = await getAnimeDetails(animeId);
        userDetail.favoriteAnimes.push({
          id: animeId,
          title: animeDetails.data.title,
          imageUrl: animeDetails.data.images.jpg.image_url,
          addedAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString(),
          rating: Math.floor(Math.random() * 5) + 1
        });
      } catch (error) {
        console.error(`Error fetching anime ${animeId}:`, error);
      }
    }
    
    // Générer 0 à 5 animes regardés aléatoires
    for (let i = 0; i < Math.floor(Math.random() * 6); i++) {
      const animeId = Math.floor(Math.random() * 40000) + 1;
      try {
        // Vérifier si l'anime est déjà en cache
        const animeDetails = await getAnimeDetails(animeId);
        userDetail.watchedAnimes.push({
          id: animeId,
          title: animeDetails.data.title,
          imageUrl: animeDetails.data.images.jpg.image_url,
          watchedAt: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)).toISOString(),
          episodesWatched: Math.floor(Math.random() * animeDetails.data.episodes || 12) + 1
        });
      } catch (error) {
        console.error(`Error fetching anime ${animeId}:`, error);
      }
    }
    
    // Mettre en cache les détails utilisateur
    userDetailsCache.current[userId] = userDetail;
    
    return userDetail;
  };

  // Optimisation de la sélection d'utilisateur
  const handleSelectUser = async (userId: string) => {
    if (selectedUser && selectedUser.id === userId) {
      return; // L'utilisateur est déjà sélectionné, ne rien faire
    }
    
    setLoadingUserDetails(true);
    try {
      const userDetail = await getUserDetails(userId);
      setSelectedUser(userDetail);
    } catch (error) {
      console.error("Error loading user details:", error);
      setMessage({ text: "An error occurred while loading user details", type: 'error' });
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Close user details view
  const handleCloseUserDetails = () => {
    setSelectedUser(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit', 
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: 'active' | 'inactive' | 'suspended') => {
    switch (status) {
      case 'active':
        return 'status-badge-success';
      case 'inactive':
        return 'status-badge-warning';
      case 'suspended':
        return 'status-badge-danger';
      default:
        return '';
    }
  };

  // Generate random avatar URL for a user
  const generateAvatarUrl = (userId: string, username: string) => {
    // Use dicebear avatars API with the username as seed
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  };

  // Optimisation avec useMemo pour filtrer les utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filtre de recherche
      const matchesSearch = searchQuery.trim() === '' || 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtre de statut
      let matchesFilter = true;
      if (activeFilter === 'admin') {
        matchesFilter = !!user.isAdmin;
      } else if (activeFilter === 'active' || activeFilter === 'inactive') {
        // Simuler le statut actif/inactif basé sur la date de création
        const userCreatedTime = new Date(user.createdAt).getTime();
        const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const isActive = userCreatedTime > oneMonthAgo;
        matchesFilter = (activeFilter === 'active' && isActive) || (activeFilter === 'inactive' && !isActive);
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, activeFilter]);

  // Get star rating display
  const renderRatingStars = (rating?: number) => {
    if (!rating) return null;
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="rating">
        {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} className="star full">★</span>)}
        {hasHalfStar && <span className="star half">★</span>}
        {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} className="star empty">☆</span>)}
      </div>
    );
  };

  // Handle modal close when clicking outside
  const handleModalOutsideClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && event.target === event.currentTarget) {
      handleCloseUserDetails();
    }
  };

  // Select a user and go directly to edit mode
  const handleEditUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering handleSelectUser
    try {
      // First load user details
      const userDetails = await getUserDetails(userId);
      setSelectedUser(userDetails);
      // Initialize edit form with user data
      setEditFormData({
        username: userDetails.username,
        email: userDetails.email,
        newPassword: '',
        isAdmin: !!userDetails.isAdmin
      });
      // Directly activate edit mode
      setIsEditing(true);
    } catch (error) {
      setMessage({ text: "Error loading user details", type: 'error' });
    }
  };

  // Add/remove body scroll lock when modal is shown
  useEffect(() => {
    if (selectedUser) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    
    // Cleanup function
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [selectedUser]);

  // Update a user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      setLoadingUpdate(true);
      
      // Prepare updates
      const updates: Partial<User> = {};
      
      // Check which fields have been modified
      if (editFormData.username !== selectedUser.username) {
        updates.username = editFormData.username;
      }
      
      if (editFormData.email !== selectedUser.email) {
        updates.email = editFormData.email;
      }
      
      if (editFormData.isAdmin !== selectedUser.isAdmin) {
        updates.isAdmin = editFormData.isAdmin;
      }
      
      // Update user profile
      if (Object.keys(updates).length > 0) {
        const updateResponse = await updateProfile(selectedUser.id, updates);
        
        if (!updateResponse.success) {
          setMessage({ text: updateResponse.message, type: 'error' });
          return;
        }
      }
      
      // Change password if a new one is provided
      if (editFormData.newPassword) {
        const passwordResponse = await adminChangePassword(selectedUser.id, editFormData.newPassword);
        
        if (!passwordResponse.success) {
          setMessage({ text: passwordResponse.message, type: 'error' });
          return;
        }
      }
      
      // Refresh data
      loadUsers();
      
      // Update user details
      if (selectedUser) {
        const updatedDetails = await getUserDetails(selectedUser.id);
        setSelectedUser(updatedDetails);
      }
      
      setMessage({ text: "User updated successfully", type: 'success' });
      setIsEditing(false);
    } catch (error) {
      setMessage({ text: "Error updating user", type: 'error' });
    } finally {
      setLoadingUpdate(false);
    }
  };

  // Initializer edit form
  const handleStartEditing = () => {
    if (selectedUser) {
      setEditFormData({
        username: selectedUser.username,
        email: selectedUser.email,
        newPassword: '',
        isAdmin: !!selectedUser.isAdmin
      });
      setIsEditing(true);
    }
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  // Handle form changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // Autoriser ou révoquer l'accès NSFW d'un utilisateur
  const handleToggleNsfwAuthorization = async (userId: string) => {
    try {
      const response = await toggleUserNsfwAuthorization(userId);
      if (response.success) {
        setMessage({ text: response.message, type: 'success' });
        loadUsers(); // Recharger la liste des utilisateurs
        
        // Si l'utilisateur est actuellement sélectionné, mettre à jour ses détails
        if (selectedUser && selectedUser.id === userId && response.user) {
          setSelectedUser({
            ...selectedUser,
            nsfwAuthorized: Boolean(response.user.nsfwAuthorized)
          });
        }
      } else {
        setMessage({ text: "An error occurred while modifying permissions", type: 'error' });
      }
    } catch (error) {
      setMessage({ text: "An error occurred while modifying permissions", type: 'error' });
    }
  };

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button className="close-message" onClick={() => setMessage({ text: '', type: '' })}>×</button>
        </div>
      )}
      
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeSection === 'dashboard' ? 'active' : ''}`} 
          onClick={() => setActiveSection('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`admin-tab ${activeSection === 'users' ? 'active' : ''}`} 
          onClick={() => setActiveSection('users')}
        >
          User Management
        </button>
        <button 
          className={`admin-tab ${activeSection === 'password' ? 'active' : ''}`} 
          onClick={() => setActiveSection('password')}
        >
          Change Password
        </button>
      </div>
      
      {activeSection === 'dashboard' && (
        <div className="dashboard-section">
          <h2>Dashboard</h2>
          
          {loading ? (
            <p className="loading-text">Loading data...</p>
          ) : (
            <>
              <div className="stat-cards-container">
                {stats.map((stat, index) => (
                  <div 
                    key={index} 
                    className="stat-card" 
                    style={{ borderColor: stat.color }}
                  >
                    <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                      {stat.icon}
                    </div>
                    <div className="stat-info">
                      <h3>{stat.title}</h3>
                      <div className="stat-value">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* User Activity Chart */}
              <div className="dashboard-chart-section">
                <h3>User Activity (Last 7 Days)</h3>
                <div className="chart-container">
                  <Line 
                    data={{
                      labels: activityData.labels,
                      datasets: [
                        {
                          label: 'Page Visits',
                          data: activityData.visits,
                          borderColor: 'rgb(53, 162, 235)',
                          backgroundColor: 'rgba(53, 162, 235, 0.5)',
                          tension: 0.3
                        },
                        {
                          label: 'Searches',
                          data: activityData.searches,
                          borderColor: 'rgb(75, 192, 192)',
                          backgroundColor: 'rgba(75, 192, 192, 0.5)',
                          tension: 0.3
                        },
                        {
                          label: 'New Users',
                          data: activityData.signups,
                          borderColor: 'rgb(255, 99, 132)',
                          backgroundColor: 'rgba(255, 99, 132, 0.5)',
                          tension: 0.3
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: false
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="dashboard-grid">
                {/* System Info */}
                <div className="dashboard-card system-card">
                  <h3>System Information</h3>
                  <div className="system-info">
                    <div className="info-item">
                      <span className="info-label">API Version:</span>
                      <span className="info-value">Jikan v4</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Browser:</span>
                      <span className="info-value">{navigator.userAgent.split(') ')[0].split(' (')[0]}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">System:</span>
                      <span className="info-value">{navigator.platform || "Not detected"}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Date and time:</span>
                      <span className="info-value">{formatCurrentDateTime()}</span>
                    </div>
                  </div>
                </div>

                {/* Server Status */}
                <div className="dashboard-card server-status-card">
                  <h3>Server Status</h3>
                  <div className="server-status-list">
                    {serverStatus.map((server, index) => (
                      <div key={index} className="server-status-item">
                        <span className="server-name">{server.name}</span>
                        <span className={`server-indicator ${server.status}`}>
                          {server.status === 'online' ? 'Online' : 
                           server.status === 'warning' ? 'Warning' : 'Offline'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* API Calls */}
                <div className="dashboard-card api-calls-card">
                  <h3>Top API Endpoints</h3>
                  <div className="api-calls-list">
                    {apiCalls.map((apiCall, index) => (
                      <div key={index} className="api-call-item">
                        <span className="api-endpoint">{apiCall.endpoint}</span>
                        <span className="api-count">{apiCall.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {activeSection === 'users' && (
        <div className="users-section">
          <h2>User Management</h2>
          
          <div className="users-controls">
            <div className="search-filter-container">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="user-search-input"
                />
                {searchQuery && (
                  <button 
                    className="clear-search" 
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="filter-buttons">
                <button 
                  className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`filter-button ${activeFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('active')}
                >
                  Active
                </button>
                <button 
                  className={`filter-button ${activeFilter === 'inactive' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('inactive')}
                >
                  Inactive
                </button>
                <button 
                  className={`filter-button ${activeFilter === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('admin')}
                >
                  Admins
                </button>
              </div>
            </div>
            
            <div className="view-toggle">
              <button 
                className={`view-button ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                aria-label="Table view"
              >
                <span className="view-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </span>
              </button>
              <button 
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <span className="view-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </span>
              </button>
            </div>
          </div>
          
          {loading ? (
            <p className="loading-text">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <div className="no-results">
              <p className="no-data">No users found</p>
              {searchQuery && (
                <p>Try adjusting your search or filters</p>
              )}
              <button 
                className="reset-filters-button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="users-management">
              <div className={`users-list-container ${viewMode}`}>
                {viewMode === 'table' ? (
                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Created</th>
                          <th>Role</th>
                          <th>NSFW Access</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((userItem) => (
                          <tr 
                            key={userItem.id}
                            className={`user-row ${selectedUser && selectedUser.id === userItem.id ? 'selected' : ''}`}
                            onClick={() => !userItem.isAdmin && handleSelectUser(userItem.id)}
                          >
                            <td className="user-cell">
                              <img 
                                src={generateAvatarUrl(userItem.id, userItem.username)} 
                                alt={userItem.username}
                                className="user-avatar"
                              />
                              <span>{userItem.username}</span>
                            </td>
                            <td>{userItem.email}</td>
                            <td className="date-cell">{new Date(userItem.createdAt).toLocaleDateString()}</td>
                            <td>
                              <span className={`role-badge ${userItem.isAdmin ? 'admin' : 'user'}`}>
                                {userItem.isAdmin ? 'Admin' : 'User'}
                              </span>
                            </td>
                            <td>
                              <span className={`nsfw-badge ${userItem.nsfwAuthorized ? 'authorized' : 'unauthorized'}`}>
                                {userItem.nsfwAuthorized ? 'Authorized' : 'Unauthorized'}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="action-button view-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectUser(userItem.id);
                                  }}
                                >
                                  See
                                </button>
                                <button 
                                  className="action-button edit-button"
                                  onClick={(e) => handleEditUser(userItem.id, e)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="action-button nsfw-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleNsfwAuthorization(userItem.id);
                                  }}
                                >
                                  NSFW
                                  {userItem.nsfwAuthorized ? 
                                    <i className="fas fa-ban"></i> : 
                                    <i className="fas fa-check"></i>
                                  }
                                </button>
                                {!userItem.isAdmin && (
                                  <button 
                                    className="action-button delete-button" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUser(userItem.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="users-grid">
                    {filteredUsers.map((userItem) => (
                      <div 
                        key={userItem.id}
                        className={`user-card ${selectedUser && selectedUser.id === userItem.id ? 'selected' : ''}`}
                        onClick={() => !userItem.isAdmin && handleSelectUser(userItem.id)}
                      >
                        <div className="user-card-header">
                          <img 
                            src={generateAvatarUrl(userItem.id, userItem.username)} 
                            alt={userItem.username}
                            className="user-avatar-large"
                          />
                          <span className={`role-badge ${userItem.isAdmin ? 'admin' : 'user'}`}>
                            {userItem.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </div>
                        <div className="user-card-body">
                          <h4>{userItem.username}</h4>
                          <p className="user-email">{userItem.email}</p>
                          <p className="user-created">Joined {new Date(userItem.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="user-card-actions">
                          <button 
                            className="action-button view-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectUser(userItem.id);
                            }}
                          >
                            See
                          </button>
                          <button 
                            className="action-button edit-button"
                            onClick={(e) => handleEditUser(userItem.id, e)}
                          >
                            Edit
                          </button>
                          <button 
                            className="action-button nsfw-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleNsfwAuthorization(userItem.id);
                            }}
                          >
                            NSFW
                            {userItem.nsfwAuthorized ? 
                              <i className="fas fa-ban"></i> : 
                              <i className="fas fa-check"></i>
                            }
                          </button>
                          {!userItem.isAdmin && (
                            <button 
                              className="action-button delete-button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(userItem.id);
                              }}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Modal for user details */}
      {selectedUser && (
        <div className="modal-overlay" onClick={handleModalOutsideClick}>
          <div className="user-details-modal" ref={modalRef}>
            <div className="user-details-header">
              <h3>User Details</h3>
              <button 
                className="close-details-button"
                onClick={handleCloseUserDetails}
              >
                ×
              </button>
            </div>
            
            {loadingUserDetails ? (
              <div className="user-details-content">
                <p className="loading-text">Loading details...</p>
              </div>
            ) : (
              <div className="user-details-content">
                <div className="user-profile-section">
                  <div className="user-profile-header">
                    <img 
                      src={generateAvatarUrl(selectedUser.id, selectedUser.username)} 
                      alt={selectedUser.username} 
                      className="user-avatar-xl"
                    />
                    <div className="user-profile-info">
                      <h4 className="user-profile-name">{selectedUser.username}</h4>
                      <p className="user-profile-email">{selectedUser.email}</p>
                      <div className="user-profile-badges">
                        <span className={`role-badge ${selectedUser.isAdmin ? 'admin' : 'user'}`}>
                          {selectedUser.isAdmin ? 'Admin' : 'User'}
                        </span>
                        <span className={`status-badge ${getStatusBadgeClass(selectedUser.status)}`}>
                          {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                        </span>
                        <span className={`nsfw-badge ${selectedUser.nsfwAuthorized ? 'authorized' : 'unauthorized'}`}>
                          NSFW: {selectedUser.nsfwAuthorized ? 'Authorized' : 'Unauthorized'}
                        </span>
                      </div>
                      {!isEditing && (
                        <button 
                          className="edit-user-button"
                          onClick={handleStartEditing}
                        >
                          Edit User
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="user-activity-section">
                  <h4>Activity Overview</h4>
                  <div className="activity-stats">
                    <div className="activity-stat-item">
                      <span className="activity-stat-value">{selectedUser.activity.logins}</span>
                      <span className="activity-stat-label">Logins</span>
                    </div>
                    <div className="activity-stat-item">
                      <span className="activity-stat-value">{selectedUser.activity.searches}</span>
                      <span className="activity-stat-label">Searches</span>
                    </div>
                    <div className="activity-stat-item">
                      <span className="activity-stat-value">{selectedUser.favoriteAnimes.length}</span>
                      <span className="activity-stat-label">Favorites</span>
                    </div>
                    <div className="activity-stat-item">
                      <span className="activity-stat-value">{selectedUser.watchedAnimes.length}</span>
                      <span className="activity-stat-label">Watched</span>
                    </div>
                  </div>
                  <div className="activity-dates">
                    <div className="info-row">
                      <span className="info-label">Registration date:</span>
                      <span className="info-value">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Last login:</span>
                      <span className="info-value">{formatDate(selectedUser.lastLogin)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Last activity:</span>
                      <span className="info-value">{formatDate(selectedUser.activity.lastActive)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="user-favorites-section">
                  <h4>Favorite Animes</h4>
                  {selectedUser.favoriteAnimes.length === 0 ? (
                    <p className="no-data">No favorite animes</p>
                  ) : (
                    <div className="favorites-grid">
                      {selectedUser.favoriteAnimes.map((anime) => (
                        <div key={anime.id} className="favorite-anime-card">
                          <div className="favorite-anime-image-container">
                            <img 
                              src={anime.imageUrl} 
                              alt={anime.title} 
                              className="favorite-anime-image"
                            />
                          </div>
                          <div className="favorite-anime-info">
                            <p className="favorite-anime-title">{anime.title}</p>
                            {renderRatingStars(anime.rating)}
                            <p className="favorite-anime-date">Added on {formatDate(anime.addedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="user-watched-animes-section">
                  <h4>Watched Animes</h4>
                  {selectedUser.watchedAnimes.length === 0 ? (
                    <p className="no-data">No watched animes</p>
                  ) : (
                    <div className="watched-animes-list">
                      {selectedUser.watchedAnimes.map((anime) => (
                        <div key={anime.id} className="watched-anime-item">
                          <div className="watched-anime-image-container">
                            <img 
                              src={anime.imageUrl} 
                              alt={anime.title} 
                              className="watched-anime-image"
                            />
                          </div>
                          <div className="watched-anime-info">
                            <p className="watched-anime-title">{anime.title}</p>
                            <p className="watched-anime-date">Watched on {formatDate(anime.watchedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="user-searches-section">
                  <h4>Recent Searches</h4>
                  {selectedUser.recentSearches.length === 0 ? (
                    <p className="no-data">No recent searches</p>
                  ) : (
                    <div className="recent-searches-list">
                      {selectedUser.recentSearches.map((search, index) => (
                        <div key={index} className="search-item">
                          <span className="search-query">{search.query}</span>
                          <span className="search-time">Searched on {formatDate(search.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <div className="edit-user-form-container">
                    <h4>Edit User Information</h4>
                    <form onSubmit={handleUpdateUser} className="edit-user-form">
                      <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={editFormData.username}
                          onChange={handleEditFormChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={editFormData.email}
                          onChange={handleEditFormChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input
                          type="password"
                          id="newPassword"
                          name="newPassword"
                          value={editFormData.newPassword}
                          onChange={handleEditFormChange}
                          placeholder="Leave empty to keep current password"
                        />
                      </div>

                      <div className="form-group checkbox-group">
                        <input
                          type="checkbox"
                          id="isAdmin"
                          name="isAdmin"
                          checked={editFormData.isAdmin}
                          onChange={handleEditFormChange}
                        />
                        <label htmlFor="isAdmin">Administrator</label>
                      </div>

                      <div className="form-actions">
                        <button type="submit" className="save-button" disabled={loadingUpdate}>
                          {loadingUpdate ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button 
                          type="button" 
                          className="cancel-button" 
                          onClick={handleCancelEditing}
                          disabled={loadingUpdate}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeSection === 'password' && (
        <div className="password-section">
          <h2>Change My Password</h2>
          
          <form className="password-form" onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current password</label>
              <input 
                type="password" 
                id="currentPassword" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New password</label>
              <input 
                type="password" 
                id="newPassword" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
            </div>
            
            <button type="submit" className="submit-button">
              Change Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel; 