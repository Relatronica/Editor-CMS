import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { API_ENDPOINTS } from '../config/endpoints';
import { queryKeys } from '../config/queryKeys';
import { logger } from '../lib/logger';

// ----- Types -----

export interface ColumnListItem {
  id: number;
  documentId?: string;
  attributes: {
    title: string;
    slug: string;
    updatedAt: string;
    publishedAt: string | null;
  };
}

export interface ColumnDetail {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  description?: string;
  cover?: any;
  author?: { data?: { id: number } } | number | null;
  links?: Array<{
    label: string;
    url: string;
    description?: string;
    publishDate?: string;
  }>;
  attributes?: Partial<{
    title: string;
    slug: string;
    description: string;
    cover: any;
    author: { data?: { id: number } };
    links: Array<{
      label: string;
      url: string;
      description?: string;
      publishDate?: string;
    }>;
  }>;
}

export interface ColumnResponse {
  data: ColumnDetail;
  meta?: any;
}

export interface ColumnFormData {
  title: string;
  slug: string;
  description: string;
  cover: { id: number; url: string } | null;
  author: number | null;
  links: Array<{
    label: string;
    url: string;
    description?: string;
    publishDate?: string;
  }>;
}

export interface LinkItem {
  label: string;
  url: string;
  description?: string;
  publishDate?: string;
}

// ----- Query Hooks -----

interface UseColumnsListOptions {
  limit?: number;
  sort?: string;
  populate?: string | string[];
}

export function useColumnsList(options: UseColumnsListOptions = {}) {
  const {
    limit = 10,
    sort = 'updatedAt:desc',
    populate = '*',
  } = options;

  return useQuery({
    queryKey: queryKeys.columns.list({ limit, sort }),
    queryFn: ({ signal }) =>
      apiClient.find<ColumnListItem>(
        API_ENDPOINTS.columns,
        {
          sort: [sort],
          pagination: { limit },
          populate,
        },
        signal
      ),
  });
}

export function useColumnDetail(id: string | undefined) {
  return useQuery<ColumnResponse>({
    queryKey: queryKeys.columns.detail(id!),
    queryFn: ({ signal }) =>
      apiClient.findOne<ColumnDetail>(
        API_ENDPOINTS.columns,
        id!,
        {
          populate: ['cover', 'author', 'links'],
        },
        signal
      ) as Promise<ColumnResponse>,
    enabled: !!id,
  });
}

export function useColumnLinks(id: string | undefined) {
  return useQuery<ColumnResponse>({
    queryKey: queryKeys.columns.links(id!),
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('Column ID is required');

      const numericId =
        typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;

      try {
        return (await apiClient.findOne<ColumnDetail>(
          API_ENDPOINTS.columns,
          numericId,
          { populate: ['links'] },
          signal
        )) as ColumnResponse;
      } catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            try {
              const allColumns = await apiClient.find<ColumnDetail>(
                API_ENDPOINTS.columns,
                { populate: ['links'], pagination: { limit: 100 } },
                signal
              );
              let foundColumn = allColumns.data?.find((col) => {
                const colId =
                  typeof col?.id === 'number' ? col.id : col?.id;
                return (
                  String(colId) === String(numericId) ||
                  colId === numericId
                );
              });
              if (!foundColumn && typeof id === 'string') {
                foundColumn = allColumns.data?.find(
                  (col) => col?.documentId === id
                );
              }
              if (foundColumn) {
                return { data: foundColumn, meta: allColumns.meta };
              }
            } catch {
              // Fall through
            }
          }
        }
        throw error;
      }
    },
    enabled: !!id,
    retry: 0,
  });
}

// ----- Mutation Hooks -----

export function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: ColumnFormData) => {
      try {
        const existing = await apiClient.find<{
          id: number;
          attributes?: { slug?: string };
          slug?: string;
        }>(API_ENDPOINTS.columns, {
          filters: { slug: { $eq: formData.slug } },
          pagination: { limit: 1 },
        });
        if (existing?.data && existing.data.length > 0) {
          const existingCol = existing.data[0];
          const existingSlug =
            existingCol.attributes?.slug || existingCol.slug;
          if (existingSlug === formData.slug) {
            throw new Error(
              `Esiste già una rubrica con lo slug "${formData.slug}". ` +
                `Modifica lo slug o modifica la rubrica esistente (ID: ${existingCol.id}).`
            );
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Esiste già una rubrica')
        )
          throw error;
        logger.warn(
          'Errore durante la verifica dello slug esistente:',
          error
        );
      }

      const data: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        links: formData.links.map((link) => ({
          label: link.label,
          url: link.url,
          description: link.description || null,
          publishDate: link.publishDate || null,
        })),
      };

      if (formData.cover) data.cover = formData.cover.id;
      if (formData.author) data.author = formData.author;

      return apiClient.create(API_ENDPOINTS.columns, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.lists() });
    },
  });
}

