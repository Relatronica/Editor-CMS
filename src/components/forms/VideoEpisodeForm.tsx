import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import ImageUpload from '../ui/ImageUpload';
import VideoUpload from '../ui/VideoUpload';
import Select from '../ui/Select';
import MultiSelect from '../ui/MultiSelect';
import RichTextEditor from '../editors/RichTextEditor';
import { Loader2, AlertCircle } from 'lucide-react';

interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  metaImage?: { id: number; url: string } | null;
  preventIndexing?: boolean;
}

interface VideoEpisodeFormData {
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

interface VideoEpisodeFormProps {
  initialData?: {
    id: number;
    attributes: Partial<
      VideoEpisodeFormData & {
        show?: { data?: { id: number } };
        tags?: { data?: Array<{ id: number }> };
        partners?: { data?: Array<{ id: number }> };
        heroImage?: { data?: { id: number; attributes?: { url?: string } } };
        seo?: SEOData & {
          metaImage?: { data?: { id: number; attributes?: { url?: string } } };
        };
      }
    >;
  };
  onSubmit: (data: VideoEpisodeFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function VideoEpisodeForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: VideoEpisodeFormProps) {
  // Stati separati per data e ora
  const [publishDate, setPublishDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [publishTime, setPublishTime] = useState<string>(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:mm
  });

  const [formData, setFormData] = useState<VideoEpisodeFormData>({
    title: '',
    slug: '',
    synopsis: '',
    body: '',
    heroImage: null,
    videoUrl: '',
    videoOrientation: null,
    durationSeconds: null,
    publishDate: new Date().toISOString().slice(0, 16),
    isPremium: false,
    show: null,
    tags: [],
    partners: [],
    seo: null,
  });

  // Stato per gestire il video caricato (per mostrare il preview)
  const [uploadedVideo, setUploadedVideo] = useState<{ id: number; url: string } | null>(null);

  // Stato per verificare se lo slug esiste già
  const [slugExists, setSlugExists] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const slugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load shows, tags, partners
  const { data: showsData } = useQuery({
    queryKey: ['shows'],
    queryFn: async () => {
      const result = await apiClient.find<{ 
        id: number; 
        attributes: { name: string } 
      }>('shows', {
        pagination: { limit: 100 },
        sort: ['name:asc'],
      });
      return result;
    },
  });

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () =>
      apiClient.find<{ id: number; attributes: { name: string } }>('tags', {
        pagination: { limit: 200 },
      }),
  });

  const { data: partnersData } = useQuery({
    queryKey: ['partners'],
    queryFn: () =>
      apiClient.find<{ id: number; attributes: { name: string } }>('partners', {
        pagination: { limit: 100 },
      }),
  });

  // Sincronizza publishDate quando cambiano data o ora
  useEffect(() => {
    if (publishDate && publishTime) {
      const combined = `${publishDate}T${publishTime}`;
      setFormData((prev) => {
        if (prev.publishDate !== combined) {
          return { ...prev, publishDate: combined };
        }
        return prev;
      });
    }
  }, [publishDate, publishTime]);

