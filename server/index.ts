import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import bcryptjs from 'bcryptjs';

interface Post {
  id: string;
  title: string;
  content: string;
  subredditId: string;
  tags: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  username?: string;
  subreddit_name?: string;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  username?: string;
}

interface Subreddit {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  admins?: Array<{
    id: string;
    userId: string;
    username: string;
    role: string;
    createdAt: Date;
  }>;
}

interface SubredditAdmin {
  id: string;
  subredditId: string;
  userId: string;
  role: string;
  createdAt: Date;
  username?: string;
}

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// Fonction utilitaire pour formater l'utilisateur pour le client
const formatUserForClient = (user: any) => {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    isAdmin: user.isAdmin,
    showNSFW: user.showNSFW,
    nsfwAuthorized: user.nsfwAuthorized,
    favorites: user.favorites.map((fav: any) => fav.animeId),
    watched: user.watched.map((w: any) => w.animeId)
  };
};

app.use(cors());
app.use(express.json());

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});

// Routes d'authentification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log(`\n[REGISTER] Tentative d'inscription pour ${email}`);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      console.log(`[REGISTER] Échec - Email ou username déjà utilisé: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Cet email ou nom d'utilisateur est déjà utilisé"
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`[REGISTER] Mot de passe hashé pour ${email}`);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        activity: {
          create: {}
        }
      } as any,
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    console.log(`[REGISTER] Succès - Utilisateur créé: ${email}`);
    res.json({
      success: true,
      message: "Inscription réussie",
      user
    });
  } catch (error) {
    console.error("\n[REGISTER] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'inscription"
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`\n[LOGIN] Tentative de connexion pour ${email}`);

    // Récupérer l'utilisateur avec le mot de passe uniquement
    const userWithPassword = await prisma.user.findUnique({
      where: { email },
    });

    if (!userWithPassword) {
      console.log(`[LOGIN] Échec - Utilisateur non trouvé: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect"
      });
    }

    const validPassword = await bcrypt.compare(password, (userWithPassword as any).password);

    if (!validPassword) {
      console.log(`[LOGIN] Échec - Mot de passe incorrect pour ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect"
      });
    }

    // Récupérer l'utilisateur complet (avec relations)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    // Mettre à jour l'activité
    await prisma.activity.update({
      where: { userId: user!.id },
      data: {
        logins: { increment: 1 },
        lastActive: new Date()
      }
    });

    // Transformer les données utilisateur pour le client
    const formattedUser = formatUserForClient(user!);

    console.log(`[LOGIN] Succès - Utilisateur connecté: ${email}`);
    res.json({
      success: true,
      message: "Connexion réussie",
      user: formattedUser
    });
  } catch (error) {
    console.error("\n[LOGIN] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la connexion"
    });
  }
});

// Route pour vérifier si un utilisateur est connecté
app.get('/api/auth/check', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string;
    console.log(`\n[CHECK] Vérification de l'authentification pour l'utilisateur: ${userId}`);
    
    if (!userId) {
      console.log('[CHECK] Échec - Aucun ID utilisateur fourni');
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

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
      console.log(`[CHECK] Échec - Utilisateur non trouvé: ${userId}`);
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }
    
    // Transformer les données utilisateur pour le client
    const formattedUser = formatUserForClient(user);

    console.log(`[CHECK] Succès - Utilisateur authentifié: ${user.email}`);
    res.json({
      success: true,
      user: formattedUser
    });
  } catch (error) {
    console.error("\n[CHECK] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la vérification"
    });
  }
});