export function useUpdateColumn(
  id: string | undefined,
  currentData?: ColumnResponse | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: ColumnFormData) => {
      const currentColumn = currentData?.data;
      const existingLinks =
        currentColumn?.links ?? currentColumn?.attributes?.links ?? [];
      const existingLinksArray = Array.isArray(existingLinks)
        ? existingLinks
        : [];

      const formattedExisting = existingLinksArray.map((link: any) => ({
        label: link?.label ?? link?.attributes?.label ?? '',
        url: link?.url ?? link?.attributes?.url ?? '',
        description:
          link?.description ?? link?.attributes?.description ?? null,
        publishDate:
          link?.publishDate ?? link?.attributes?.publishDate ?? null,
      }));

      const formLinksCount = formData.links.filter(
        (link) => link.url && link.url.trim()
      ).length;
      const existingLinksCount = formattedExisting.filter(
        (link: any) => link.url && link.url.trim()
      ).length;

      let finalLinks: Array<{
        label: string;
        url: string;
        description: string | null;
        publishDate: string | null;
      }>;

      if (formLinksCount === 0 && existingLinksCount > 0) {
        logger.warn(
          'Form vuoto ma ci sono link esistenti. Preservando i link esistenti per sicurezza.'
        );
        finalLinks = formattedExisting;
      } else if (
        formLinksCount < existingLinksCount * 0.5 &&
        existingLinksCount > 3
      ) {
        logger.warn(
          'Form ha significativamente meno link rispetto a quelli esistenti. Preservando i link esistenti.'
        );
        const formLinkUrls = new Set(
          formData.links
            .filter((link) => link.url && link.url.trim())
            .map((link) => link.url.trim().toLowerCase())
        );
        const preservedLinks = formattedExisting.filter(
          (existingLink: any) => {
            const normalizedUrl = existingLink.url?.trim().toLowerCase();
            return !normalizedUrl || !formLinkUrls.has(normalizedUrl);
          }
        );
        finalLinks = [
          ...preservedLinks,
          ...formData.links.map((link) => ({
            label: link.label,
            url: link.url,
            description: link.description || null,
            publishDate: link.publishDate || null,
          })),
        ];
        const uniqueLinksMap = new Map<string, (typeof finalLinks)[0]>();
        finalLinks.forEach((link) => {
          if (link.url && link.url.trim()) {
            const normalizedUrl = link.url.trim().toLowerCase();
            if (
              !uniqueLinksMap.has(normalizedUrl) ||
              formLinkUrls.has(normalizedUrl)
            ) {
              uniqueLinksMap.set(normalizedUrl, link);
            }
          }
        });
        finalLinks = Array.from(uniqueLinksMap.values());
      } else {
        finalLinks = formData.links.map((link) => ({
          label: link.label,
          url: link.url,
          description: link.description || null,
          publishDate: link.publishDate || null,
        }));
      }

      const updateData: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        links: finalLinks,
      };

      if (formData.cover) {
        updateData.cover = formData.cover.id;
      } else {
        const currentCover =
          currentColumn?.cover ?? currentColumn?.attributes?.cover;
        if (!currentCover && formData.cover === null) {
          updateData.cover = null;
        }
      }

      if (formData.author !== null && formData.author !== undefined) {
        updateData.author = formData.author;
      } else {
        const currentAuthor =
          currentColumn?.author ?? currentColumn?.attributes?.author;
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

      return apiClient.update(API_ENDPOINTS.columns, id!, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.lists() });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.columns.detail(id),
        });
      }
    },
  });
}

export function useAddColumnLinks(
  id: string | undefined,
  currentData?: ColumnResponse | undefined
) {
  const queryClient = useQueryClient();

  return useMutation<ColumnResponse, Error, LinkItem[]>({
    mutationFn: async (linksToAdd: LinkItem[]): Promise<ColumnResponse> => {
      if (!id) throw new Error('Column ID is required');

      const column = currentData?.data;
      if (!column) throw new Error('Column data not found');

      const existingLinks =
        column?.links ?? column?.attributes?.links ?? [];
      const existingLinksArray = Array.isArray(existingLinks)
        ? existingLinks
        : [];

      const formattedExisting = existingLinksArray.map((link: any) => ({
        label: link?.label ?? link?.attributes?.label ?? '',
        url: link?.url ?? link?.attributes?.url ?? '',
        description:
          link?.description ?? link?.attributes?.description ?? null,
        publishDate:
          link?.publishDate ?? link?.attributes?.publishDate ?? null,
      }));

      const allLinks = [
        ...formattedExisting,
        ...linksToAdd.map((link) => ({
          label: link.label,
          url: link.url,
          description: link.description || null,
          publishDate: link.publishDate || null,
        })),
      ];

      const documentId = column?.documentId;
      const columnId = column?.id;
      const numericId =
        typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;

      const data = { links: allLinks };

      // Prova ID strategies in ordine di preferenza
      if (documentId) {
        try {
          return (await apiClient.update<ColumnDetail>(
            API_ENDPOINTS.columns,
            documentId,
            data
          )) as ColumnResponse;
        } catch {
          // Fall through
        }
      }

      if (columnId !== undefined && columnId !== null) {
        try {
          return (await apiClient.update<ColumnDetail>(
            API_ENDPOINTS.columns,
            columnId,
            data
          )) as ColumnResponse;
        } catch {
          // Fall through
        }
      }

      if (numericId !== undefined && numericId !== null) {
        return (await apiClient.update<ColumnDetail>(
          API_ENDPOINTS.columns,
          numericId,
          data
        )) as ColumnResponse;
      }

      throw new Error('Nessun ID valido trovato per la rubrica');
    },
    onSuccess: (responseData: ColumnResponse) => {
      // Aggiorna la cache con i dati dalla risposta del server
      if (responseData?.data) {
        const updatedColumn = responseData.data;
        queryClient.setQueryData(
          queryKeys.columns.links(id!),
          responseData
        );
        if (
          updatedColumn?.documentId &&
          updatedColumn.documentId !== id
        ) {
          queryClient.setQueryData(
            queryKeys.columns.links(updatedColumn.documentId),
            responseData
          );
        }
        if (
          updatedColumn?.id &&
          String(updatedColumn.id) !== String(id)
        ) {
          queryClient.setQueryData(
            queryKeys.columns.links(updatedColumn.id),
            responseData
          );
        }
      }
      // Invalida le liste
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.lists() });
    },
  });
}
