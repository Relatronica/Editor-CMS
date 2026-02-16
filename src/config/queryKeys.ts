import { API_ENDPOINTS } from './endpoints';

export const queryKeys = {
  articles: {
    all: [API_ENDPOINTS.articles] as const,
    lists: () => [...queryKeys.articles.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.articles.lists(), filters] as const,
    details: () => [...queryKeys.articles.all, 'detail'] as const,
    detail: (id: string | number) =>
      [...queryKeys.articles.details(), id] as const,
  },
  columns: {
    all: [API_ENDPOINTS.columns] as const,
    lists: () => [...queryKeys.columns.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.columns.lists(), filters] as const,
    details: () => [...queryKeys.columns.all, 'detail'] as const,
    detail: (id: string | number) =>
      [...queryKeys.columns.details(), id] as const,
    links: (id: string | number) =>
      [...queryKeys.columns.all, 'links', id] as const,
  },
  events: {
    all: [API_ENDPOINTS.events] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.events.lists(), filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string | number) =>
      [...queryKeys.events.details(), id] as const,
  },
  videoEpisodes: {
    all: [API_ENDPOINTS.videoEpisodes] as const,
    lists: () => [...queryKeys.videoEpisodes.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.videoEpisodes.lists(), filters] as const,
    details: () => [...queryKeys.videoEpisodes.all, 'detail'] as const,
    detail: (id: string | number) =>
      [...queryKeys.videoEpisodes.details(), id] as const,
  },
  tags: {
    all: [API_ENDPOINTS.tags] as const,
  },
  authors: {
    all: [API_ENDPOINTS.authors] as const,
  },
  partners: {
    all: [API_ENDPOINTS.partners] as const,
  },
} as const;