// Route pour mettre à jour le profil utilisateur
app.post('/api/auth/profile', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string;
    const updates = req.body;
    console.log(`\n[PROFILE] Tentative de mise à jour du profil pour l'utilisateur: ${userId}`);
    console.log(`[PROFILE] Données à mettre à jour:`, updates);
    
    if (!userId) {
      console.log('[PROFILE] Échec - Aucun ID utilisateur fourni');
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    // Vérifier si l'utilisateur existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      console.log(`[PROFILE] Échec - Utilisateur non trouvé: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Extraire les champs à mettre à jour (ignorer les relations)
    const { favorites, watched, activity, searches, ...userUpdates } = updates;
    
    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: userUpdates,
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    // Transformer les données utilisateur pour le client
    const formattedUser = formatUserForClient(updatedUser);

    console.log(`[PROFILE] Succès - Profil mis à jour pour: ${updatedUser.email}`);
    res.json({
      success: true,
      message: "Profil mis à jour avec succès",
      user: formattedUser
    });
  } catch (error) {
    console.error("\n[PROFILE] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la mise à jour du profil"
    });
  }
});

// Route pour récupérer tous les utilisateurs (admin uniquement)
app.get('/api/auth/users', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string;
    console.log(`\n[USERS] Tentative de récupération des utilisateurs par: ${userId}`);

    if (!userId) {
      console.log('[USERS] Échec - Aucun ID utilisateur fourni');
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    // Vérifier si l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isAdmin) {
      console.log(`[USERS] Échec - Utilisateur non admin: ${userId}`);
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé"
      });
    }

    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    // Retirer les mots de passe des réponses
    const usersWithoutPasswords = users.map(user => {
      const { password: _, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    });

    console.log(`[USERS] Succès - ${usersWithoutPasswords.length} utilisateurs récupérés`);
    res.json({
      success: true,
      users: usersWithoutPasswords
    });
  } catch (error) {
    console.error("\n[USERS] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération des utilisateurs"
    });
  }
});

