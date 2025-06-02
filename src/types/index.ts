export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  favorites?: number[]; // IDs d'anime favoris
  watched?: number[]; // IDs d'anime vus
  isAdmin?: boolean; // Indique si l'utilisateur est un administrateur
  showNSFW?: boolean; // Préférence pour afficher les animes NSFW
  nsfwAuthorized?: boolean; // Indique si l'utilisateur est autorisé à voir le contenu NSFW
} 