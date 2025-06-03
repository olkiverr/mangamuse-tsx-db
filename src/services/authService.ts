import { User } from '../types';

// Types pour le système d'authentification
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

// Clé utilisée pour stocker les données dans localStorage
const USERS_STORAGE_KEY = 'mangamuse_users';
const CURRENT_USER_KEY = 'mangamuse_current_user';
const PASSWORDS_STORAGE_KEY = 'mangamuse_passwords';
const ADMIN_INITIALIZED_KEY = 'mangamuse_admin_initialized';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Récupérer tous les utilisateurs du localStorage
const getUsers = (): User[] => {
  const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
  let users = usersJson ? JSON.parse(usersJson) : [];
  
  // Vérifier si l'utilisateur admin existe déjà
  if (!localStorage.getItem(ADMIN_INITIALIZED_KEY)) {
    const adminExists = users.some((user: User) => user.isAdmin);
    
    // Créer l'utilisateur admin s'il n'existe pas
    if (!adminExists) {
      const adminUser: User = {
        id: "admin-" + generateId(),
        username: "admin",
        email: "admin@mangamuse.com",
        createdAt: new Date().toISOString(),
        isAdmin: true,
        favorites: [],
        watched: [],
        showNSFW: false,
        nsfwAuthorized: true
      };
      
      users.push(adminUser);
      saveUsers(users);
      
      // Stocker le mot de passe admin
      const passwordsJson = localStorage.getItem(PASSWORDS_STORAGE_KEY) || '{}';
      const passwords = JSON.parse(passwordsJson);
      passwords[adminUser.id] = "admin";
      localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
      
      // Marquer l'admin comme initialisé
      localStorage.setItem(ADMIN_INITIALIZED_KEY, 'true');
    }
  }
  
  return users;
};

// Enregistrer tous les utilisateurs dans localStorage
const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

// Vérifier si un email est déjà utilisé
const isEmailTaken = (email: string): boolean => {
  const users = getUsers();
  return users.some(user => user.email.toLowerCase() === email.toLowerCase());
};

// Vérifier si un username est déjà utilisé
const isUsernameTaken = (username: string): boolean => {
  const users = getUsers();
  return users.some(user => user.username.toLowerCase() === username.toLowerCase());
};

// Générer un ID unique
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Récupérer l'utilisateur actuel du localStorage
export const getCurrentUser = (): User | null => {
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

// Enregistrer l'utilisateur actuel dans localStorage
const saveCurrentUser = (user: User): void => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

// Changer le mot de passe d'un utilisateur
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> => {
  try {
    // Validation basique
    if (!userId || !currentPassword || !newPassword) {
      return { success: false, message: "Tous les champs sont obligatoires" };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "Le nouveau mot de passe doit contenir au moins 6 caractères" };
    }

    const response = await fetch(`${API_URL}/auth/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (!response.ok) {
      let errorMessage = 'Erreur lors du changement de mot de passe';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error("Impossible de parser la réponse d'erreur:", e);
      }
      return { success: false, message: errorMessage };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Mot de passe changé avec succès"
    };
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Une erreur est survenue lors du changement de mot de passe" };
  }
};

// Changer le mot de passe d'un utilisateur (mode administrateur)
export const adminChangePassword = async (
  userId: string,
  newPassword: string
): Promise<AuthResponse> => {
  try {
    // Validation basique
    if (!userId || !newPassword) {
      return { success: false, message: "Tous les champs sont obligatoires" };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "Le nouveau mot de passe doit contenir au moins 6 caractères" };
    }

    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return { success: false, message: "Non autorisé" };
    }

    const response = await fetch(`${API_URL}/auth/admin-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.id
      },
      body: JSON.stringify({ userId, newPassword })
    });

    if (!response.ok) {
      let errorMessage = 'Erreur lors du changement de mot de passe';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error("Impossible de parser la réponse d'erreur:", e);
      }
      return { success: false, message: errorMessage };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message || "Mot de passe changé avec succès"
    };
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Une erreur est survenue lors du changement de mot de passe" };
  }
};

// S'inscrire - créer un nouveau compte
export const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de l'inscription",
    };
  }
};

// Se connecter
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.success && data.user) {
      // Stocker l'utilisateur dans le localStorage
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
    }
    return data;
  } catch (error) {
    console.error('Erreur de connexion:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la connexion',
    };
  }
};

// Se déconnecter
export const logout = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// Mettre à jour le profil utilisateur
export const updateProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<AuthResponse> => {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, message: "Utilisateur non connecté" };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

  try {
    console.log('Envoi de la requête updateProfile:', {
      userId,
      updates
    });

    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify(updates),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('Réponse du serveur (profile):', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorMessage = 'Erreur lors de la mise à jour du profil';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Détails de l\'erreur (profile):', errorData);
      } catch (e) {
        console.error('Impossible de parser la réponse d\'erreur (profile):', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Données reçues (profile):', data);

    // Si nous recevons directement les données de l'utilisateur
    if (data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return { success: true, message: data.message || "Profil mis à jour avec succès", user: data.user };
  }
  
    return { success: false, message: data.message || "Erreur lors de la mise à jour du profil" };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Erreur détaillée lors de la mise à jour du profil:', {
      error,
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, message: "La requête a expiré. Veuillez réessayer." };
  }
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour du profil" };
  }
};