// Route pour gérer les favoris
app.post('/api/auth/favorites', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    console.log('\n[FAVORITES] Requête reçue:', {
      userId,
      body: req.body
    });

    if (!userId) {
      console.log('[FAVORITES] Erreur: Aucun ID utilisateur fourni');
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { animeId, title, imageUrl } = req.body;
    if (!animeId || !title || !imageUrl) {
      console.log('[FAVORITES] Erreur: Données manquantes', { animeId, title, imageUrl });
      return res.status(400).json({ 
        error: 'Données manquantes',
        details: { animeId, title, imageUrl }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { favorites: true }
    });

    if (!user) {
      console.log('[FAVORITES] Erreur: Utilisateur non trouvé', userId);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const existingFavorite = user.favorites.find(f => f.animeId === animeId);
    let updatedUser;

    if (existingFavorite) {
      console.log('[FAVORITES] Suppression du favori existant:', existingFavorite.id);
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      });
    } else {
      console.log('[FAVORITES] Ajout d\'un nouveau favori');
      await prisma.favorite.create({
        data: {
          userId: userId as string,
          animeId,
          title,
          imageUrl
        }
      });
    }

    updatedUser = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { 
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    console.log('[FAVORITES] Opération réussie');
    res.json(formatUserForClient(updatedUser));
  } catch (error) {
    console.error('[FAVORITES] Erreur détaillée:', error);
    if (error instanceof Error) {
      console.error('[FAVORITES] Message d\'erreur:', error.message);
      console.error('[FAVORITES] Stack trace:', error.stack);
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour gérer les animes vus
app.post('/api/auth/watched', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    console.log('\n[WATCHED] Requête reçue:', {
      userId,
      body: req.body
    });

    if (!userId) {
      console.log('[WATCHED] Erreur: Aucun ID utilisateur fourni');
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { animeId, title, imageUrl } = req.body;
    if (!animeId || !title || !imageUrl) {
      console.log('[WATCHED] Erreur: Données manquantes', { animeId, title, imageUrl });
      return res.status(400).json({ 
        error: 'Données manquantes',
        details: { animeId, title, imageUrl }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { watched: true }
    });

    if (!user) {
      console.log('[WATCHED] Erreur: Utilisateur non trouvé', userId);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const existingWatched = user.watched.find(w => w.animeId === animeId);
    let updatedUser;

    if (existingWatched) {
      console.log('[WATCHED] Suppression de l\'anime vu:', existingWatched.id);
      await prisma.watched.delete({
        where: { id: existingWatched.id }
      });
    } else {
      console.log('[WATCHED] Ajout d\'un nouvel anime vu');
      await prisma.watched.create({
        data: {
          userId: userId as string,
          animeId,
          title,
          imageUrl
        }
      });
    }

    updatedUser = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { 
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    console.log('[WATCHED] Opération réussie');
    res.json(formatUserForClient(updatedUser));
  } catch (error) {
    console.error('[WATCHED] Erreur détaillée:', error);
    if (error instanceof Error) {
      console.error('[WATCHED] Message d\'erreur:', error.message);
      console.error('[WATCHED] Stack trace:', error.stack);
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de recherche
app.post('/api/auth/search', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

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
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const results = await prisma.search.findMany({
      where: {
        userId: userId,
        query: {
          contains: query
        }
      }
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour supprimer un utilisateur (admin uniquement)
app.delete('/api/auth/users/:userId', async (req, res) => {
  try {
    const adminId = req.headers['user-id'] as string;
    const { userId } = req.params;
    
    console.log(`\n[DELETE] Tentative de suppression de l'utilisateur: ${userId}`);
    console.log(`[DELETE] Admin: ${adminId}`);

    if (!adminId) {
      console.log('[DELETE] Échec - Aucun ID administrateur fourni');
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    // Vérifier si l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !admin.isAdmin) {
      console.log(`[DELETE] Échec - Utilisateur non admin: ${adminId}`);
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé"
      });
    }

    // Vérifier si l'utilisateur à supprimer existe
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToDelete) {
      console.log(`[DELETE] Échec - Utilisateur cible non trouvé: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Ne pas supprimer l'administrateur
    if (userToDelete.isAdmin) {
      console.log(`[DELETE] Échec - Tentative de suppression d'un admin: ${userId}`);
      return res.status(403).json({
        success: false,
        message: "Impossible de supprimer le compte administrateur"
      });
    }

    // Supprimer d'abord toutes les relations
    console.log(`[DELETE] Suppression des données liées pour l'utilisateur: ${userId}`);
    
    // Supprimer les favoris
    await prisma.favorite.deleteMany({
      where: { userId }
    });
    
    // Supprimer les animes vus
    await prisma.watched.deleteMany({
      where: { userId }
    });
    
    // Supprimer les recherches
    await prisma.search.deleteMany({
      where: { userId }
    });
    
    // Supprimer l'activité
    await prisma.activity.deleteMany({
      where: { userId }
    });

    // Maintenant supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`[DELETE] Succès - Utilisateur supprimé: ${userToDelete.email}`);
    
    res.json({
      success: true,
      message: "Utilisateur supprimé avec succès"
    });
  } catch (error) {
    console.error("\n[DELETE] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la suppression de l'utilisateur"
    });
  }
});

// Route pour autoriser/révoquer l'accès NSFW (admin uniquement)
app.post('/api/auth/nsfw-authorization', async (req, res) => {
  try {
    const adminId = req.headers['user-id'] as string;
    const { userId } = req.body;
    
    console.log(`\n[NSFW] Tentative de modification des permissions NSFW pour l'utilisateur: ${userId}`);
    console.log(`[NSFW] Admin: ${adminId}`);

    if (!adminId) {
      console.log('[NSFW] Échec - Aucun ID administrateur fourni');
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    // Vérifier si l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !admin.isAdmin) {
      console.log(`[NSFW] Échec - Utilisateur non admin: ${adminId}`);
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé"
      });
    }

    // Vérifier si l'utilisateur à modifier existe
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToUpdate) {
      console.log(`[NSFW] Échec - Utilisateur cible non trouvé: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Basculer l'autorisation NSFW
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        nsfwAuthorized: !userToUpdate.nsfwAuthorized 
      },
      include: {
        favorites: true,
        watched: true,
        activity: true,
        searches: true
      }
    });

    const actionType = updatedUser.nsfwAuthorized ? "granted" : "revoked";
    console.log(`[NSFW] Succès - Accès NSFW ${actionType} pour l'utilisateur: ${updatedUser.email}`);
    
    res.json({
      success: true,
      message: `NSFW access ${actionType} for user ${updatedUser.username}`,
      user: updatedUser
    });
  } catch (error) {
    console.error("\n[NSFW] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la modification des permissions"
    });
  }
});

// Route pour changer le mot de passe
app.post('/api/auth/password', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string;
    const { currentPassword, newPassword } = req.body;
    
    console.log(`\n[PASSWORD] Tentative de changement de mot de passe pour l'utilisateur: ${userId}`);

    if (!userId) {
      console.log('[PASSWORD] Échec - Aucun ID utilisateur fourni');
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    if (!currentPassword || !newPassword) {
      console.log('[PASSWORD] Échec - Données manquantes');
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires"
      });
    }

    if (newPassword.length < 6) {
      console.log('[PASSWORD] Échec - Mot de passe trop court');
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 6 caractères"
      });
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`[PASSWORD] Échec - Utilisateur non trouvé: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Vérifier si le mot de passe actuel est correct
    const validPassword = await bcrypt.compare(currentPassword, (user as any).password);
    if (!validPassword) {
      console.log('[PASSWORD] Échec - Mot de passe actuel incorrect');
      return res.status(401).json({
        success: false,
        message: "Le mot de passe actuel est incorrect"
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    console.log(`[PASSWORD] Succès - Mot de passe changé pour: ${user.email}`);
    res.json({
      success: true,
      message: "Mot de passe changé avec succès"
    });
  } catch (error) {
    console.error("\n[PASSWORD] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du changement de mot de passe"
    });
  }
});

// Route pour changer le mot de passe (admin uniquement)
app.post('/api/auth/admin-password', async (req, res) => {
  try {
    const adminId = req.headers['user-id'] as string;
    const { userId, newPassword } = req.body;
    
    console.log(`\n[PASSWORD] Tentative de changement de mot de passe pour l'utilisateur: ${userId}`);

    if (!adminId) {
      console.log('[PASSWORD] Échec - Aucun ID administrateur fourni');
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    // Vérifier si l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !admin.isAdmin) {
      console.log(`[PASSWORD] Échec - Utilisateur non admin: ${adminId}`);
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé"
      });
    }

    // Vérifier si l'utilisateur à modifier existe
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToUpdate) {
      console.log(`[PASSWORD] Échec - Utilisateur cible non trouvé: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Vérifier si le mot de passe actuel est correct
    const validPassword = await bcrypt.compare(newPassword, (userToUpdate as any).password);
    if (validPassword) {
      console.log('[PASSWORD] Échec - Mot de passe actuel identique');
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit être différent du mot de passe actuel"
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    console.log(`[PASSWORD] Succès - Mot de passe changé pour: ${userToUpdate.email}`);
    res.json({
      success: true,
      message: "Mot de passe changé avec succès"
    });
  } catch (error) {
    console.error("\n[PASSWORD] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du changement de mot de passe"
    });
  }
});

// Routes pour le forum
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, subredditId, tags } = req.body;
    const userId = req.headers['user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const post = await prisma.$queryRaw<Post[]>`
      INSERT INTO posts (id, title, content, subredditId, tags, userId, createdAt, updatedAt)
      VALUES (cuid(), ${title}, ${content}, ${subredditId}, ${tags ? tags.join(',') : null}, ${userId}, NOW(), NOW())
      RETURNING *;
    `;

    res.json(post[0]);
  } catch (error) {
    console.error('Erreur lors de la création du post:', error);
    res.status(500).json({ error: 'Erreur lors de la création du post' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const { subredditId } = req.query;
    const where = subredditId ? `WHERE p.subredditId = '${subredditId}'` : '';

    const posts = await prisma.$queryRaw<Post[]>`
      SELECT p.*, u.username, s.name as subreddit_name
      FROM posts p
      LEFT JOIN users u ON p.userId = u.id
      LEFT JOIN subreddits s ON p.subredditId = s.id
      ${where}
      ORDER BY p.createdAt DESC;
    `;

    res.json(posts);
  } catch (error) {
    console.error('Erreur lors de la récupération des posts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des posts' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.$queryRaw<(Post & { comments: Comment[] })[]>`
      SELECT p.*, u.username, s.name as subreddit_name,
        (SELECT json_group_array(
          json_object(
            'id', c.id,
            'content', c.content,
            'createdAt', c.createdAt,
            'userId', c.userId,
            'username', cu.username
          )
        )
        FROM comments c
        LEFT JOIN users cu ON c.userId = cu.id
        WHERE c.postId = p.id) as comments
      FROM posts p
      LEFT JOIN users u ON p.userId = u.id
      LEFT JOIN subreddits s ON p.subredditId = s.id
      WHERE p.id = ${id};
    `;

    if (!post || post.length === 0) {
      return res.status(404).json({ error: 'Post non trouvé' });
    }

    res.json(post[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du post:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du post' });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;
    const userId = req.headers['user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const comment = await prisma.$queryRaw<Comment[]>`
      INSERT INTO comments (id, content, userId, postId, parentId, createdAt, updatedAt)
      VALUES (cuid(), ${content}, ${userId}, ${id}, ${parentId || null}, NOW(), NOW())
      RETURNING *;
    `;

    res.json(comment[0]);
  } catch (error) {
    console.error('Erreur lors de la création du commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de la création du commentaire' });
  }
});

// Routes pour les subreddits
app.get('/api/subreddits', async (req, res) => {
  try {
    console.log('\n[SUBREDDITS] Tentative de récupération des subreddits...');
    console.log('[SUBREDDITS] Headers:', req.headers);
    
    const userId = req.headers['user-id'] as string;
    console.log('[SUBREDDITS] User ID:', userId);

    if (!userId) {
      console.log('[SUBREDDITS] Aucun ID utilisateur fourni');
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    console.log('[SUBREDDITS] Utilisateur trouvé:', user);

    if (!user || !user.isAdmin) {
      console.log('[SUBREDDITS] Utilisateur non admin');
      return res.status(403).json({ error: 'Accès refusé' });
    }

    console.log('[SUBREDDITS] Exécution de la requête SQL...');
    try {
      const subreddits = await prisma.$queryRaw<Subreddit[]>`
        SELECT s.*, 
          (SELECT json_group_array(
            json_object(
              'id', sa.id,
              'userId', sa.userId,
              'username', u.username,
              'role', sa.role,
              'createdAt', sa.createdAt
            )
          )
          FROM subreddit_admins sa
          LEFT JOIN users u ON sa.userId = u.id
          WHERE sa.subredditId = s.id) as admins
        FROM subreddits s;
      `;

      console.log('[SUBREDDITS] Subreddits trouvés:', subreddits);

      const formattedSubreddits = subreddits.map(subreddit => ({
        ...subreddit,
        admins: subreddit.admins ? JSON.parse(subreddit.admins as unknown as string) : []
      }));

      console.log('[SUBREDDITS] Subreddits formatés:', formattedSubreddits);
      res.json(formattedSubreddits);
    } catch (sqlError) {
      console.error('[SUBREDDITS] Erreur SQL:', sqlError);
      if (sqlError instanceof Error) {
        console.error('[SUBREDDITS] Message d\'erreur SQL:', sqlError.message);
        console.error('[SUBREDDITS] Stack trace SQL:', sqlError.stack);
      }
      throw sqlError;
    }
  } catch (error) {
    console.error('[SUBREDDITS] Erreur détaillée:', error);
    if (error instanceof Error) {
      console.error('[SUBREDDITS] Message d\'erreur:', error.message);
      console.error('[SUBREDDITS] Stack trace:', error.stack);
    }
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

app.post('/api/subreddits', async (req, res) => {
  const { name, description } = req.body;
  const userId = req.headers['user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const user = await prisma.$queryRaw<{ id: string; isAdmin: boolean }[]>`
      SELECT * FROM users WHERE id = ${userId} AND isAdmin = true;
    `;

    if (!user || user.length === 0) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const subreddit = await prisma.$queryRaw<Subreddit[]>`
      WITH new_subreddit AS (
        INSERT INTO subreddits (id, name, description, createdBy, createdAt)
        VALUES (cuid(), ${name}, ${description}, ${userId}, NOW())
        RETURNING *
      )
      INSERT INTO subreddit_admins (id, subredditId, userId, role, createdAt)
      SELECT cuid(), id, ${userId}, 'moderator', NOW()
      FROM new_subreddit
      RETURNING *;
    `;

    res.json(subreddit[0]);
  } catch (error) {
    console.error('Erreur lors de la création du subreddit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/subreddits/:subredditId/admins', async (req, res) => {
  const { subredditId } = req.params;
  const { username, role } = req.body;
  const userId = req.headers['user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const user = await prisma.$queryRaw<{ id: string; isAdmin: boolean }[]>`
      SELECT * FROM users WHERE id = ${userId} AND isAdmin = true;
    `;

    if (!user || user.length === 0) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const targetUser = await prisma.$queryRaw<{ id: string; username: string }[]>`
      SELECT * FROM users WHERE username = ${username};
    `;

    if (!targetUser || targetUser.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const admin = await prisma.$queryRaw<SubredditAdmin[]>`
      INSERT INTO subreddit_admins (id, subredditId, userId, role, createdAt)
      VALUES (cuid(), ${subredditId}, ${targetUser[0].id}, ${role}, NOW())
      RETURNING *;
    `;

    res.json(admin[0]);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'administrateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/subreddits/:subredditId/admins/:adminId', async (req, res) => {
  const { subredditId, adminId } = req.params;
  const userId = req.headers['user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const user = await prisma.$queryRaw<{ id: string; isAdmin: boolean }[]>`
      SELECT * FROM users WHERE id = ${userId} AND isAdmin = true;
    `;

    if (!user || user.length === 0) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await prisma.$queryRaw`
      DELETE FROM subreddit_admins
      WHERE id = ${adminId};
    `;

    res.json({ message: 'Administrateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'administrateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour créer un utilisateur administrateur
app.post('/api/setup-admin', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isAdmin: true
      }
    });

    res.json({ message: 'Administrateur créé avec succès', admin: { id: admin.id, username: admin.username, email: admin.email } });
  } catch (error) {
    console.error('Erreur lors de la création de l\'administrateur:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'administrateur' });
  }
});

async function ensureDefaultAdmin() {
  try {
    const adminEmail = 'admin@mangamuse.com';
    const adminPassword = 'admin';

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      // Hasher le mot de passe
      const hashedPassword = await bcryptjs.hash(adminPassword, 10);

      // Créer l'admin avec isAdmin = true
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          username: 'admin',
          password: hashedPassword,
          isAdmin: true,
          activity: {
            create: {}
          }
        }
      });

      console.log('Compte admin par défaut créé :', adminEmail, '/', adminPassword);
    } else {
      console.log('Compte admin par défaut existe déjà');
    }
  } catch (error) {
    console.error('Erreur lors de la création du compte admin par défaut:', error);
  }
}

// Appel de la fonction d'initialisation au démarrage
ensureDefaultAdmin().catch(console.error);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});