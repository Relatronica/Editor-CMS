import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { API_ENDPOINTS } from '../config/endpoints';
import { queryKeys } from '../config/queryKeys';
import { logger } from '../lib/logger';

// ----- Types -----

export interface ArticleListItem {
  id: number;
  documentId?: string;
  attributes: {
    title: string;
    slug: string;
    updatedAt: string;
    publishedAt: string | null;
    publishDate?: string;
    author?: {
      data?: {
        id: number;
        attributes?: { name: string };
      };
    };
  };
}

export interface ArticleDetail {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  heroImage?: any;
  publishDate?: string;
  isPremium?: boolean;
  readingTime?: number | null;
  author?: { data?: { id: number } } | number | null;
  tags?: { data?: Array<{ id: number }> } | number[];
  partners?: { data?: Array<{ id: number }> } | number[];
  seo?:
    | ({
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string;
        preventIndexing?: boolean;
      } & {
        metaImage?:
          | { data?: { id: number; attributes?: { url?: string } } }
          | { id: number; url: string }
          | null;
      })
    | null;
  attributes?: Partial<{
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    heroImage: { data?: { id: number; attributes?: { url?: string } } };
    publishDate: string;
    isPremium: boolean;
    readingTime: number | null;
    author: { data?: { id: number } };
    tags: { data?: Array<{ id: number }> };
    partners: { data?: Array<{ id: number }> };
    seo: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string;
      preventIndexing?: boolean;
      metaImage?: { data?: { id: number; attributes?: { url?: string } } };
    };
  }>;
}

export interface ArticleResponse {
  data: ArticleDetail;
  meta?: any;
}

// ----- Query Hooks -----

interface UseArticlesListOptions {
  limit?: number;
  sort?: string;
  filters?: Record<string, unknown>;
  populate?: string | string[];
}

export function useArticlesList(options: UseArticlesListOptions = {}) {
  const {
    limit = 10,
    sort = 'updatedAt:desc',
    filters,
    populate = '*',
  } = options;

  const queryParams: Record<string, unknown> = {
    sort: [sort],
    pagination: { limit },
    populate,
  };
  if (filters) queryParams.filters = filters;

  return useQuery({
    queryKey: queryKeys.articles.list({ limit, sort, filters }),
    queryFn: ({ signal }) =>
      apiClient.find<ArticleListItem>(
        API_ENDPOINTS.articles,
        queryParams,
        signal
      ),
  });
}

export function useArticleDetail(id: string | undefined) {
  return useQuery<ArticleResponse>({
    queryKey: queryKeys.articles.detail(id!),
    queryFn: ({ signal }) =>
      apiClient.findOne<ArticleDetail>(
        API_ENDPOINTS.articles,
        id!,
        {
          populate: ['heroImage', 'author', 'tags', 'partners', 'seo.metaImage'],
        },
        signal
      ) as Promise<ArticleResponse>,
    enabled: !!id,
  });
}

// ----- Mutation Hooks -----

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      title: string;
      slug: string;
      excerpt: string;
      body: string;
      heroImage: { id: number; url: string } | null;
      publishDate: string;
      isPremium: boolean;
      readingTime: number | null;
      author: number | null;
      tags: number[];
      partners: number[];
      seo: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string;
        metaImage?: { id: number; url: string } | null;
        preventIndexing?: boolean;
      } | null;
    }) => {
      try {
        const existing = await apiClient.find<{
          id: number;
          attributes?: { slug?: string };
          slug?: string;
        }>(API_ENDPOINTS.articles, {
          filters: { slug: { $eq: formData.slug } },
          pagination: { limit: 1 },
        });
        if (existing?.data && existing.data.length > 0) {
          const existingArticle = existing.data[0];
          const existingSlug =
            existingArticle.attributes?.slug || existingArticle.slug;
          if (existingSlug === formData.slug) {
            throw new Error(
              `Esiste già un articolo con lo slug "${formData.slug}". ` +
                `Modifica lo slug o modifica l'articolo esistente (ID: ${existingArticle.id}).`
            );
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Esiste già un articolo')
        ) {
          throw error;
        }
        logger.warn(
          'Errore durante la verifica dello slug esistente:',
          error
        );
      }

      const data: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || null,
        body: formData.body,
        publishDate: formData.publishDate || null,
        isPremium: formData.isPremium,
        readingTime: formData.readingTime || null,
      };

      if (formData.heroImage) data.heroImage = formData.heroImage.id;
      if (formData.author) data.author = formData.author;
      if (formData.tags.length > 0) data.tags = formData.tags;
      if (formData.partners.length > 0) data.partners = formData.partners;

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

      return apiClient.create(API_ENDPOINTS.articles, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.articles.lists() });
    },
  });
}

export function useUpdateArticle(
  id: string | undefined,
  currentData?: ArticleResponse | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      title: string;
      slug: string;
      excerpt: string;
      body: string;
      heroImage: { id: number; url: string } | null;
      publishDate: string;
      isPremium: boolean;
      readingTime: number | null;
      author: number | null;
      tags: number[];
      partners: number[];
      seo: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string;
        metaImage?: { id: number; url: string } | null;
        preventIndexing?: boolean;
      } | null;
    }) => {
      const currentArticle = currentData?.data;
      const currentAttrs = currentArticle?.attributes || currentArticle;

      const updateData: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || null,
        body: formData.body,
        publishDate: formData.publishDate || null,
        isPremium: formData.isPremium,
        readingTime: formData.readingTime || null,
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

      // Preserva author
      if (formData.author !== null && formData.author !== undefined) {
        updateData.author = formData.author;
      } else {
        const currentAuthor = currentAttrs?.author;
        if (currentAuthor) {
          const authorId =
            typeof currentAuthor === 'object' &&
            'data' in currentAuthor &&
            currentAuthor.data
              ? (currentAuthor as { data: { id: number } }).data.id
              : typeof currentAuthor === 'number'
                ? currentAuthor
                : null;
          updateData.author = authorId;
        } else {
          updateData.author = null;
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
                  .filter((tagId: any): tagId is number => typeof tagId === 'number')
              : [];
          updateData.tags = tagIds.length > 0 ? tagIds : [];
        } else {
          updateData.tags = [];
        }
      }

      // Preserva partners
      if (formData.partners.length > 0) {
        updateData.partners = formData.partners;
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
                  .filter((pId: any): pId is number => typeof pId === 'number')
              : [];
          updateData.partners = partnerIds.length > 0 ? partnerIds : [];
        } else {
          updateData.partners = [];
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
          if ('metaTitle' in currentSeo)
            seoData.metaTitle = currentSeo.metaTitle;
          if ('metaDescription' in currentSeo)
            seoData.metaDescription = currentSeo.metaDescription;
          if ('keywords' in currentSeo)
            seoData.keywords = currentSeo.keywords;
          if ('preventIndexing' in currentSeo)
            seoData.preventIndexing = currentSeo.preventIndexing;
          const currentMetaImage = (currentSeo as any)?.metaImage;
          if (currentMetaImage) {
            const metaImageId =
              currentMetaImage?.data?.id ?? currentMetaImage?.id;
            if (metaImageId) seoData.metaImage = metaImageId;
          }
          updateData.seo =
            Object.keys(seoData).length > 0 ? seoData : null;
        } else {
          updateData.seo = null;
        }
      }

      return apiClient.update(API_ENDPOINTS.articles, id!, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.articles.lists() });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.articles.detail(id),
        });
      }
    },
  });
}