// Ajouter/Supprimer un anime des favoris
export const toggleFavorite = async (animeId: number, title: string, imageUrl: string): Promise<AuthResponse> => {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, message: "Utilisateur non connecté" };
  }

  const userId = user.id;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

  console.log('Tentative de mise à jour des favoris:', {
    userId,
    animeId,
    title,
    imageUrl,
    apiUrl: `${API_URL}/auth/favorites`
  });

  try {
    const response = await fetch(`${API_URL}/auth/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify({ animeId, title, imageUrl }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('Réponse du serveur:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorMessage = 'Erreur lors de la mise à jour des favoris';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Détails de l\'erreur:', errorData);
      } catch (e) {
        console.error('Impossible de parser la réponse d\'erreur:', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Données reçues:', data);

    // Si nous recevons directement les données de l'utilisateur
    if (data.id && data.username) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      return { success: true, message: "Favoris mis à jour avec succès", user: data };
    }

    // Si nous recevons une réponse au format attendu
    if (data.success && data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return { success: true, message: "Favoris mis à jour avec succès", user: data.user };
    }

    return { success: false, message: data.message || "Erreur lors de la mise à jour des favoris" };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Erreur détaillée lors de la mise à jour des favoris:', {
      error,
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, message: "La requête a expiré. Veuillez réessayer." };
      }
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour des favoris" };
  }
};

// Vérifier si un anime est dans les favoris
export const isFavorite = (userId: string, animeId: number): boolean => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user || !user.favorites) {
    return false;
  }
  
  return user.favorites.includes(animeId);
};

// Ajouter ou supprimer des animes vus pour un utilisateur
export const toggleWatched = async (animeId: number, title: string, imageUrl: string): Promise<AuthResponse> => {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, message: "Utilisateur non connecté" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

  try {
    console.log('Envoi de la requête toggleWatched:', {
      userId: user.id,
      animeId,
      title,
      imageUrl
    });

    const response = await fetch(`${API_URL}/auth/watched`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': user.id
      },
      body: JSON.stringify({ animeId, title, imageUrl }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('Réponse du serveur (watched):', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorMessage = 'Erreur lors de la mise à jour des animes vus';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Détails de l\'erreur (watched):', errorData);
      } catch (e) {
        console.error('Impossible de parser la réponse d\'erreur (watched):', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Données reçues (watched):', data);

    // Si nous recevons directement les données de l'utilisateur
    if (data.id && data.username) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      return { success: true, message: "Liste des vus mise à jour avec succès", user: data };
    }

    // Si nous recevons une réponse au format attendu
    if (data.success && data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return { success: true, message: "Liste des vus mise à jour avec succès", user: data.user };
    }

    return { success: false, message: data.message || "Erreur lors de la mise à jour des animes vus" };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Erreur détaillée lors de la mise à jour des animes vus:', {
      error,
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, message: "La requête a expiré. Veuillez réessayer." };
      }
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour des animes vus" };
  }
};

// Vérifier si un anime est dans la liste des vus
export const isWatched = (userId: string, animeId: number): boolean => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  return user && user.watched ? user.watched.includes(animeId) : false;
};

// Récupérer tous les utilisateurs (pour l'admin)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.error('Aucun utilisateur connecté');
      return [];
    }

    const response = await fetch(`${API_URL}/auth/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.id
      },
    });

    if (!response.ok) {
      console.error('Erreur lors de la récupération des utilisateurs:', response.status);
      return [];
    }

    const data = await response.json();
    if (data.success) {
      return data.users;
    }
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return [];
  }
};

// Supprimer un utilisateur (pour l'admin)
export const deleteUser = async (userId: string): Promise<AuthResponse> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, message: "Non authentifié" };
    }

    if (!currentUser.isAdmin) {
      return { success: false, message: "Non autorisé" };
    }
    
    // Ne pas supprimer l'utilisateur admin
    if (userId.startsWith("admin-")) {
      return { success: false, message: "Impossible de supprimer le compte administrateur" };
    }
    
    const response = await fetch(`${API_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'user-id': currentUser.id
      }
    });

    if (!response.ok) {
      let errorMessage = "Erreur lors de la suppression de l'utilisateur";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error("Impossible de parser la réponse d'erreur:", e);
      }
      return { success: false, message: errorMessage };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message || "Utilisateur supprimé avec succès"
    };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Une erreur est survenue lors de la suppression de l'utilisateur" };
  }
};

// Autoriser ou révoquer l'accès NSFW d'un utilisateur (pour l'admin)
export const toggleUserNsfwAuthorization = async (
  userId: string
): Promise<AuthResponse> => {
  const user = getCurrentUser();
  if (!user || !user.isAdmin) {
    return { success: false, message: "Non autorisé" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

  try {
    console.log('Envoi de la requête toggleUserNsfwAuthorization:', {
      adminId: user.id,
      userId
    });

    const response = await fetch(`${API_URL}/auth/nsfw-authorization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': user.id
      },
      body: JSON.stringify({ userId }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('Réponse du serveur (nsfw-authorization):', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorMessage = 'Erreur lors de la modification des permissions NSFW';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Détails de l\'erreur (nsfw):', errorData);
      } catch (e) {
        console.error('Impossible de parser la réponse d\'erreur (nsfw):', e);
      }
      throw new Error(errorMessage);
  }
  
    const data = await response.json();
    console.log('Données reçues (nsfw):', data);

    if (data.success && data.user) {
  return {
    success: true,
        message: data.message || "Permissions NSFW modifiées avec succès", 
        user: data.user 
      };
    }

    return { 
      success: false, 
      message: data.message || "Erreur lors de la modification des permissions NSFW" 
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Erreur détaillée lors de la modification des permissions NSFW:', {
      error,
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, message: "La requête a expiré. Veuillez réessayer." };
      }
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la modification des permissions NSFW" };
  }
};

export const checkAuth = async (userId: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur de vérification:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la vérification',
    };
  }
}; 