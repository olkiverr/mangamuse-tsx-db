// Récupérer la valeur de la variable d'environnement, avec false comme valeur par défaut
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

// Fonction pour logger les messages
export const logger = {
  log: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.info(...args);
    }
  }
}; 