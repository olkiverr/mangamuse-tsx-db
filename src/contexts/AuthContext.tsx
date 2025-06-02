import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  getCurrentUser, 
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  updateProfile as authUpdateProfile,
  toggleFavorite as authToggleFavorite,
  isFavorite as authIsFavorite,
  toggleWatched as authToggleWatched,
  isWatched as authIsWatched,
  changePassword as authChangePassword,
  adminChangePassword as authAdminChangePassword,
  getAllUsers as authGetAllUsers,
  deleteUser as authDeleteUser,
  toggleUserNsfwAuthorization as authToggleUserNsfwAuthorization,
  AuthResponse
} from '../services/authService';
import type { User } from '../types';

// Définir le type pour le contexte
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (username: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  updateProfile: (userId: string, updates: Partial<User>) => Promise<AuthResponse>;
  toggleFavorite: (animeId: number, title: string, imageUrl: string) => Promise<AuthResponse>;
  isFavorite: (animeId: number) => boolean;
  toggleWatched: (animeId: number, title: string, imageUrl: string) => Promise<AuthResponse>;
  isWatched: (animeId: number) => boolean;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<AuthResponse>;
  adminChangePassword: (userId: string, newPassword: string) => Promise<AuthResponse>;
  getAllUsers: () => Promise<User[]>;
  deleteUser: (userId: string) => Promise<AuthResponse>;
  toggleNSFW: () => Promise<AuthResponse>;
  toggleUserNsfwAuthorization: (userId: string) => Promise<AuthResponse>;
  canViewNSFW: () => boolean;
}

// Créer le contexte avec une valeur par défaut
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,
  login: async () => ({ success: false, message: "Context not initialized" }),
  register: async () => ({ success: false, message: "Context not initialized" }),
  logout: () => {},
  updateProfile: async () => ({ success: false, message: "Context not initialized" }),
  toggleFavorite: async () => ({ success: false, message: "Context not initialized" }),
  isFavorite: () => false,
  toggleWatched: async () => ({ success: false, message: "Context not initialized" }),
  isWatched: () => false,
  changePassword: async () => ({ success: false, message: "Context not initialized" }),
  adminChangePassword: async () => ({ success: false, message: "Context not initialized" }),
  getAllUsers: async () => [],
  deleteUser: async () => ({ success: false, message: "Context not initialized" }),
  toggleNSFW: async () => ({ success: false, message: "Context not initialized" }),
  toggleUserNsfwAuthorization: async () => ({ success: false, message: "Context not initialized" }),
  canViewNSFW: () => false,
});