  // Initialize form
  useEffect(() => {
    if (initialData) {
      const attrs = initialData.attributes;
      const getMediaUrl = (media: unknown) => {
        if (
          typeof media === 'object' &&
          media !== null &&
          'data' in media &&
          media.data &&
          typeof media.data === 'object' &&
          'attributes' in media.data &&
          media.data.attributes &&
          typeof media.data.attributes === 'object' &&
          'url' in media.data.attributes
        ) {
          const url = media.data.attributes.url;
          return typeof url === 'string'
            ? url.startsWith('http')
              ? url
              : `${import.meta.env.VITE_STRAPI_URL}${url}`
            : '';
        }
        return '';
      };

      const publishDateValue = attrs.publishDate
        ? new Date(attrs.publishDate)
        : new Date();
      
      setPublishDate(publishDateValue.toISOString().slice(0, 10));
      setPublishTime(publishDateValue.toTimeString().slice(0, 5));

      setFormData({
        title: attrs.title || '',
        slug: attrs.slug || '',
        synopsis: attrs.synopsis || '',
        body: attrs.body || '',
        heroImage:
          attrs.heroImage?.data?.id && getMediaUrl(attrs.heroImage)
            ? { id: attrs.heroImage.data.id, url: getMediaUrl(attrs.heroImage) }
            : null,
        videoUrl: attrs.videoUrl || '',
        // Se c'è un videoUrl, non c'è un video caricato separato (il videoUrl è l'URL)
        // Ma possiamo mostrare un preview se necessario
        videoOrientation: attrs.videoOrientation || null,
        durationSeconds: attrs.durationSeconds || null,
        publishDate: attrs.publishDate
          ? new Date(attrs.publishDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        isPremium: attrs.isPremium || false,
        show: attrs.show?.data?.id || null,
        tags: attrs.tags?.data?.map((t) => t.id) || [],
        partners: attrs.partners?.data?.map((p) => p.id) || [],
        seo: attrs.seo || null,
      });
    }
  }, [initialData]);

  // Verifica se lo slug esiste già
  useEffect(() => {
    if (initialData || !formData.slug || formData.slug.length < 3) {
      setSlugExists(false);
      return;
    }

    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }

    setIsCheckingSlug(true);
    slugCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const existingEpisodes = await apiClient.find<{ 
          id: number; 
          attributes?: { slug?: string }; 
          slug?: string 
        }>(API_ENDPOINTS.videoEpisodes, {
          filters: {
            slug: { $eq: formData.slug },
          },
          pagination: { limit: 1 },
        });

        if (existingEpisodes?.data && existingEpisodes.data.length > 0) {
          const existingEpisode = existingEpisodes.data[0];
          const existingSlug = existingEpisode.attributes?.slug || existingEpisode.slug;
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

  // Auto-generate slug
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const showOptions = useMemo(() => {
    if (!showsData?.data || !Array.isArray(showsData.data)) {
      return [];
    }
    return showsData.data
      .map((show) => ({
        value: show.id,
        label: show.attributes?.name || `Show #${show.id}`,
      }))
      .filter((option): option is { value: number; label: string } => option !== null);
  }, [showsData]);

  const tagOptions =
    tagsData?.data
      .filter((tag) => tag?.id && tag?.attributes?.name)
      .map((tag) => ({
        id: tag.id,
        label: tag.attributes.name,
      })) || [];

  const partnerOptions =
    partnersData?.data
      .filter((partner) => partner?.id && partner?.attributes?.name)
      .map((partner) => ({
        id: partner.id,
        label: partner.attributes.name,
      })) || [];

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
          placeholder="Titolo dell'episodio video"
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
            placeholder="slug-episodio-video"
          />
          {isCheckingSlug && !initialData && formData.slug.length >= 3 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-surface-400 dark:text-surface-500" size={16} />
            </div>
          )}
        </div>
        {slugExists && !initialData && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
            <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" size={16} />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                Attenzione: Esiste già un episodio con questo slug!
              </p>
            </div>
          </div>
        )}
        {!slugExists && !isCheckingSlug && !initialData && formData.slug.length >= 3 && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Questo slug è disponibile
          </p>
        )}
      </div>

