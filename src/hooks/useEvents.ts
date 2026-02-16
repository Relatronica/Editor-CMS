import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { API_ENDPOINTS } from '../config/endpoints';
import { queryKeys } from '../config/queryKeys';
import { logger } from '../lib/logger';

// ----- Types -----

export interface EventListItem {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  publishedAt?: string | null;
  updatedAt?: string;
  heroImage?: any;
  isOnline?: boolean;
  isFeatured?: boolean;
  organizer?: string;
  attributes?: {
    title?: string;
    slug?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    publishedAt?: string | null;
    updatedAt?: string;
    heroImage?: any;
    isOnline?: boolean;
    isFeatured?: boolean;
    organizer?: string;
  };
}

export interface EventDetail {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  description?: string;
  body?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  address?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  organizer?: string;
  externalUrl?: string;
  isFeatured?: boolean;
  heroImage?: any;
  tags?: { data?: Array<{ id: number }> } | number[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    preventIndexing?: boolean;
    metaImage?:
      | { data?: { id: number; attributes?: { url?: string } } }
      | { id: number; url: string }
      | null;
  } | null;
  attributes?: Partial<{
    title: string;
    slug: string;
    description: string;
    body: string;
    startDate: string;
    endDate: string;
    location: string;
    address: string;
    isOnline: boolean;
    onlineUrl: string;
    organizer: string;
    externalUrl: string;
    isFeatured: boolean;
    heroImage: { data?: { id: number; attributes?: { url?: string } } };
    tags: { data?: Array<{ id: number }> };
    seo: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string;
      preventIndexing?: boolean;
      metaImage?: { data?: { id: number; attributes?: { url?: string } } };
    };
  }>;
}

export interface EventResponse {
  data: EventDetail;
  meta?: any;
}

export interface EventFormData {
  title: string;
  slug: string;
  description: string;
  body: string;
  heroImage: { id: number; url: string } | null;
  startDate: string;
  endDate: string;
  location: string;
  address: string;
  isOnline: boolean;
  onlineUrl: string;
  organizer: string;
  externalUrl: string;
  isFeatured: boolean;
  tags: number[];
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    metaImage?: { id: number; url: string } | null;
    preventIndexing?: boolean;
  } | null;
}

// ----- Query Hooks -----

interface UseEventsListOptions {
  limit?: number;
  sort?: string;
  populate?: string | string[];
}

export function useEventsList(options: UseEventsListOptions = {}) {
  const {
    limit = 100,
    sort = 'startDate:desc',
    populate = ['heroImage', 'tags'],
  } = options;

  return useQuery({
    queryKey: queryKeys.events.list({ limit, sort }),
    queryFn: ({ signal }) =>
      apiClient.find<EventListItem>(
        API_ENDPOINTS.events,
        {
          sort: [sort],
          pagination: { limit },
          populate,
        },
        signal
      ),
  });
}

export function useRecentEvents(limit = 10) {
  return useQuery({
    queryKey: queryKeys.events.list({ limit, sort: 'updatedAt:desc' }),
    queryFn: ({ signal }) =>
      apiClient.find<EventListItem>(
        API_ENDPOINTS.events,
        {
          sort: ['updatedAt:desc'],
          pagination: { limit },
          populate: '*',
        },
        signal
      ),
  });
}

export function useEventDetail(id: string | undefined) {
  return useQuery<EventResponse>({
    queryKey: queryKeys.events.detail(id!),
    queryFn: ({ signal }) =>
      apiClient.findOne<EventDetail>(
        API_ENDPOINTS.events,
        id!,
        {
          populate: ['heroImage', 'tags', 'seo.metaImage'],
        },
        signal
      ) as Promise<EventResponse>,
    enabled: !!id,
  });
}

