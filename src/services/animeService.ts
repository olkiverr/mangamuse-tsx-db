interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    }
  };
  synopsis: string;
  score: number;
  scored_by?: number;
  genres: Array<{
    name: string;
  }>;
  themes?: Array<{
    name: string;
  }>;
  aired: {
    from: string;
    to?: string;
  };
  episodes: number;
  status: string;
  type?: string;
  duration?: string;
  rating?: string;
  studios?: Array<{
    name: string;
  }>;
  producers?: Array<{
    name: string;
  }>;
  source?: string;
  popularity?: number;
  members?: number;
  favorites?: number;
  rank?: number;
  season?: string;
  year?: number;
  background?: string;
  trailer?: {
    youtube_id?: string;
    url?: string;
  };
  relations?: Array<{
    relation: string;
    entry: Array<{
      mal_id: number;
      name: string;
      type: string;
    }>;
  }>;
  streaming?: Array<{
    name: string;
    url: string;
  }>;
  score_by_distribution?: Record<string, number>;
}

interface AnimeResponse {
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
  data: Anime[];
}

interface AnimeDetailsResponse {
  data: Anime;
}

interface Character {
  character: {
    mal_id: number;
    url: string;
    images: {
      jpg: {
        image_url: string;
      },
      webp: {
        image_url: string;
      }
    };
    name: string;
  };
  role: string;
  voice_actors: Array<{
    person: {
      mal_id: number;
      name: string;
    };
    language: string;
  }>;
}

interface CharactersResponse {
  data: Character[];
}

interface StaffMember {
  person: {
    mal_id: number;
    url: string;
    images: {
      jpg: {
        image_url: string;
      }
    };
    name: string;
  };
  positions: string[];
}

interface StaffResponse {
  data: StaffMember[];
}

// Track the last API call time to enforce rate limiting
let lastApiCallTime = 0;
const API_RATE_LIMIT_MS = 500; // Réduit de 1000ms à 500ms pour accélérer les requêtes

// Cache implementation to store API responses
const apiCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Interface for anime genres
export interface AnimeGenre {
  mal_id: number;
  name: string;
  url: string;
  count: number;
}

export interface AnimeGenreResponse {
  data: AnimeGenre[];
}

