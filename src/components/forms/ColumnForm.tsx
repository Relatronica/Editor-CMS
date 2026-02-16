import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import ImageUpload from '../ui/ImageUpload';
import Select from '../ui/Select';
import { Plus, X, Loader2, AlertCircle } from 'lucide-react';

interface LinkItem {
  label: string;
  url: string;
  description?: string;
  publishDate?: string;
}

interface ColumnFormData {
  title: string;
  slug: string;
  description: string;
  cover: { id: number; url: string } | null;
  author: number | null;
  links: LinkItem[];
}

interface ColumnFormProps {
  initialData?: {
    id: number;
    attributes: Partial<ColumnFormData & { author?: { data?: { id: number } } }>;
  };
  onSubmit: (data: ColumnFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ColumnForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: ColumnFormProps) {
  const [formData, setFormData] = useState<ColumnFormData>({
    title: '',
    slug: '',
    description: '',
    cover: null,
    author: null,
    links: [],
  });

  // Stato per verificare se lo slug esiste già
  const [slugExists, setSlugExists] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const slugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stato per link duplicati
  const [duplicateLinks, setDuplicateLinks] = useState<Set<number>>(new Set());

  // Load authors
  const { data: authorsData, error: authorsError, isLoading: authorsLoading } = useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      try {
        const result = await apiClient.find<{ 
          id: number; 
          attributes: { 
            name: string;
            avatar?: {
              data?: {
                id: number;
                attributes?: {
                  url?: string;
                };
              };
            };
          } 
        }>('authors', {
          pagination: { limit: 100 },
          publicationState: 'preview', // Include draft content
          sort: ['name:asc'],
          populate: ['avatar'], // Popola l'avatar
        });
        console.log('✅ Authors loaded successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Error fetching authors:', error);
        throw error;
      }
    },
  });

  // Debug: log authors data
  useEffect(() => {
    if (authorsError) {
      console.error('❌ Error loading authors:', authorsError);
      if ('response' in authorsError && authorsError.response && typeof authorsError.response === 'object') {
        const response = authorsError.response as { status?: number; data?: unknown };
        console.error('Response status:', response.status);
        console.error('Response data:', response.data);
      }
    }
    if (authorsData) {
      console.log('✅ Authors data loaded:', authorsData);
      console.log('Authors count:', authorsData.data?.length || 0);
      console.log('First author structure:', authorsData.data?.[0]);
      console.log('First author attributes:', authorsData.data?.[0]?.attributes);
    }
    if (authorsLoading) {
      console.log('⏳ Loading authors...');
    }
  }, [authorsData, authorsError, authorsLoading]);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      const attrs = initialData.attributes;
      setFormData({
        title: attrs.title || '',
        slug: attrs.slug || '',
        description: attrs.description || '',
        cover: (() => {
          const coverValue = attrs.cover;
          if (!coverValue) return null;
          
          // Handle direct format: { id: number; url: string }
          if ('id' in coverValue && 'url' in coverValue && typeof coverValue.id === 'number' && typeof coverValue.url === 'string') {
            return {
              id: coverValue.id,
              url: coverValue.url.startsWith('http') ? coverValue.url : `${import.meta.env.VITE_STRAPI_URL}${coverValue.url}`,
            };
          }
          
          // Handle Strapi v4 format: { data?: { id: number; attributes?: { url?: string } } }
          if ('data' in coverValue && coverValue.data && typeof coverValue.data === 'object') {
            const coverData = coverValue.data as { id?: number; attributes?: { url?: string } };
            const coverId = coverData.id ?? 0;
            const coverUrl = coverData.attributes?.url;
            if (coverUrl && typeof coverUrl === 'string') {
              return {
                id: coverId,
                url: coverUrl.startsWith('http') ? coverUrl : `${import.meta.env.VITE_STRAPI_URL}${coverUrl}`,
              };
            }
          }
          
          return null;
        })(),
        author: attrs.author?.data?.id || null,
        links: Array.isArray(attrs.links)
          ? attrs.links.map((link: any) => ({
              label: link?.label || link?.attributes?.label || '',
              url: link?.url || link?.attributes?.url || '',
              description: link?.description || link?.attributes?.description || '',
              publishDate: link?.publishDate || link?.attributes?.publishDate || '',
            }))
          : [],
      });
    }
  }, [initialData]);

  // Verifica se lo slug esiste già (solo per nuove colonne, non in modifica)
  useEffect(() => {
    // Non verificare se siamo in modalità modifica o se lo slug è vuoto
    if (initialData || !formData.slug || formData.slug.length < 3) {
      setSlugExists(false);
      return;
    }

    // Cancella il timeout precedente
    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }

    // Debounce: aspetta 500ms prima di verificare
    setIsCheckingSlug(true);
    slugCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const existingColumns = await apiClient.find<{ 
          id: number; 
          attributes?: { slug?: string }; 
          slug?: string 
        }>('columns', {
          filters: {
            slug: { $eq: formData.slug },
          },
          pagination: { limit: 1 },
        });

        if (existingColumns?.data && existingColumns.data.length > 0) {
          const existingColumn = existingColumns.data[0];
          const existingSlug = existingColumn.attributes?.slug || existingColumn.slug;
          setSlugExists(existingSlug === formData.slug);
        } else {
          setSlugExists(false);
        }
      } catch (error) {
        console.warn('Errore durante la verifica dello slug:', error);
        setSlugExists(false);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => {
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
    };
  }, [formData.slug, initialData]);

  // Verifica link duplicati (stessa URL)
  useEffect(() => {
    const duplicates = new Set<number>();
    const urlMap = new Map<string, number[]>();

    formData.links.forEach((link, index) => {
      if (link.url && link.url.trim()) {
        const normalizedUrl = link.url.trim().toLowerCase();
        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl)!.push(index);
      }
    });

    urlMap.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((index) => duplicates.add(index));
      }
    });

    setDuplicateLinks(duplicates);
  }, [formData.links]);

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug:
        prev.slug === '' || prev.slug === prev.title.toLowerCase().replace(/\s+/g, '-')
          ? title
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          : prev.slug,
    }));
  };

  const handleAddLink = () => {
    setFormData((prev) => ({
      ...prev,
      links: [...prev.links, { label: '', url: '', description: '' }],
    }));
  };

  const handleRemoveLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };

  const handleLinkChange = (
    index: number,
    field: keyof LinkItem,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      links: prev.links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  // Helper per separare data e ora da una stringa ISO
  const splitDateTime = (dateTimeStr: string | undefined): { date: string; time: string } => {
    if (!dateTimeStr) {
      const now = new Date();
      return {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
      };
    }
    try {
      const date = new Date(dateTimeStr);
      return {
        date: date.toISOString().slice(0, 10),
        time: date.toTimeString().slice(0, 5),
      };
    } catch {
      const now = new Date();
      return {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
      };
    }
  };

  // Helper per combinare data e ora in formato ISO
  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    return new Date(`${date}T${time}`).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const authorOptions = useMemo(() => {
    if (!authorsData?.data || !Array.isArray(authorsData.data)) {
      console.log('⚠️ No authors data available or data is not an array');
      return [];
    }

    console.log('📝 Processing authors data:', authorsData.data);
    console.log('📝 First author sample:', JSON.stringify(authorsData.data[0], null, 2));
    
    const options = authorsData.data
      .map((author, index) => {
        // Handle different possible structures
        const authorWithId = author as { id?: number; documentId?: string; attributes?: { name?: string; avatar?: any } };
        const authorId = authorWithId?.id ?? authorWithId?.documentId;
        const authorAttributes = authorWithId?.attributes ?? author;
        
        if (!authorId) {
          console.log(`⚠️ Author at index ${index} has no ID:`, author);
          return null;
        }

        if (!authorAttributes) {
          console.log(`⚠️ Author at index ${index} has no attributes:`, author);
          return null;
        }

        const authorName = (authorAttributes as { name?: string })?.name;
        if (!authorName) {
          console.log(`⚠️ Author at index ${index} has no name:`, author);
          // Still include it but with a fallback label
        }

        const avatarData = (authorAttributes as { avatar?: any })?.avatar;
        const avatarWithData = avatarData as { data?: { attributes?: { url?: string } }; attributes?: { url?: string }; url?: string } | undefined;
        const avatarUrl = avatarWithData?.data?.attributes?.url 
          ?? avatarWithData?.attributes?.url 
          ?? avatarWithData?.url
          ?? null;
        
        const fullAvatarUrl = avatarUrl 
          ? (avatarUrl.startsWith('http') 
              ? avatarUrl 
              : `${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}${avatarUrl}`)
          : null;
        
        const option = {
          value: Number(authorId), // Ensure it's a number
          label: authorName || `Author #${authorId}`,
          avatar: fullAvatarUrl,
        };
        
        console.log(`✅ Created option for author ${index}:`, option);
        return option;
      })
      .filter((option): option is { value: number; label: string; avatar: string | null } => option !== null);
    
    console.log('📋 Final author options:', options);
    console.log('📊 Options count:', options.length);
    
    return options;
  }, [authorsData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="label">
          Titolo <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="input"
          required
          placeholder="Titolo della colonna"
        />
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="label">
          Slug <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, ''),
              }))
            }
            className={`input font-mono text-sm ${
              slugExists && !initialData
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : ''
            }`}
            required
            placeholder="slug-della-colonna"
          />
          {isCheckingSlug && !initialData && formData.slug.length >= 3 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-surface-400" size={16} />
            </div>
          )}
        </div>
        {slugExists && !initialData && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
            <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" size={16} />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                Attenzione: Esiste già una rubrica con questo slug!
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Modifica lo slug per evitare conflitti. Le rubriche con lo stesso slug potrebbero essere sovrascritte durante le importazioni.
              </p>
            </div>
          </div>
        )}
        {!slugExists && !isCheckingSlug && !initialData && formData.slug.length >= 3 && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Questo slug è disponibile
          </p>
        )}
        {!slugExists && !isCheckingSlug && (
          <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
            URL-friendly identifier (auto-generato dal titolo)
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="label">
          Descrizione
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          className="input"
          rows={4}
          placeholder="Descrizione della colonna..."
        />
      </div>

      {/* Cover Image */}
      <ImageUpload
        label="Immagine di copertina"
        value={formData.cover}
        onChange={(cover) => setFormData((prev) => ({ ...prev, cover }))}
      />

      {/* Author */}
      <Select
        label="Autore"
        value={formData.author}
        onChange={(author) =>
          setFormData((prev) => ({ ...prev, author: author as number }))
        }
        options={authorOptions}
        placeholder="Seleziona un autore..."
      />

      {/* Links */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label">
            Link <span className="text-sm font-normal text-surface-400 dark:text-surface-500">(collegamenti esterni)</span>
          </label>
          <button
            type="button"
            onClick={handleAddLink}
            className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
          >
            <Plus size={16} />
            <span>Aggiungi Link</span>
          </button>
        </div>

        {formData.links.length === 0 ? (
          <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-4 border border-dashed border-surface-300 dark:border-surface-700 rounded-xl">
            Nessun link aggiunto. Clicca "Aggiungi Link" per iniziare.
          </p>
        ) : (
          <div className="space-y-4">
            {formData.links.map((link, index) => (
              <div
                key={index}
                className="p-4 border border-surface-200 dark:border-surface-700 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Link #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(index)}
                    className="p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

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
                    className={`input text-sm font-mono ${
                      duplicateLinks.has(index)
                        ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-200'
                        : ''
                    }`}
                    required
                    placeholder="https://..."
                  />
                  {duplicateLinks.has(index) && (
                    <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 flex items-center space-x-1">
                      <AlertCircle size={12} />
                      <span>Questo URL è già presente in un altro link</span>
                    </p>
                  )}
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
                      <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
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
                      <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
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

      {/* Submit Button */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-surface-200 dark:border-surface-800">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isSubmitting && <Loader2 className="animate-spin" size={16} />}
          <span>{isSubmitting ? 'Salvataggio...' : 'Salva'}</span>
        </button>
      </div>
    </form>
  );
}
