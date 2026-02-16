import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { API_ENDPOINTS } from '../config/endpoints';
import { VIDEO_EPISODE_FIELDS } from '../config/videoEpisodeFields';
import { queryKeys } from '../config/queryKeys';
import { logger } from '../lib/logger';

// ----- Types -----

export interface VideoEpisodeListItem {
  id: number;
  documentId?: string;
  attributes: {
    title: string;
    slug: string;
    updatedAt: string;
    publishedAt: string | null;
  };
}

export interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  metaImage?: { id: number; url: string } | null;
  preventIndexing?: boolean;
}

export interface VideoEpisodeDetail {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  synopsis?: string;
  body?: string;
  heroImage?: any;
  videoUrl?: string;
  videoOrientation?: string | null;
  durationSeconds?: number | null;
  publishDate?: string;
  isPremium?: boolean;
  show?: { data?: { id: number } } | number | null;
  tags?: { data?: Array<{ id: number }> } | number[];
  partners?: { data?: Array<{ id: number }> } | number[];
  seo?:
    | (SEOData & {
        metaImage?:
          | { data?: { id: number; attributes?: { url?: string } } }
          | { id: number; url: string }
          | null;
      })
    | null;
  attributes?: Partial<{
    title: string;
    slug: string;
    synopsis: string;
    body: string;
    videoUrl: string;
    videoOrientation: string | null;
    durationSeconds: number | null;
    heroImage: { data?: { id: number; attributes?: { url?: string } } };
    publishDate: string;
    isPremium: boolean;
    show: { data?: { id: number } };
    tags: { data?: Array<{ id: number }> };
    partners: { data?: Array<{ id: number }> };
    seo: SEOData & {
      metaImage?: { data?: { id: number; attributes?: { url?: string } } };
    };
  }>;
}

export interface VideoEpisodeResponse {
  data: VideoEpisodeDetail;
  meta?: any;
}

export interface VideoEpisodeFormData {
  title: string;
  slug: string;
  synopsis: string;
  body: string;
  heroImage: { id: number; url: string } | null;
  videoUrl: string;
  videoOrientation: string | null;
  durationSeconds: number | null;
  publishDate: string;
  isPremium: boolean;
  show: number | null;
  tags: number[];
  partners: number[];
  seo: SEOData | null;
}

// ----- Query Hooks -----

export function useVideoEpisodesList(options: { limit?: number; sort?: string } = {}) {
  const { limit = 10, sort = 'updatedAt:desc' } = options;

  return useQuery({
    queryKey: queryKeys.videoEpisodes.list({ limit, sort }),
    queryFn: ({ signal }) =>
      apiClient.find<VideoEpisodeListItem>(
        API_ENDPOINTS.videoEpisodes,
        {
          sort: [sort],
          pagination: { limit },
          populate: '*',
        },
        signal
      ),
  });
}

export function useVideoEpisodeDetail(id: string | undefined) {
  return useQuery<VideoEpisodeResponse>({
    queryKey: queryKeys.videoEpisodes.detail(id!),
    queryFn: ({ signal }) =>
      apiClient.findOne<VideoEpisodeDetail>(
        API_ENDPOINTS.videoEpisodes,
        id!,
        {
          populate: ['heroImage', 'show', 'tags', 'partners', 'seo.metaImage'],
        },
        signal
      ) as Promise<VideoEpisodeResponse>,
    enabled: !!id,
  });
}

// ----- Mutation Hooks -----

export function useCreateVideoEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: VideoEpisodeFormData) => {
      try {
        const existing = await apiClient.find<{
          id: number;
          attributes?: { slug?: string };
          slug?: string;
        }>(API_ENDPOINTS.videoEpisodes, {
          filters: { slug: { $eq: formData.slug } },
          pagination: { limit: 1 },
        });
        if (existing?.data && existing.data.length > 0) {
          const ep = existing.data[0];
          const existingSlug = ep.attributes?.slug || ep.slug;
          if (existingSlug === formData.slug) {
            throw new Error(
              `Esiste già un episodio video con lo slug "${formData.slug}". ` +
                `Modifica lo slug o modifica l'episodio esistente (ID: ${ep.id}).`
            );
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Esiste già un episodio')
        )
          throw error;
        logger.warn(
          'Errore durante la verifica dello slug esistente:',
          error
        );
      }

      const data: Record<string, unknown> = {
        [VIDEO_EPISODE_FIELDS.title]: formData.title,
        [VIDEO_EPISODE_FIELDS.slug]: formData.slug,
        [VIDEO_EPISODE_FIELDS.videoUrl]: formData.videoUrl,
        [VIDEO_EPISODE_FIELDS.isPremium]: formData.isPremium === true,
      };

      if (formData.synopsis?.trim())
        data[VIDEO_EPISODE_FIELDS.synopsis] = formData.synopsis;
      if (formData.body?.trim())
        data[VIDEO_EPISODE_FIELDS.body] = formData.body;
      if (formData.publishDate)
        data[VIDEO_EPISODE_FIELDS.publishDate] = formData.publishDate;
      if (formData.heroImage)
        data[VIDEO_EPISODE_FIELDS.heroImage] = formData.heroImage.id;
      if (formData.videoOrientation)
        data[VIDEO_EPISODE_FIELDS.videoOrientation] =
          formData.videoOrientation;
      if (formData.durationSeconds !== null && formData.durationSeconds !== undefined)
        data[VIDEO_EPISODE_FIELDS.durationSeconds] =
          formData.durationSeconds;
      if (formData.show)
        data[VIDEO_EPISODE_FIELDS.show] = formData.show;
      if (formData.tags.length > 0)
        data[VIDEO_EPISODE_FIELDS.tags] = formData.tags;
      if (formData.partners.length > 0)
        data[VIDEO_EPISODE_FIELDS.partners] = formData.partners;

      if (formData.seo) {
        const seoData: Record<string, unknown> = {};
        if (formData.seo.metaTitle) seoData.metaTitle = formData.seo.metaTitle;
        if (formData.seo.metaDescription)
          seoData.metaDescription = formData.seo.metaDescription;
        if (formData.seo.keywords) seoData.keywords = formData.seo.keywords;
        if (formData.seo.metaImage) seoData.metaImage = formData.seo.metaImage.id;
        if (formData.seo.preventIndexing !== undefined)
          seoData.preventIndexing = formData.seo.preventIndexing;
        if (Object.keys(seoData).length > 0) data[VIDEO_EPISODE_FIELDS.seo] = seoData;
      }

      try {
        const result = await apiClient.create(API_ENDPOINTS.videoEpisodes, data);
        return result;
      } catch (error: any) {
        if (error?.response?.data) {
          const errorData = error.response.data;
          if (errorData?.error?.message) {
            throw new Error(`Errore Strapi: ${errorData.error.message}`);
          } else if (errorData?.error?.details?.errors) {
            const errors = errorData.error.details.errors;
            const errorMessages = Object.entries(errors)
              .map(
                ([field, msgs]: [string, any]) =>
                  `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`
              )
              .join('; ');
            throw new Error(`Errore di validazione: ${errorMessages}`);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.videoEpisodes.lists(),
      });
    },
  });
}

