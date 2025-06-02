import { PrismaClient, User as PrismaUser, Prisma } from '@prisma/client';
import { User } from '../types';
import { AuthResponse } from './authService';
import { createUser, getUserById, updateUser, addFavorite, removeFavorite, addWatched, updateWatchedEpisodes, addSearch, updateActivity } from './dbService';

const prisma = new PrismaClient();

// Fonction pour hacher le mot de passe (à implémenter avec bcrypt)
const hashPassword = (password: string): string => {
  // TODO: Implémenter le hachage avec bcrypt
  return password;
};

// Fonction pour vérifier le mot de passe
const verifyPassword = (password: string, hashedPassword: string): boolean => {
  // TODO: Implémenter la vérification avec bcrypt
  return password === hashedPassword;
};

// Connexion
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    if (!user) {
      return { success: false, message: "Email ou mot de passe incorrect" };
    }

    if (!(user as any).password || !verifyPassword(password, (user as any).password)) {
      return { success: false, message: "Email ou mot de passe incorrect" };
    }

    // Mettre à jour l'activité
    await prisma.activity.update({
      where: { userId: user.id },
      data: {
        logins: { increment: 1 },
        lastActive: new Date()
      }
    });

    return {
      success: true,
      message: "Connexion réussie",
      user: mapPrismaUserToUser(user)
    };
  } catch (error) {
    console.error("Erreur de connexion:", error);
    return { success: false, message: "Une erreur est survenue lors de la connexion" };
  }
};

// Inscription
export const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return { success: false, message: "Cet email ou nom d'utilisateur est déjà utilisé" };
    }

    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        activity: {
          create: {}
        }
      } as Prisma.UserCreateInput,
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    return {
      success: true,
      message: "Inscription réussie",
      user: mapPrismaUserToUser(user)
    };
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    return { success: false, message: "Une erreur est survenue lors de l'inscription" };
  }
};

// Déconnexion
export const logout = (): void => {
  // La déconnexion est gérée côté client
};

// Mettre à jour le profil
export const updateProfile = async (userId: string, updates: Partial<User>): Promise<AuthResponse> => {
  try {
    const { favorites, watched, ...userUpdates } = updates;
    const user = await prisma.user.update({
      where: { id: userId },
      data: userUpdates,
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    return {
      success: true,
      message: "Profil mis à jour avec succès",
      user: mapPrismaUserToUser(user)
    };
  } catch (error) {
    console.error("Erreur de mise à jour du profil:", error);
    return { success: false, message: "Une erreur est survenue lors de la mise à jour du profil" };
  }
};

// Ajouter/supprimer des favoris
export const toggleFavorite = async (userId: string, animeId: number, animeData: { title: string; imageUrl: string }): Promise<AuthResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    if (!user) {
      return { success: false, message: "Utilisateur non trouvé" };
    }

    const isFavorite = user.favorites.some(f => f.animeId === animeId);

    if (isFavorite) {
      await prisma.favorite.deleteMany({
        where: {
          userId,
          animeId
        }
      });
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          animeId,
          title: animeData.title,
          imageUrl: animeData.imageUrl
        }
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    if (!updatedUser) {
      return { success: false, message: "Erreur lors de la mise à jour des favoris" };
    }

    return {
      success: true,
      message: isFavorite ? "Anime retiré des favoris" : "Anime ajouté aux favoris",
      user: mapPrismaUserToUser(updatedUser)
    };
  } catch (error) {
    console.error("Erreur lors de la modification des favoris:", error);
    return { success: false, message: "Une erreur est survenue lors de la modification des favoris" };
  }
};

// Vérifier si un anime est en favoris
export const isFavorite = async (userId: string, animeId: number): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: true
      }
    });
    return user?.favorites.some(f => f.animeId === animeId) || false;
  } catch (error) {
    console.error("Erreur lors de la vérification des favoris:", error);
    return false;
  }
};

