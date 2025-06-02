import express from 'express';
import cors from 'cors';
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

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

    console.log(`[LOGIN] Succès - Utilisateur connecté: ${email}`);
    res.json({
      success: true,
      message: "Connexion réussie",
      user
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

    console.log(`[CHECK] Succès - Utilisateur authentifié: ${user.email}`);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("\n[CHECK] Erreur:", error);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la vérification"
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
      include: { favorites: true }
    });

    console.log('[FAVORITES] Opération réussie');
    res.json(updatedUser);
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
      include: { watched: true }
    });

    console.log('[WATCHED] Opération réussie');
    res.json(updatedUser);
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

// Fonction pour créer l'utilisateur admin s'il n'existe pas
const initializeAdmin = async () => {
  try {
    console.log('[INIT] Vérification de la connexion à la base de données...');
    
    // Vérifier la connexion à la base de données
    await prisma.$connect();
    console.log('[INIT] Connexion à la base de données établie');

    const adminExists = await prisma.user.findFirst({
      where: {
        email: 'admin@mangamuse.com'
      }
    });

    if (!adminExists) {
      console.log('[INIT] Création de l\'utilisateur admin...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@mangamuse.com',
          password: hashedPassword,
          isAdmin: true,
          nsfwAuthorized: true,
          activity: {
            create: {}
          }
        } as any
      });
      console.log('[INIT] Utilisateur admin créé avec succès:', admin.email);
    } else {
      console.log('[INIT] L\'utilisateur admin existe déjà:', adminExists.email);
    }
  } catch (error) {
    console.error('[INIT] Erreur détaillée:', error);
    if (error instanceof Error) {
      console.error('[INIT] Message d\'erreur:', error.message);
      console.error('[INIT] Stack trace:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
};

// Démarrer le serveur
app.listen(port, async () => {
  console.log(`\n[INFO] Serveur démarré sur le port ${port}`);
  console.log('[INFO] En attente de connexions...\n');
  
  // Initialiser l'admin au démarrage
  await initializeAdmin();
}); 