// ----- Mutation Hooks -----

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: EventFormData) => {
      try {
        const existing = await apiClient.find<{
          id: number;
          attributes?: { slug?: string };
          slug?: string;
        }>(API_ENDPOINTS.events, {
          filters: { slug: { $eq: formData.slug } },
          pagination: { limit: 1 },
        });

        if (existing?.data && existing.data.length > 0) {
          const existingEvent = existing.data[0];
          const existingSlug =
            existingEvent.attributes?.slug || existingEvent.slug;
          if (existingSlug === formData.slug) {
            throw new Error(
              `Esiste già un evento con lo slug "${formData.slug}". ` +
                `Modifica lo slug o modifica l'evento esistente (ID: ${existingEvent.id}).`
            );
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Esiste già un evento')
        ) {
          throw error;
        }
        logger.warn('Errore durante la verifica dello slug esistente:', error);
      }

      const data: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        body: formData.body || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        location: formData.location || null,
        address: formData.address || null,
        isOnline: formData.isOnline,
        onlineUrl: formData.onlineUrl || null,
        organizer: formData.organizer || null,
        externalUrl: formData.externalUrl || null,
        isFeatured: formData.isFeatured,
      };

      if (formData.heroImage) data.heroImage = formData.heroImage.id;
      if (formData.tags.length > 0) data.tags = formData.tags;

      if (formData.seo) {
        const seoData: Record<string, unknown> = {};
        if (formData.seo.metaTitle) seoData.metaTitle = formData.seo.metaTitle;
        if (formData.seo.metaDescription)
          seoData.metaDescription = formData.seo.metaDescription;
        if (formData.seo.keywords) seoData.keywords = formData.seo.keywords;
        if (formData.seo.metaImage) seoData.metaImage = formData.seo.metaImage.id;
        if (formData.seo.preventIndexing !== undefined)
          seoData.preventIndexing = formData.seo.preventIndexing;
        if (Object.keys(seoData).length > 0) data.seo = seoData;
      }

      return apiClient.create(API_ENDPOINTS.events, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
}

export function useUpdateEvent(
  id: string | undefined,
  currentData?: EventResponse | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: EventFormData) => {
      const currentEvent = currentData?.data;
      const currentAttrs = currentEvent?.attributes || currentEvent;

      const updateData: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        body: formData.body || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        location: formData.location || null,
        address: formData.address || null,
        isOnline: formData.isOnline,
        onlineUrl: formData.onlineUrl || null,
        organizer: formData.organizer || null,
        externalUrl: formData.externalUrl || null,
        isFeatured: formData.isFeatured,
      };

      // Preserva heroImage
      if (formData.heroImage) {
        updateData.heroImage = formData.heroImage.id;
      } else {
        const currentHeroImage = currentAttrs?.heroImage;
        if (currentHeroImage) {
          const heroImageId =
            currentHeroImage?.data?.id ?? currentHeroImage?.id;
          updateData.heroImage = heroImageId ?? null;
        } else {
          updateData.heroImage = null;
        }
      }

      // Preserva tags
      if (formData.tags.length > 0) {
        updateData.tags = formData.tags;
      } else {
        const currentTags = currentAttrs?.tags;
        if (currentTags) {
          const tagIds =
            Array.isArray(currentTags) && currentTags.length > 0
              ? currentTags
                  .map((tag: any) =>
                    typeof tag === 'object' && 'id' in tag ? tag.id : tag
                  )
                  .filter(
                    (tagId: any): tagId is number => typeof tagId === 'number'
                  )
              : [];
          updateData.tags = tagIds.length > 0 ? tagIds : [];
        } else {
          updateData.tags = [];
        }
      }

      // SEO
      if (formData.seo) {
        const seoData: Record<string, unknown> = {};
        if (formData.seo.metaTitle) seoData.metaTitle = formData.seo.metaTitle;
        if (formData.seo.metaDescription)
          seoData.metaDescription = formData.seo.metaDescription;
        if (formData.seo.keywords) seoData.keywords = formData.seo.keywords;
        if (formData.seo.metaImage) {
          seoData.metaImage = formData.seo.metaImage.id;
        } else {
          seoData.metaImage = null;
        }
        if (formData.seo.preventIndexing !== undefined)
          seoData.preventIndexing = formData.seo.preventIndexing;
        updateData.seo = seoData;
      } else {
        const currentSeo = currentAttrs?.seo;
        if (currentSeo && typeof currentSeo === 'object') {
          const seoData: Record<string, unknown> = {};
          if ('metaTitle' in currentSeo) seoData.metaTitle = currentSeo.metaTitle;
          if ('metaDescription' in currentSeo)
            seoData.metaDescription = currentSeo.metaDescription;
          if ('keywords' in currentSeo) seoData.keywords = currentSeo.keywords;
          if ('preventIndexing' in currentSeo)
            seoData.preventIndexing = currentSeo.preventIndexing;
          const currentMetaImage = (currentSeo as any)?.metaImage;
          if (currentMetaImage) {
            const metaImageId =
              currentMetaImage?.data?.id ?? currentMetaImage?.id;
            if (metaImageId) seoData.metaImage = metaImageId;
          }
          updateData.seo = Object.keys(seoData).length > 0 ? seoData : null;
        } else {
          updateData.seo = null;
        }
      }

      return apiClient.update(API_ENDPOINTS.events, id!, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.events.detail(id),
        });
      }
    },
  });
}

export function useDeleteEvent(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete(API_ENDPOINTS.events, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
}