// Ajouter/supprimer des animes vus
export const toggleWatched = async (userId: string, animeId: number, animeData: { title: string; imageUrl: string }): Promise<AuthResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    if (!user) {
      return { success: false, message: "Utilisateur non trouvé" };
    }

    const isWatched = user.watched.some(w => w.animeId === animeId);

    if (isWatched) {
      await prisma.watched.deleteMany({
        where: {
          userId,
          animeId
        }
      });
    } else {
      await prisma.watched.create({
        data: {
          userId,
          animeId,
          title: animeData.title,
          imageUrl: animeData.imageUrl
        }
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    if (!updatedUser) {
      return { success: false, message: "Erreur lors de la mise à jour des animes vus" };
    }

    return {
      success: true,
      message: isWatched ? "Anime retiré de la liste des vus" : "Anime ajouté à la liste des vus",
      user: mapPrismaUserToUser(updatedUser)
    };
  } catch (error) {
    console.error("Erreur lors de la modification des animes vus:", error);
    return { success: false, message: "Une erreur est survenue lors de la modification des animes vus" };
  }
};

// Vérifier si un anime a été vu
export const isWatched = async (userId: string, animeId: number): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        watched: true
      }
    });
    return user?.watched.some(w => w.animeId === animeId) || false;
  } catch (error) {
    console.error("Erreur lors de la vérification des animes vus:", error);
    return false;
  }
};

// Changer le mot de passe
export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<AuthResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, message: "Utilisateur non trouvé" };
    }

    if (!(user as any).password || !verifyPassword(currentPassword, (user as any).password)) {
      return { success: false, message: "Mot de passe actuel incorrect" };
    }

    const hashedPassword = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword } as Prisma.UserUpdateInput
    });

    return { success: true, message: "Mot de passe modifié avec succès" };
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error);
    return { success: false, message: "Une erreur est survenue lors du changement de mot de passe" };
  }
};

// Changer le mot de passe (admin)
export const adminChangePassword = async (userId: string, newPassword: string): Promise<AuthResponse> => {
  try {
    const hashedPassword = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword } as Prisma.UserUpdateInput
    });

    return { success: true, message: "Mot de passe modifié avec succès" };
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error);
    return { success: false, message: "Une erreur est survenue lors du changement de mot de passe" };
  }
};

// Obtenir tous les utilisateurs (admin)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    return users.map(mapPrismaUserToUser);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return [];
  }
};

// Supprimer un utilisateur (admin)
export const deleteUser = async (userId: string): Promise<AuthResponse> => {
  try {
    await prisma.user.delete({
      where: { id: userId }
    });

    return { success: true, message: "Utilisateur supprimé avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return { success: false, message: "Une erreur est survenue lors de la suppression de l'utilisateur" };
  }
};

// Basculer l'autorisation NSFW d'un utilisateur (admin)
export const toggleUserNsfwAuthorization = async (userId: string): Promise<AuthResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, message: "Utilisateur non trouvé" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { nsfwAuthorized: !user.nsfwAuthorized }
    });

    return { success: true, message: "Autorisation NSFW modifiée avec succès" };
  } catch (error) {
    console.error("Erreur lors de la modification de l'autorisation NSFW:", error);
    return { success: false, message: "Une erreur est survenue lors de la modification de l'autorisation NSFW" };
  }
};

// Fonction utilitaire pour mapper un utilisateur Prisma vers un utilisateur de l'application
const mapPrismaUserToUser = (prismaUser: PrismaUser & {
  favorites: { animeId: number }[];
  watched: { animeId: number }[];
  activity: { id: string; userId: string; logins: number; searches: number; lastActive: Date } | null;
  searches: { id: string; userId: string; query: string; timestamp: Date }[];
}): User => {
  return {
    id: prismaUser.id,
    username: prismaUser.username,
    email: prismaUser.email,
    createdAt: prismaUser.createdAt.toISOString(),
    isAdmin: prismaUser.isAdmin,
    showNSFW: prismaUser.showNSFW,
    nsfwAuthorized: prismaUser.nsfwAuthorized,
    favorites: prismaUser.favorites.map(f => f.animeId),
    watched: prismaUser.watched.map(w => w.animeId)
  };
}; 