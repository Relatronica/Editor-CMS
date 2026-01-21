import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { ArrowLeft, AlertCircle, Loader2, Plus, X, Link as LinkIcon, CheckCircle2, ExternalLink, Calendar } from 'lucide-react';

interface LinkItem {
  label: string;
  url: string;
  description?: string;
  publishDate?: string;
}

// Support both Strapi v4 (with attributes) and v5 (direct fields + documentId)
interface ColumnData {
  id?: number;
  documentId?: string;
  title?: string;
  slug?: string;
  description?: string;
  links?: LinkItem[] | any[];
  attributes?: {
    title?: string;
    slug?: string;
    description?: string;
    links?: LinkItem[] | any[];
  };
}

interface ColumnResponse {
  data: ColumnData;
  meta?: any;
}

export default function ManageColumnLinksPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newLinks, setNewLinks] = useState<LinkItem[]>([]);
  const [existingLinksCount, setExistingLinksCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionSavedLinks, setSessionSavedLinks] = useState<LinkItem[]>([]);

  const { data: columnData, isLoading, error: queryError } = useQuery<ColumnResponse>({
    queryKey: ['columns', id, 'links'],
    queryFn: async () => {
      if (!id) {
        throw new Error('Column ID is required');
      }
      
      const numericId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
      
      try {
        return await apiClient.findOne<ColumnData>('columns', numericId, {
          populate: ['links'],
        }) as ColumnResponse;
      } catch (error) {
        // If numeric ID fails with 404, try to fetch all columns and find by documentId
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          
          if (axiosError.response?.status === 404) {
            try {
              const allColumns = await apiClient.find<ColumnData>('columns', {
                populate: ['links'],
                pagination: { limit: 100 },
              });
              
              let foundColumn = allColumns.data?.find((col: ColumnData) => {
                const colId = typeof col?.id === 'number' ? col.id : col?.id;
                return String(colId) === String(numericId) || colId === numericId;
              });
              
              if (!foundColumn && typeof id === 'string') {
                foundColumn = allColumns.data?.find((col: ColumnData) => {
                  return col?.documentId === id;
                });
              }
              
              if (foundColumn) {
                return {
                  data: foundColumn,
                  meta: allColumns.meta,
                };
              }
            } catch (fetchAllError) {
              // Fall through to throw original error
            }
          }
        }
        
        throw error;
      }
    },
    enabled: !!id,
    retry: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Count existing links - update when columnData or cache changes
  useEffect(() => {
    // Check cache first for latest data, then fallback to columnData
    const cachedData = queryClient.getQueryData<ColumnResponse>(['columns', id, 'links']);
    const column = cachedData?.data || columnData?.data;
    
    if (column) {
      // Handle both Strapi v4 (attributes) and v5 (direct) structures
      const links = column?.links ?? column?.attributes?.links ?? [];
      const linksArray = Array.isArray(links) ? links : [];
      setExistingLinksCount(linksArray.length);
    }
  }, [columnData, id, queryClient]);

  const mutation = useMutation<ColumnResponse, Error, LinkItem[]>({
    mutationFn: async (linksToAdd: LinkItem[]): Promise<ColumnResponse> => {
      // Wait for any ongoing refresh to complete before proceeding
      // This prevents race conditions when saving multiple links quickly
      if (isRefreshing) {
        // Wait up to 2 seconds for refresh to complete
        let waitCount = 0;
        while (isRefreshing && waitCount < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
        }
      }
      
      // Force a fresh fetch from server if cache might be stale
      // This ensures we always have the latest data from Strapi
      let column = columnData?.data;
      try {
        // Get the correct ID - prefer documentId (Strapi v5 primary identifier)
        const documentId = column?.documentId;
        const columnId = column?.id;
        const numericId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
        
        // Try to get fresh data from server, using the same ID strategy as update
        let freshData: ColumnResponse | null = null;
        
        // Try documentId first (most reliable for Strapi v5)
        if (documentId) {
          try {
            freshData = await queryClient.fetchQuery<ColumnResponse>({
              queryKey: ['columns', documentId, 'links'],
              queryFn: async () => {
                return await apiClient.findOne<ColumnData>('columns', documentId, {
                  populate: ['links'],
                }) as ColumnResponse;
              },
              staleTime: 0, // Always fetch fresh
            });
          } catch (docError) {
            // Fall through to try column.id
          }
        }
        
        // Try column.id if documentId failed or not available
        if (!freshData && columnId !== undefined && columnId !== null) {
          try {
            freshData = await queryClient.fetchQuery<ColumnResponse>({
              queryKey: ['columns', columnId, 'links'],
              queryFn: async () => {
                return await apiClient.findOne<ColumnData>('columns', columnId, {
                  populate: ['links'],
                }) as ColumnResponse;
              },
              staleTime: 0,
            });
          } catch (colError) {
            // Fall through to try numericId
          }
        }
        
        // Try numericId from URL as last resort
        if (!freshData && numericId !== undefined && numericId !== null) {
          try {
            freshData = await queryClient.fetchQuery<ColumnResponse>({
              queryKey: ['columns', numericId, 'links'],
              queryFn: async () => {
                return await apiClient.findOne<ColumnData>('columns', numericId, {
                  populate: ['links'],
                }) as ColumnResponse;
              },
              staleTime: 0,
            });
          } catch (numError) {
            // Will fall back to cache below
          }
        }
        
        if (freshData?.data) {
          column = freshData.data;
          // Update cache with fresh data
          queryClient.setQueryData(['columns', id, 'links'], freshData);
          if (column?.documentId) {
            queryClient.setQueryData(['columns', column.documentId, 'links'], freshData);
          }
          if (column?.id) {
            queryClient.setQueryData(['columns', column.id, 'links'], freshData);
          }
        }
      } catch (fetchError) {
        // Fallback to cache if all fetch attempts fail
        const cachedData = queryClient.getQueryData<ColumnResponse>(['columns', id, 'links']);
        if (cachedData?.data) {
          column = cachedData.data;
        }
      }
      
      if (!column) {
        throw new Error('Column data not found');
      }
      
      const existingLinks = column?.links ?? column?.attributes?.links ?? [];
      const existingLinksArray = Array.isArray(existingLinks) ? existingLinks : [];
      
      // Format existing links
      const formattedExisting = existingLinksArray.map((link: any) => ({
        label: link?.label ?? link?.attributes?.label ?? '',
        url: link?.url ?? link?.attributes?.url ?? '',
        description: link?.description ?? link?.attributes?.description ?? null,
        publishDate: link?.publishDate ?? link?.attributes?.publishDate ?? null,
      }));

      // Combine existing + new links
      const allLinks = [
        ...formattedExisting,
        ...linksToAdd.map((link) => ({
          label: link.label,
          url: link.url,
          description: link.description || null,
          publishDate: link.publishDate || null,
        })),
      ];

      const data: Record<string, unknown> = {
        links: allLinks,
      };

      if (!id) {
        throw new Error('Column ID is required');
      }

      // Get the correct ID from the column data
      // In Strapi v5, documentId is the primary identifier for REST API operations
      const documentId = column?.documentId;
      const columnId = column?.id;
      const numericId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;

      // Try multiple ID strategies in order of preference:
      // 1. documentId first (Strapi v5 primary identifier - most reliable)
      // 2. column.id (the ID from the retrieved column data)
      // 3. numericId from URL params (fallback)
      
      if (documentId) {
        try {
          return await apiClient.update<ColumnData>('columns', documentId, data) as ColumnResponse;
        } catch (documentIdError) {
          // Fall through to try column.id
        }
      }

      if (columnId !== undefined && columnId !== null) {
        try {
          return await apiClient.update<ColumnData>('columns', columnId, data) as ColumnResponse;
        } catch (columnIdError) {
          // Fall through to try numericId
        }
      }

      if (numericId !== undefined && numericId !== null) {
        try {
          return await apiClient.update<ColumnData>('columns', numericId, data) as ColumnResponse;
        } catch (numericIdError) {
          throw new Error(
            `Impossibile aggiornare la rubrica. ID tentati: documentId=${documentId}, columnId=${columnId}, numericId=${numericId}`
          );
        }
      }

      throw new Error('Nessun ID valido trovato per la rubrica');
    },
    onSuccess: async (data: ColumnResponse) => {
      setIsRefreshing(true);
      
      try {
        if (data?.data) {
          const updatedColumn: ColumnData = data.data;
          
          // Get the ID that actually worked for the update (documentId is preferred)
          const workingId = updatedColumn?.documentId || updatedColumn?.id || id;
          
          // Update the cache with the latest data from server response IMMEDIATELY
          // This ensures we have the exact data that was saved
          queryClient.setQueryData(['columns', id, 'links'], data);
          
          // Also update cache for alternative ID formats to ensure consistency
          if (updatedColumn?.documentId && updatedColumn.documentId !== id) {
            queryClient.setQueryData(['columns', updatedColumn.documentId, 'links'], data);
          }
          if (updatedColumn?.id && String(updatedColumn.id) !== String(id)) {
            queryClient.setQueryData(['columns', updatedColumn.id, 'links'], data);
          }
          
          // Force a fresh refetch from server to ensure we have the absolute latest data
          // This is critical for consecutive saves
          // Use documentId first (most reliable for Strapi v5)
          const refreshId = updatedColumn?.documentId || updatedColumn?.id || workingId;
          
          if (refreshId) {
            try {
              // Fetch fresh data using the ID that worked for the update
              const freshData = await queryClient.fetchQuery<ColumnResponse>({
                queryKey: ['columns', refreshId, 'links'],
                queryFn: async () => {
                  const numericId = typeof refreshId === 'string' && !isNaN(Number(refreshId)) 
                    ? Number(refreshId) 
                    : refreshId;
                  
                  // Try documentId first if available
                  if (updatedColumn?.documentId && typeof updatedColumn.documentId === 'string') {
                    return await apiClient.findOne<ColumnData>('columns', updatedColumn.documentId, {
                      populate: ['links'],
                    }) as ColumnResponse;
                  }
                  
                  // Fallback to numeric ID
                  return await apiClient.findOne<ColumnData>('columns', numericId, {
                    populate: ['links'],
                  }) as ColumnResponse;
                },
                staleTime: 0, // Always fetch fresh
              });
              
              if (freshData?.data) {
                // Update all cache entries with the fresh data from server
                queryClient.setQueryData(['columns', id, 'links'], freshData);
                if (updatedColumn?.documentId) {
                  queryClient.setQueryData(['columns', updatedColumn.documentId, 'links'], freshData);
                }
                if (updatedColumn?.id) {
                  queryClient.setQueryData(['columns', updatedColumn.id, 'links'], freshData);
                }
                
                // Force the query to refetch so columnData updates
                // Only refetch with the ID that works, skip URL ID if different
                await queryClient.refetchQueries({ 
                  queryKey: ['columns', refreshId, 'links'],
                  exact: false
                });
              }
            } catch (refreshError) {
              // If refresh fails, we still have the data from mutation response in cache
              // This is acceptable - the mutation response is already correct
            }
          }
        } else {
          // Fallback: try to refetch with the original ID
          try {
            await queryClient.refetchQueries({ 
              queryKey: ['columns', id, 'links']
            });
          } catch (fallbackError) {
            // Ignore - we have the data from mutation response
          }
        }
      } catch (refreshError) {
        // If refresh fails, we still have the data from mutation response in cache
        // This is acceptable - the mutation response is already correct
      } finally {
        setIsRefreshing(false);
      }
      
      // Invalidate general queries
      queryClient.invalidateQueries({ 
        queryKey: ['columns', 'recent'],
        exact: true
      });
      queryClient.invalidateQueries({ 
        queryKey: ['columns', 'all'],
        exact: true
      });
      // Invalidate calendar query to refresh scheduled content
      queryClient.invalidateQueries({ 
        queryKey: ['columns', 'scheduled']
      });
      
      setError('');
      setSuccess(`✅ ${newLinks.length} link aggiunto/i con successo! Puoi continuare ad aggiungerne altri.`);
      
      // Add saved links to session list
      setSessionSavedLinks(prev => [...prev, ...newLinks]);
      
      setNewLinks([]);
      setTimeout(() => setSuccess(''), 5000);
      
      // Force a small delay to ensure cache is fully updated before next save
      // This prevents race conditions when saving multiple links quickly
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante il salvataggio. Riprova.'
      );
      setSuccess('');
    },
  });

  const handleAddLink = () => {
    setNewLinks([...newLinks, { label: '', url: '', description: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setNewLinks(newLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (
    index: number,
    field: keyof LinkItem,
    value: string
  ) => {
    setNewLinks(
      newLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  };

  // Helper per separare data e ora da una stringa ISO
  // Usa il fuso orario locale per evitare problemi di conversione
  const splitDateTime = (dateTimeStr: string | undefined): { date: string; time: string } => {
    if (!dateTimeStr) {
      const now = new Date();
      // Usa il fuso orario locale per la data
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    }
    try {
      const date = new Date(dateTimeStr);
      // Usa il fuso orario locale per evitare problemi di conversione
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    } catch {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    }
  };

  // Helper per combinare data e ora in formato ISO
  // Usa il fuso orario locale per evitare problemi di conversione
  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    // Crea una data nel fuso orario locale
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hours, minutes);
    // Converti in ISO string mantenendo il fuso orario locale
    // Usa toISOString() che converte in UTC, ma la data selezionata è corretta
    return localDate.toISOString();
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    
    if (newLinks.length === 0) {
      setError('Aggiungi almeno un link prima di salvare.');
      return;
    }
    
    // Validate links
    const invalidLinks = newLinks.filter(
      (link) => !link.label.trim() || !link.url.trim()
    );
    
    if (invalidLinks.length > 0) {
      setError('Tutti i link devono avere label e URL compilati.');
      return;
    }

    // Verifica link duplicati tra i nuovi link
    const urlMap = new Map<string, number[]>();
    newLinks.forEach((link, index) => {
      if (link.url && link.url.trim()) {
        const normalizedUrl = link.url.trim().toLowerCase();
        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl)!.push(index);
      }
    });

    const duplicates: number[] = [];
    urlMap.forEach((indices) => {
      if (indices.length > 1) {
        duplicates.push(...indices);
      }
    });

    if (duplicates.length > 0) {
      setError(`Ci sono link duplicati con la stessa URL. Rimuovi i duplicati prima di salvare.`);
      return;
    }

    // Verifica se i nuovi link hanno URL già presenti nei link esistenti
    // Usa i dati dalla cache per avere sempre i dati più aggiornati
    const cachedData = queryClient.getQueryData<ColumnResponse>(['columns', id, 'links']);
    const column = cachedData?.data || columnData?.data;
    const existingLinks = column?.links ?? column?.attributes?.links ?? [];
    const existingLinksArray = Array.isArray(existingLinks) ? existingLinks : [];
    
    const existingUrls = new Set(
      existingLinksArray
        .map((link: any) => {
          const url = link?.url ?? link?.attributes?.url;
          return url && typeof url === 'string' ? url.trim().toLowerCase() : null;
        })
        .filter((url): url is string => url !== null)
    );

    const conflictingLinks: number[] = [];
    newLinks.forEach((link, index) => {
      if (link.url && link.url.trim()) {
        const normalizedUrl = link.url.trim().toLowerCase();
        if (existingUrls.has(normalizedUrl)) {
          conflictingLinks.push(index);
        }
      }
    });

    if (conflictingLinks.length > 0) {
      setError(
        `${conflictingLinks.length} link hanno URL già presenti nella rubrica. ` +
        `Modifica gli URL o rimuovi i link duplicati.`
      );
      return;
    }

    await mutation.mutateAsync(newLinks);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Errore nel caricamento della rubrica
          </h2>
          <p className="text-gray-600 mb-2">
            Impossibile caricare la rubrica con ID: {id}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {queryError instanceof Error ? queryError.message : 'Errore sconosciuto'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/columns/select-links" className="btn-primary inline-block">
              Seleziona un'altra rubrica
            </Link>
            <Link to="/" className="btn-secondary inline-block">
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!columnData?.data) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      );
    }
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Rubrica non trovata
          </h2>
          <p className="text-gray-600 mb-4">
            La rubrica che stai cercando non esiste o è stata eliminata.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/columns/select-links" className="btn-primary inline-block">
              Seleziona un'altra rubrica
            </Link>
            <Link to="/" className="btn-secondary inline-block">
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const column: ColumnData = columnData.data;
  const columnTitle = column?.title ?? column?.attributes?.title ?? 'Senza titolo';

  // Format session saved links for display (only links saved in current session)
  const formattedSessionLinks = sessionSavedLinks.map((link, index) => ({
    index,
    label: link.label || 'Senza label',
    url: link.url || '',
    description: link.description,
    publishDate: link.publishDate,
  }));

  // Helper to format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <LinkIcon className="text-primary-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">
            Aggiungi Link - {columnTitle}
          </h1>
        </div>
        <p className="text-gray-600 mt-1">
          Aggiungi nuovi link a questa rubrica {existingLinksCount > 0 && `(${existingLinksCount} link esistenti)`}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Session Saved Links Section */}
      {formattedSessionLinks.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-green-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">
              Link inseriti in questa sessione ({formattedSessionLinks.length})
            </h2>
          </div>
          <div className="space-y-3">
            {formattedSessionLinks.map((link, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {link.label}
                      </h3>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 flex-shrink-0"
                        title="Apri link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-primary-600 font-mono truncate block mb-2"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                    {link.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                    {link.publishDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>Pubblicazione: {formatDate(link.publishDate) || 'Data non valida'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="space-y-6">
          {/* New Links Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="label text-lg">
                Nuovi Link da Aggiungere
              </label>
              <button
                type="button"
                onClick={handleAddLink}
                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Plus size={16} />
                <span>Aggiungi Link</span>
              </button>
            </div>

            {newLinks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg">
                Nessun nuovo link da aggiungere. Clicca "Aggiungi Link" per iniziare.
              </p>
            ) : (
              <div className="space-y-4">
                {newLinks.map((link, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Link #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Rimuovi link"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Label *</label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) =>
                            handleLinkChange(index, 'label', e.target.value)
                          }
                          className="input text-sm"
                          required
                          placeholder="Testo del link"
                        />
                      </div>

                      <div>
                        <label className="label text-xs">URL *</label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) =>
                            handleLinkChange(index, 'url', e.target.value)
                          }
                          className="input text-sm font-mono"
                          required
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label text-xs">Descrizione</label>
                      <textarea
                        value={link.description || ''}
                        onChange={(e) =>
                          handleLinkChange(index, 'description', e.target.value)
                        }
                        className="input text-sm"
                        rows={2}
                        placeholder="Descrizione opzionale del link..."
                      />
                    </div>

                    <div>
                      <label className="label text-xs mb-2">Data di pubblicazione (opzionale)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Data
                          </label>
                          <input
                            type="date"
                            value={splitDateTime(link.publishDate).date}
                            onChange={(e) => {
                              const { time } = splitDateTime(link.publishDate);
                              const newDateTime = combineDateTime(e.target.value, time);
                              handleLinkChange(index, 'publishDate', newDateTime);
                            }}
                            className="input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Ora
                          </label>
                          <input
                            type="time"
                            value={splitDateTime(link.publishDate).time}
                            onChange={(e) => {
                              const { date } = splitDateTime(link.publishDate);
                              const newDateTime = combineDateTime(date, e.target.value);
                              handleLinkChange(index, 'publishDate', newDateTime);
                            }}
                            className="input text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={mutation.isPending || newLinks.length === 0 || isRefreshing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {(mutation.isPending || isRefreshing) && <Loader2 className="animate-spin" size={16} />}
              <span>
                {isRefreshing
                  ? 'Aggiornamento...'
                  : mutation.isPending 
                  ? 'Salvataggio...' 
                  : newLinks.length === 0
                  ? 'Aggiungi almeno un link'
                  : `Aggiungi ${newLinks.length} link`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
