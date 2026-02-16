/**
 * Configurazione degli endpoint API Strapi
 * 
 * IMPORTANTE: Assicurati che questi nomi corrispondano esattamente
 * ai Content Type configurati in Strapi Admin.
 * 
 * In Strapi, gli endpoint REST usano il PLURALE del nome del Content Type.
 * Esempio: Content Type "Article" → endpoint "articles"
 */

export const API_ENDPOINTS = {
  articles: 'articles',
  columns: 'columns',
  authors: 'authors',
  tags: 'tags',
  partners: 'partners',
  // Modifica questo se il Content Type in Strapi ha un nome diverso
  // Possibili varianti:
  // - 'video-episodes' (plurale, standard)
  // - 'video-episode' (singolare, se configurato così)
  // - 'videoepisodes' (senza trattino)
  // - 'video_episodes' (con underscore)
  videoEpisodes: 'video-episodes', // <-- MODIFICA QUESTO SE NECESSARIO
  events: 'events',
} as const;