      {/* Synopsis */}
      <div>
        <label htmlFor="synopsis" className="label">
          Synopsis
        </label>
        <textarea
          id="synopsis"
          value={formData.synopsis}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, synopsis: e.target.value }))
          }
          className="input"
          rows={3}
          placeholder="Breve descrizione dell'episodio..."
        />
      </div>

      {/* Body */}
      <div>
        <RichTextEditor
          label="Contenuto"
          value={formData.body}
          onChange={(body) => setFormData((prev) => ({ ...prev, body }))}
          placeholder="Contenuto principale dell'episodio..."
        />
      </div>

      {/* Hero Image */}
      <div>
        <ImageUpload
          label="Immagine Hero"
          value={formData.heroImage}
          onChange={(heroImage) =>
            setFormData((prev) => ({ ...prev, heroImage }))
          }
        />
      </div>

      {/* Video Upload o URL */}
      <div>
        <label className="label">
          Video <span className="text-red-500">*</span>
        </label>
        
        {/* Upload Video su Cloudinary */}
        <div className="mb-4">
          <VideoUpload
            label="Carica Video su Cloudinary"
            value={uploadedVideo}
            onChange={(video) => {
              setUploadedVideo(video);
              // Quando il video viene caricato con successo, inserisci automaticamente l'URL nel campo videoUrl
              if (video && video.url) {
                setFormData((prev) => ({ ...prev, videoUrl: video.url }));
              }
            }}
            maxSizeMB={500}
          />
          <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
            Carica un video per ottenere automaticamente l'URL da Cloudinary
          </p>
        </div>

        {/* Oppure inserisci URL manualmente */}
        <div>
          <label htmlFor="videoUrl" className="label text-sm">
            URL Video (inserito automaticamente dopo upload o inserisci manualmente)
          </label>
          <input
            id="videoUrl"
            type="url"
            value={formData.videoUrl}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))
            }
            className="input font-mono text-sm"
            required
            placeholder="https://res.cloudinary.com/.../video.mp4"
          />
          {uploadedVideo && uploadedVideo.url === formData.videoUrl && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              ✓ URL impostato automaticamente da Cloudinary
            </p>
          )}
          {!uploadedVideo && (
            <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
              Puoi anche inserire manualmente l'URL del video (es. da Cloudinary o altro provider)
            </p>
          )}
        </div>
      </div>

      {/* Video Orientation */}
      <div>
        <Select
          label="Orientamento Video"
          value={formData.videoOrientation}
          onChange={(orientation) =>
            setFormData((prev) => ({ ...prev, videoOrientation: orientation as string | null }))
          }
          options={[
            { value: 'horizontal', label: 'Orizzontale (Horizontal)' },
            { value: 'vertical', label: 'Verticale (Vertical)' },
          ]}
          placeholder="Seleziona orientamento..."
        />
      </div>

      {/* Duration & Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="durationSeconds" className="label">
            Durata (secondi)
          </label>
          <input
            id="durationSeconds"
            type="number"
            min="1"
            value={formData.durationSeconds || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                durationSeconds: e.target.value ? parseInt(e.target.value) : null,
              }))
            }
            className="input"
            placeholder="es. 900"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2 mt-6">
            <input
              type="checkbox"
              checked={formData.isPremium}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isPremium: e.target.checked }))
              }
              className="rounded border-surface-300 dark:border-surface-600 text-primary-600 dark:text-primary-400 focus:ring-primary-500 dark:bg-surface-800"
            />
            <span className="label mb-0">Contenuto Premium</span>
          </label>
        </div>
      </div>

      {/* Show */}
      <div>
        <Select
          label="Show"
          value={formData.show}
          onChange={(show) =>
            setFormData((prev) => ({ ...prev, show: show as number | null }))
          }
          options={showOptions}
          placeholder="Seleziona uno show..."
        />
      </div>

      {/* Tags */}
      <div>
        <MultiSelect
          label="Tag"
          value={formData.tags}
          onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
          options={tagOptions}
          placeholder="Seleziona tag..."
        />
      </div>

      {/* Partners */}
      <div>
        <MultiSelect
          label="Partner"
          value={formData.partners}
          onChange={(partners) =>
            setFormData((prev) => ({ ...prev, partners }))
          }
          options={partnerOptions}
          placeholder="Seleziona partner..."
        />
      </div>

      {/* Publish Date */}
      <div>
        <label className="label">
          Data di pubblicazione
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="publishDate" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Data
            </label>
            <input
              id="publishDate"
              type="date"
              value={publishDate}
              onChange={(e) => {
                setPublishDate(e.target.value);
              }}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="publishTime" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Ora
            </label>
            <input
              id="publishTime"
              type="time"
              value={publishTime}
              onChange={(e) => {
                setPublishTime(e.target.value);
              }}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* SEO Section */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-6">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">SEO</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="seoMetaTitle" className="label">
              Meta Title
            </label>
            <input
              id="seoMetaTitle"
              type="text"
              value={formData.seo?.metaTitle || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  seo: {
                    ...prev.seo,
                    metaTitle: e.target.value,
                  },
                }))
              }
              className="input"
              maxLength={60}
              placeholder="Titolo per i motori di ricerca (max 60 caratteri)"
            />
          </div>

          <div>
            <label htmlFor="seoMetaDescription" className="label">
              Meta Description
            </label>
            <textarea
              id="seoMetaDescription"
              value={formData.seo?.metaDescription || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  seo: {
                    ...prev.seo,
                    metaDescription: e.target.value,
                  },
                }))
              }
              className="input"
              rows={3}
              maxLength={160}
              placeholder="Descrizione per i motori di ricerca (max 160 caratteri)"
            />
          </div>

          <div>
            <label htmlFor="seoKeywords" className="label">
              Keywords
            </label>
            <input
              id="seoKeywords"
              type="text"
              value={formData.seo?.keywords || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  seo: {
                    ...prev.seo,
                    keywords: e.target.value,
                  },
                }))
              }
              className="input"
              placeholder="parola1, parola2, parola3"
            />
          </div>

          <ImageUpload
            label="Meta Image (per social sharing)"
            value={formData.seo?.metaImage || null}
            onChange={(metaImage) =>
              setFormData((prev) => ({
                ...prev,
                seo: {
                  ...prev.seo,
                  metaImage,
                },
              }))
            }
          />

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.seo?.preventIndexing || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: {
                      ...prev.seo,
                      preventIndexing: e.target.checked,
                    },
                  }))
                }
                className="rounded border-surface-300 dark:border-surface-600 text-primary-600 dark:text-primary-400 focus:ring-primary-500 dark:bg-surface-800"
              />
              <span className="label mb-0">
                Impedisci indicizzazione (noindex)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Submit */}
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
