import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// User operations
export const createUser = async (userData: {
  username: string;
  email: string;
  isAdmin?: boolean;
  showNSFW?: boolean;
  nsfwAuthorized?: boolean;
}) => {
  return prisma.user.create({
    data: {
      ...userData,
      activity: {
        create: {}
      }
    }
  });
};

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      favorites: true,
      watched: true,
      activity: true,
      searches: true
    }
  });
};

export const updateUser = async (id: string, data: any) => {
  return prisma.user.update({
    where: { id },
    data
  });
};

// Favorite operations
export const addFavorite = async (userId: string, animeData: {
  animeId: number;
  title: string;
  imageUrl: string;
  rating?: number;
}) => {
  return prisma.favorite.create({
    data: {
      ...animeData,
      userId
    }
  });
};

export const removeFavorite = async (userId: string, animeId: number) => {
  return prisma.favorite.deleteMany({
    where: {
      userId,
      animeId
    }
  });
};

// Watched operations
export const addWatched = async (userId: string, animeData: {
  animeId: number;
  title: string;
  imageUrl: string;
  episodesWatched?: number;
}) => {
  return prisma.watched.create({
    data: {
      ...animeData,
      userId
    }
  });
};

export const updateWatchedEpisodes = async (userId: string, animeId: number, episodesWatched: number) => {
  return prisma.watched.updateMany({
    where: {
      userId,
      animeId
    },
    data: {
      episodesWatched
    }
  });
};

// Search operations
export const addSearch = async (userId: string, query: string) => {
  return prisma.search.create({
    data: {
      userId,
      query
    }
  });
};

// Activity operations
export const updateActivity = async (userId: string, type: 'login' | 'search') => {
  const updateData = type === 'login' 
    ? { logins: { increment: 1 } }
    : { searches: { increment: 1 } };

  return prisma.activity.update({
    where: { userId },
    data: {
      ...updateData,
      lastActive: new Date()
    }
  });
};

// Cleanup function
export const cleanup = async () => {
  await prisma.$disconnect();
}; 