// Props pour le AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Provider qui fournira le contexte à l'application
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Connexion
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await authLogin(email, password);
    if (response.success && response.user) {
      setUser(response.user);
    }
    return response;
  };

  // Inscription
  const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await authRegister(username, email, password);
    if (response.success && response.user) {
      setUser(response.user);
    }
    return response;
  };

  // Déconnexion
  const logout = (): void => {
    authLogout();
    setUser(null);
  };

  // Mettre à jour le profil
  const updateProfile = async (userId: string, updates: Partial<User>): Promise<AuthResponse> => {
    const response = authUpdateProfile(userId, updates);
    if (response.success && response.user && user?.id === userId) {
      setUser(response.user);
    }
    return response;
  };

  // Ajouter/supprimer des favoris
  const toggleFavorite = async (animeId: number, title: string, imageUrl: string): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, message: "Vous devez être connecté pour ajouter des favoris" };
    }
    
    try {
      console.log('Avant toggleFavorite - Favoris actuels:', user.favorites);
      const response = await authToggleFavorite(animeId, title, imageUrl);
      console.log('Réponse de toggleFavorite:', response);
      
      if (response.success && response.user) {
        console.log('Mise à jour de l\'utilisateur avec les nouveaux favoris:', response.user.favorites);
        setUser(response.user);
        // Mettre à jour le localStorage
        localStorage.setItem('mangamuse_current_user', JSON.stringify(response.user));
        return response;
      }
      return { success: false, message: response.message || "Erreur lors de la mise à jour des favoris" };
    } catch (error) {
      console.error('Erreur dans toggleFavorite:', error);
      return { success: false, message: "Erreur lors de la mise à jour des favoris" };
    }
  };

  // Vérifier si un anime est dans les favoris
  const isFavorite = (animeId: number): boolean => {
    if (!user || !user.favorites) {
      return false;
    }
    console.log('Vérification des favoris pour animeId:', animeId);
    console.log('Liste des favoris:', user.favorites);
    
    // Vérifier si l'anime est dans les favoris (soit comme ID, soit comme objet)
    return user.favorites.some(fav => {
      if (typeof fav === 'object' && fav !== null && 'animeId' in fav) {
        return (fav as { animeId: number }).animeId === animeId;
      }
      return fav === animeId;
    });
  };
  
  // Ajouter/supprimer des animes vus
  const toggleWatched = async (animeId: number, title: string, imageUrl: string): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, message: "Vous devez être connecté pour marquer comme vu" };
    }
    
    try {
      console.log('Avant toggleWatched - Animes vus actuels:', user.watched);
      const response = await authToggleWatched(animeId, title, imageUrl);
      console.log('Réponse de toggleWatched:', response);
      
      if (response.success && response.user) {
        console.log('Mise à jour de l\'utilisateur avec les nouveaux animes vus:', response.user.watched);
        setUser(response.user);
        // Mettre à jour le localStorage
        localStorage.setItem('mangamuse_current_user', JSON.stringify(response.user));
        return response;
      }
      return { success: false, message: response.message || "Erreur lors de la mise à jour des animes vus" };
    } catch (error) {
      console.error('Erreur dans toggleWatched:', error);
      return { success: false, message: "Erreur lors de la mise à jour des animes vus" };
    }
  };

  // Vérifier si un anime est dans les animes vus
  const isWatched = (animeId: number): boolean => {
    if (!user || !user.watched) {
      return false;
    }
    console.log('Vérification des animes vus pour animeId:', animeId);
    console.log('Liste des animes vus:', user.watched);
    
    // Vérifier si l'anime est dans les vus (soit comme ID, soit comme objet)
    return user.watched.some(watched => {
      if (typeof watched === 'object' && watched !== null && 'animeId' in watched) {
        return (watched as { animeId: number }).animeId === animeId;
      }
      return watched === animeId;
    });
  };
  
  // Changer le mot de passe
  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    return authChangePassword(userId, currentPassword, newPassword);
  };
  
  // Changer le mot de passe en mode administrateur
  const adminChangePassword = async (userId: string, newPassword: string): Promise<AuthResponse> => {
    return authAdminChangePassword(userId, newPassword);
  };
  
  // Récupérer tous les utilisateurs (pour l'admin)
  const getAllUsers = async (): Promise<User[]> => {
    return authGetAllUsers();
  };
  
  // Supprimer un utilisateur (pour l'admin)
  const deleteUser = async (userId: string): Promise<AuthResponse> => {
    return authDeleteUser(userId);
  };

  // Autoriser ou révoquer l'accès NSFW d'un utilisateur (pour l'admin)
  const toggleUserNsfwAuthorization = async (userId: string): Promise<AuthResponse> => {
    return authToggleUserNsfwAuthorization(userId);
  };

  // Basculer l'option NSFW
  const toggleNSFW = async (): Promise<AuthResponse> => {
    if (!user) {
      console.error("toggleNSFW: Tentative de toggle sans utilisateur connecté");
      return { success: false, message: "Vous devez être connecté pour modifier vos préférences" };
    }
    
    // S'assurer que showNSFW est boolean
    const currentValue = Boolean(user.showNSFW);
    const newNSFWValue = !currentValue;
    
    console.log(`toggleNSFW: État actuel=${currentValue}, nouvelle valeur=${newNSFWValue}`);
    
    const updates: Partial<User> = {
      showNSFW: newNSFWValue
    };
    
    try {
      const response = await authUpdateProfile(user.id, updates);
      console.log(`toggleNSFW: Résultat de la mise à jour:`, response);
      
      if (response.success && response.user) {
        console.log(`toggleNSFW: Mise à jour réussie, nouvel état showNSFW=${response.user.showNSFW}`);
        setUser(response.user);
        return { success: true, message: "Préférences NSFW mises à jour avec succès", user: response.user };
      } else {
        console.error(`toggleNSFW: Échec de la mise à jour:`, response.message);
        return { success: false, message: response.message || "Erreur lors de la mise à jour des préférences" };
      }
    } catch (error) {
      console.error("toggleNSFW: Error during update:", error);
      return { success: false, message: "Une erreur est survenue lors de la mise à jour des préférences" };
    }
  };

  // Vérifier si l'utilisateur peut voir le contenu NSFW
  const canViewNSFW = (): boolean => {
    if (!user) return false;
    return Boolean(user.nsfwAuthorized && user.showNSFW);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    toggleFavorite,
    isFavorite,
    toggleWatched,
    isWatched,
    changePassword,
    adminChangePassword,
    getAllUsers,
    deleteUser,
    toggleNSFW,
    toggleUserNsfwAuthorization,
    canViewNSFW
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 