export function useUpdateVideoEpisode(
  id: string | undefined,
  currentData?: VideoEpisodeResponse | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: VideoEpisodeFormData) => {
      const currentEpisode = currentData?.data;
      const currentAttrs = currentEpisode?.attributes || currentEpisode;

      const updateData: Record<string, unknown> = {
        [VIDEO_EPISODE_FIELDS.title]: formData.title,
        [VIDEO_EPISODE_FIELDS.slug]: formData.slug,
        [VIDEO_EPISODE_FIELDS.videoUrl]: formData.videoUrl,
        [VIDEO_EPISODE_FIELDS.isPremium]: formData.isPremium === true,
      };

      if (formData.synopsis?.trim())
        updateData[VIDEO_EPISODE_FIELDS.synopsis] = formData.synopsis;
      if (formData.body?.trim())
        updateData[VIDEO_EPISODE_FIELDS.body] = formData.body;
      if (formData.publishDate)
        updateData[VIDEO_EPISODE_FIELDS.publishDate] = formData.publishDate;

      // HeroImage
      if (formData.heroImage) {
        updateData[VIDEO_EPISODE_FIELDS.heroImage] = formData.heroImage.id;
      } else {
        const currentHeroImage = currentAttrs?.heroImage;
        if (currentHeroImage) {
          const heroImageId =
            currentHeroImage?.data?.id ?? currentHeroImage?.id;
          updateData[VIDEO_EPISODE_FIELDS.heroImage] = heroImageId ?? null;
        } else {
          updateData[VIDEO_EPISODE_FIELDS.heroImage] = null;
        }
      }

      if (formData.videoOrientation)
        updateData[VIDEO_EPISODE_FIELDS.videoOrientation] =
          formData.videoOrientation;
      if (formData.durationSeconds !== null && formData.durationSeconds !== undefined)
        updateData[VIDEO_EPISODE_FIELDS.durationSeconds] =
          formData.durationSeconds;

      // Show
      if (formData.show !== null && formData.show !== undefined) {
        updateData[VIDEO_EPISODE_FIELDS.show] = formData.show;
      } else {
        const currentShow = currentAttrs?.show;
        if (currentShow) {
          const showId =
            typeof currentShow === 'object' &&
            'data' in currentShow &&
            currentShow.data
              ? (currentShow as { data: { id: number } }).data.id
              : typeof currentShow === 'number'
                ? currentShow
                : null;
          updateData[VIDEO_EPISODE_FIELDS.show] = showId;
        } else {
          updateData[VIDEO_EPISODE_FIELDS.show] = null;
        }
      }

      // Tags
      if (formData.tags.length > 0) {
        updateData[VIDEO_EPISODE_FIELDS.tags] = formData.tags;
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
          updateData[VIDEO_EPISODE_FIELDS.tags] =
            tagIds.length > 0 ? tagIds : [];
        } else {
          updateData[VIDEO_EPISODE_FIELDS.tags] = [];
        }
      }

      // Partners
      if (formData.partners.length > 0) {
        updateData[VIDEO_EPISODE_FIELDS.partners] = formData.partners;
      } else {
        const currentPartners = currentAttrs?.partners;
        if (currentPartners) {
          const partnerIds =
            Array.isArray(currentPartners) && currentPartners.length > 0
              ? currentPartners
                  .map((partner: any) =>
                    typeof partner === 'object' && 'id' in partner
                      ? partner.id
                      : partner
                  )
                  .filter(
                    (pId: any): pId is number => typeof pId === 'number'
                  )
              : [];
          updateData[VIDEO_EPISODE_FIELDS.partners] =
            partnerIds.length > 0 ? partnerIds : [];
        } else {
          updateData[VIDEO_EPISODE_FIELDS.partners] = [];
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
        updateData[VIDEO_EPISODE_FIELDS.seo] = seoData;
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
          updateData[VIDEO_EPISODE_FIELDS.seo] =
            Object.keys(seoData).length > 0 ? seoData : null;
        } else {
          updateData[VIDEO_EPISODE_FIELDS.seo] = null;
        }
      }

      return apiClient.update(API_ENDPOINTS.videoEpisodes, id!, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.videoEpisodes.lists(),
      });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.videoEpisodes.detail(id),
        });
      }
    },
  });
}