// Function to handle API rate limiting
const handleApiRequest = async (url: string, retryCount = 0): Promise<any> => {
  // Check if we have a valid cached response
  if (apiCache[url] && (Date.now() - apiCache[url].timestamp) < CACHE_DURATION_MS) {
    console.log(`Using cached data for: ${url}`);
    return apiCache[url].data;
  }
  
  // Enforce minimum time between API calls
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  
  if (timeSinceLastCall < API_RATE_LIMIT_MS) {
    const waitTime = API_RATE_LIMIT_MS - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  try {
    lastApiCallTime = Date.now();
    console.log(`Making API request to: ${url}`);
    const response = await fetch(url);
    
    // Handle rate limiting (429 Too Many Requests)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '2';
      const waitTime = parseInt(retryAfter) * 1000 || 2000;
      
      console.warn(`Rate limited! Waiting for ${waitTime}ms before retrying (attempt ${retryCount + 1})`);
      
      // Exponential backoff with maximum 3 retries instead of 5
      if (retryCount >= 3) {
        throw new Error('Maximum retry attempts reached for rate-limited request');
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return handleApiRequest(url, retryCount + 1);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    apiCache[url] = {
      data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    console.error("Error fetching anime data:", error);
    throw error;
  }
};

// Add a delay between sequential API calls to prevent rate limiting
const sequentialApiCall = async <T>(apiCallFn: () => Promise<T>): Promise<T> => {
  // Wait for a minimum time between API calls
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  
  if (timeSinceLastCall < API_RATE_LIMIT_MS) {
    const waitTime = API_RATE_LIMIT_MS - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  return apiCallFn();
};

export const fetchGenres = async (): Promise<AnimeGenreResponse> => {
  const apiUrl = `https://api.jikan.moe/v4/genres/anime`;
  console.log(`Fetching anime genres from: ${apiUrl}`);
  return sequentialApiCall(() => 
    handleApiRequest(apiUrl)
  );
};

export const fetchAnimes = async (
  page: number = 1, 
  showNSFW: boolean = false,
  includeGenres: number[] = [],
  excludeGenres: number[] = [],
  searchQuery: string = "",
  orderBy: string = "popularity",
  nsfwAuthorized: boolean = false
): Promise<AnimeResponse> => {
  let apiUrl = `https://api.jikan.moe/v4/anime?page=${page}&limit=24&order_by=${orderBy}`;
  
  // Only show NSFW content if the user has both enabled the option AND is authorized
  const canShowNSFW = showNSFW && nsfwAuthorized;
  
  if (!canShowNSFW) {
    apiUrl += `&sfw=true`;
  }
  
  // Add genres to include
  if (includeGenres.length > 0) {
    apiUrl += `&genres=${includeGenres.join(',')}`;
  }
  
  // Add genres to exclude
  if (excludeGenres.length > 0) {
    apiUrl += `&genres_exclude=${excludeGenres.join(',')}`;
  }
  
  // Add search term if provided
  if (searchQuery.trim()) {
    apiUrl += `&q=${encodeURIComponent(searchQuery.trim())}`;
  }
  
  console.log(`fetchAnimes with showNSFW=${showNSFW}, nsfwAuthorized=${nsfwAuthorized}, canShowNSFW=${canShowNSFW}, URL: ${apiUrl}`);
  return sequentialApiCall(() => 
    handleApiRequest(apiUrl)
  );
};

export const fetchTrendingAnimes = async (
  showNSFW: boolean = false,
  nsfwAuthorized: boolean = false
): Promise<AnimeResponse> => {
  let apiUrl = `https://api.jikan.moe/v4/anime?limit=20&order_by=score&sort=desc`;
  
  // N'afficher le contenu NSFW que si l'utilisateur a activé l'option ET est autorisé
  const canShowNSFW = showNSFW && nsfwAuthorized;
  
  if (!canShowNSFW) {
    apiUrl += `&sfw=true`;
  }
  
  console.log(`fetchTrendingAnimes avec showNSFW=${showNSFW}, nsfwAuthorized=${nsfwAuthorized}, canShowNSFW=${canShowNSFW}, URL: ${apiUrl}`);
  return sequentialApiCall(() => 
    handleApiRequest(apiUrl)
  );
};

export const fetchUpcomingAnimes = async (
  showNSFW: boolean = false,
  nsfwAuthorized: boolean = false
): Promise<AnimeResponse> => {
  let apiUrl = `https://api.jikan.moe/v4/anime?limit=20&status=upcoming&order_by=popularity`;
  
  // N'afficher le contenu NSFW que si l'utilisateur a activé l'option ET est autorisé
  const canShowNSFW = showNSFW && nsfwAuthorized;
  
  if (!canShowNSFW) {
    apiUrl += `&sfw=true`;
  }
  
  console.log(`fetchUpcomingAnimes avec showNSFW=${showNSFW}, nsfwAuthorized=${nsfwAuthorized}, canShowNSFW=${canShowNSFW}, URL: ${apiUrl}`);
  return sequentialApiCall(() => 
    handleApiRequest(apiUrl)
  );
};

export const fetchMoreAnimes = async (
  page: number,
  showNSFW: boolean = false,
  includeGenres: number[] = [],
  excludeGenres: number[] = [],
  searchQuery: string = "",
  orderBy: string = "popularity",
  nsfwAuthorized: boolean = false
): Promise<AnimeResponse> => {
  let apiUrl = `https://api.jikan.moe/v4/anime?page=${page}&limit=24&order_by=${orderBy}`;
  
  // N'afficher le contenu NSFW que si l'utilisateur a activé l'option ET est autorisé
  const canShowNSFW = showNSFW && nsfwAuthorized;
  
  if (!canShowNSFW) {
    apiUrl += `&sfw=true`;
  }
  
  // Ajouter les genres à inclure
  if (includeGenres.length > 0) {
    apiUrl += `&genres=${includeGenres.join(',')}`;
  }
  
  // Ajouter les genres à exclure
  if (excludeGenres.length > 0) {
    apiUrl += `&genres_exclude=${excludeGenres.join(',')}`;
  }
  
  // Ajouter le terme de recherche s'il est fourni
  if (searchQuery.trim()) {
    apiUrl += `&q=${encodeURIComponent(searchQuery.trim())}`;
  }
  
  console.log(`fetchMoreAnimes avec showNSFW=${showNSFW}, nsfwAuthorized=${nsfwAuthorized}, canShowNSFW=${canShowNSFW}, URL: ${apiUrl}`);
  return sequentialApiCall(() => 
    handleApiRequest(apiUrl)
  );
};

export const fetchAnimeDetails = async (animeId: number): Promise<AnimeDetailsResponse> => {
  return sequentialApiCall(() => 
    handleApiRequest(`https://api.jikan.moe/v4/anime/${animeId}/full`)
  );
};

export const fetchAnimeCharacters = async (animeId: number): Promise<CharactersResponse> => {
  return sequentialApiCall(() => 
    handleApiRequest(`https://api.jikan.moe/v4/anime/${animeId}/characters`)
  );
};

export const fetchAnimeStaff = async (animeId: number): Promise<StaffResponse> => {
  return sequentialApiCall(() => 
    handleApiRequest(`https://api.jikan.moe/v4/anime/${animeId}/staff`)
  );
};

export interface AdvancedSearchParams {
  page?: number;
  showNSFW?: boolean;
  nsfwAuthorized?: boolean;
  includeGenres?: number[];
  excludeGenres?: number[];
  searchQuery?: string;
  orderBy?: string;
  sort?: string;
  status?: string; // 'airing' | 'complete' | 'upcoming'
  type?: string; // 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'music'
  season?: string; // 'winter' | 'spring' | 'summer' | 'fall'
  year?: number;
  minScore?: number;
  producers?: number[];
  startDate?: string;
  endDate?: string;
}

export const fetchAdvancedSearch = async (params: AdvancedSearchParams): Promise<AnimeResponse> => {
  const {
    page = 1,
    showNSFW = false,
    nsfwAuthorized = false,
    includeGenres = [],
    excludeGenres = [],
    searchQuery = "",
    orderBy = "popularity",
    sort = "desc",
    status,
    type,
    season,
    year,
    minScore,
    producers = [],
    startDate,
    endDate
  } = params;

  // Construire l'URL de base
  let apiUrl = `https://api.jikan.moe/v4/anime?page=${page}&limit=24&order_by=${orderBy}&sort=${sort}`;
  
  // N'afficher le contenu NSFW que si l'utilisateur a activé l'option ET est autorisé
  const canShowNSFW = showNSFW && nsfwAuthorized;
  
  if (!canShowNSFW) {
    apiUrl += `&sfw=true`;
  }
  
  // Ajouter les genres à inclure
  if (includeGenres.length > 0) {
    apiUrl += `&genres=${includeGenres.join(',')}`;
  }
  
  // Ajouter les genres à exclure
  if (excludeGenres.length > 0) {
    apiUrl += `&genres_exclude=${excludeGenres.join(',')}`;
  }
  
  // Ajouter le terme de recherche s'il est fourni
  if (searchQuery.trim()) {
    apiUrl += `&q=${encodeURIComponent(searchQuery.trim())}`;
  }
  
  // Ajouter les filtres avancés
  if (status) {
    apiUrl += `&status=${status}`;
  }
  
  if (type) {
    apiUrl += `&type=${type}`;
  }
  
  if (season) {
    apiUrl += `&season=${season.toLowerCase()}`;
  }
  
  if (year && year > 1900) {
    apiUrl += `&start_date=${year}`;
  }
  
  if (minScore && minScore >= 1 && minScore <= 10) {
    apiUrl += `&min_score=${minScore}`;
  }
  
  if (producers.length > 0) {
    apiUrl += `&producers=${producers.join(',')}`; 
  }
  
  if (startDate) {
    apiUrl += `&start_date=${startDate}`;
  }
  
  if (endDate) {
    apiUrl += `&end_date=${endDate}`;
  }

  console.log(`Advanced search with URL: ${apiUrl}`);
  return sequentialApiCall(() => 
    handleApiRequest(apiUrl)
  );
};

export const fetchProducers = async (): Promise<{data: {mal_id: number, name: string}[]}> => {
  const apiUrl = `https://api.jikan.moe/v4/producers`;
  console.log(`Fetching anime producers from: ${apiUrl}`);
  return sequentialApiCall(() => 
    handleApiRequest(apiUrl)
  );
};

// Function to retrieve a random anime respecting the filters
export const fetchRandomAnime = async (
  showNSFW: boolean = false,
  nsfwAuthorized: boolean = false
): Promise<number> => {
  let apiUrl = `https://api.jikan.moe/v4/random/anime`;
  
  // If NSFW content is not authorized, we make sure not to retrieve any
  const canShowNSFW = showNSFW && nsfwAuthorized;
  if (!canShowNSFW) {
    apiUrl += `?sfw=true`;
  }

  const response = await sequentialApiCall(() => handleApiRequest(apiUrl));
  return response.data.mal_id;
};

// Function to retrieve a random anime respecting the filters
export const fetchRandomAnimeWithFilters = async (params: AdvancedSearchParams): Promise<number> => {
  try {
    // D'abord, récupérer une liste d'animes qui correspondent aux critères
    const filteredResponse = await fetchAdvancedSearch({
      ...params,
      // Augmenter la limite pour avoir plus de choix
      page: 1, 
      // Ajouter un paramètre pour randomiser l'ordre des résultats si possible
      orderBy: Math.random() > 0.5 ? params.orderBy || "popularity" : "score"
    });
    
    // Si aucun anime ne correspond aux critères, lancer une erreur
    if (filteredResponse.data.length === 0) {
      throw new Error("No anime found matching your filters. Please try with different criteria.");
    }
    
    // Sélectionner un anime aléatoire parmi les résultats
    const randomIndex = Math.floor(Math.random() * filteredResponse.data.length);
    return filteredResponse.data[randomIndex].mal_id;
  } catch (error) {
    console.error("Error fetching random anime with filters:", error);
    throw error;
  }
};

export type { 
  Anime, 
  AnimeResponse, 
  AnimeDetailsResponse, 
  Character, 
  CharactersResponse,
  StaffMember,
  StaffResponse
}; 