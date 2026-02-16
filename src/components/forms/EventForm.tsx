import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import { queryKeys } from '../../config/queryKeys';
import ImageUpload from '../ui/ImageUpload';
import MultiSelect from '../ui/MultiSelect';
import RichTextEditor from '../editors/RichTextEditor';
import { Loader2, Globe, MapPin } from 'lucide-react';

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

interface EventFormProps {
  initialData?: {
    id: number;
    attributes: Partial<
      EventFormData & {
        tags?: { data?: Array<{ id: number }> } | number[];
        heroImage?:
          | { data?: { id: number; attributes?: { url?: string } } }
          | { id: number; url: string }
          | null;
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
      }
    >;
  };
  onSubmit: (data: EventFormData) => Promise<void>;
  isSubmitting?: boolean;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function EventForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: EventFormProps) {
  const attrs = initialData?.attributes;

  const [startDate, setStartDate] = useState<string>(() => {
    if (attrs?.startDate) {
      return new Date(attrs.startDate).toISOString().slice(0, 10);
    }
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  const [startTime, setStartTime] = useState<string>(() => {
    if (attrs?.startDate) {
      const d = new Date(attrs.startDate);
      return d.toTimeString().slice(0, 5);
    }
    return '09:00';
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (attrs?.endDate) {
      return new Date(attrs.endDate).toISOString().slice(0, 10);
    }
    return '';
  });

  const [endTime, setEndTime] = useState<string>(() => {
    if (attrs?.endDate) {
      const d = new Date(attrs.endDate);
      return d.toTimeString().slice(0, 5);
    }
    return '18:00';
  });

  const [showSeo, setShowSeo] = useState(false);

  const [formData, setFormData] = useState<EventFormData>({
    title: attrs?.title || '',
    slug: attrs?.slug || '',
    description: attrs?.description || '',
    body: attrs?.body || '',
    heroImage: null,
    startDate: '',
    endDate: '',
    location: attrs?.location || '',
    address: attrs?.address || '',
    isOnline: attrs?.isOnline || false,
    onlineUrl: attrs?.onlineUrl || '',
    organizer: attrs?.organizer || '',
    externalUrl: attrs?.externalUrl || '',
    isFeatured: attrs?.isFeatured || false,
    tags: [],
    seo: attrs?.seo
      ? {
          metaTitle: attrs.seo.metaTitle || '',
          metaDescription: attrs.seo.metaDescription || '',
          keywords: attrs.seo.keywords || '',
          preventIndexing: attrs.seo.preventIndexing || false,
          metaImage: null,
        }
      : null,
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData);

  // Initialize heroImage from initialData
  useEffect(() => {
    if (attrs?.heroImage) {
      const img = attrs.heroImage;
      if (img && typeof img === 'object') {
        if ('data' in img && img.data) {
          const imgData = img.data as {
            id: number;
            attributes?: { url?: string };
          };
          const url = imgData.attributes?.url || '';
          const STRAPI_URL =
            import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
          const fullUrl = url.startsWith('http')
            ? url
            : `${STRAPI_URL}${url}`;
          setFormData((prev) => ({
            ...prev,
            heroImage: { id: imgData.id, url: fullUrl },
          }));
        } else if ('id' in img && 'url' in img) {
          const typedImg = img as { id: number; url: string };
          const STRAPI_URL =
            import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
          const fullUrl = typedImg.url.startsWith('http')
            ? typedImg.url
            : `${STRAPI_URL}${typedImg.url}`;
          setFormData((prev) => ({
            ...prev,
            heroImage: { id: typedImg.id, url: fullUrl },
          }));
        }
      }
    }
  }, [attrs?.heroImage]);

  // Initialize tags from initialData
  useEffect(() => {
    if (attrs?.tags) {
      const tags = attrs.tags as any;
      if (Array.isArray(tags)) {
        const tagIds = tags
          .map((t: any) =>
            typeof t === 'object' && 'id' in t ? t.id : t
          )
          .filter((id: any): id is number => typeof id === 'number');
        setFormData((prev) => ({ ...prev, tags: tagIds }));
      } else if (
        typeof tags === 'object' &&
        'data' in tags &&
        Array.isArray(tags.data)
      ) {
        const tagIds = tags.data.map((t: { id: number }) => t.id);
        setFormData((prev) => ({ ...prev, tags: tagIds }));
      }
    }
  }, [attrs?.tags]);

  // Initialize SEO metaImage
  useEffect(() => {
    if (attrs?.seo?.metaImage) {
      const img = attrs.seo.metaImage as any;
      if (img && typeof img === 'object') {
        if ('data' in img && img.data) {
          const imgData = img.data as {
            id: number;
            attributes?: { url?: string };
          };
          const url = imgData.attributes?.url || '';
          const STRAPI_URL =
            import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
          const fullUrl = url.startsWith('http')
            ? url
            : `${STRAPI_URL}${url}`;
          setFormData((prev) => ({
            ...prev,
            seo: {
              ...(prev.seo || {}),
              metaImage: { id: imgData.id, url: fullUrl },
            },
          }));
          setShowSeo(true);
        } else if ('id' in img && 'url' in img) {
          setFormData((prev) => ({
            ...prev,
            seo: {
              ...(prev.seo || {}),
              metaImage: img as { id: number; url: string },
            },
          }));
          setShowSeo(true);
        }
      }
    }
    if (
      attrs?.seo?.metaTitle ||
      attrs?.seo?.metaDescription ||
      attrs?.seo?.keywords
    ) {
      setShowSeo(true);
    }
  }, [attrs?.seo]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && formData.title) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [formData.title, slugManuallyEdited]);

  // Fetch tags
  const { data: tagsData } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: () =>
      apiClient.find<{
        id: number;
        attributes?: { name?: string };
        name?: string;
      }>(API_ENDPOINTS.tags, {
        pagination: { limit: 100 },
        sort: ['name:asc'],
      }),
  });

  const tagOptions = useMemo(() => {
    if (!tagsData?.data) return [];
    return tagsData.data.map((tag) => ({
      id: tag.id,
      label: tag.attributes?.name || tag.name || `Tag ${tag.id}`,
    }));
  }, [tagsData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startISO = `${startDate}T${startTime}:00.000Z`;
    const endISO =
      endDate && endTime ? `${endDate}T${endTime}:00.000Z` : '';
    onSubmit({
      ...formData,
      startDate: startISO,
      endDate: endISO,
    });
  };

  const updateField = <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="label">
          Titolo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="input"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Es: Workshop di Design Thinking"
          required
        />
      </div>

      {/* Slug */}
      <div>
        <label className="label">Slug</label>
        <input
          type="text"
          className="input"
          value={formData.slug}
          onChange={(e) => {
            setSlugManuallyEdited(true);
            updateField('slug', e.target.value);
          }}
          placeholder="workshop-design-thinking"
        />
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
          Generato automaticamente dal titolo. Puoi modificarlo manualmente.
        </p>
      </div>

      {/* Hero Image */}
      <ImageUpload
        value={formData.heroImage}
        onChange={(value) => updateField('heroImage', value)}
        label="Immagine di copertina"
      />

      {/* Description (plain text, required) */}
      <div>
        <label className="label">
          Descrizione <span className="text-red-500">*</span>
        </label>
        <textarea
          className="input"
          rows={3}
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Breve descrizione dell'evento..."
          required
        />
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
          Testo breve che appare nelle anteprime e nei risultati di ricerca.
        </p>
      </div>

      {/* Body (Rich Text, optional) */}
      <RichTextEditor
        value={formData.body}
        onChange={(value) => updateField('body', value)}
        label="Contenuto dettagliato"
      />

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date + Time */}
        <div>
          <label className="label">
            Data inizio <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              className="input flex-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <input
              type="time"
              className="input w-32"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* End Date + Time (optional) */}
        <div>
          <label className="label">Data fine</label>
          <div className="flex gap-2">
            <input
              type="date"
              className="input flex-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <input
              type="time"
              className="input w-32"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
            Opzionale per eventi di un solo giorno.
          </p>
        </div>
      </div>

      {/* Location section */}
      <div className="space-y-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700">
        <h3 className="font-medium text-surface-900 dark:text-white flex items-center gap-2">
          <MapPin size={18} />
          Luogo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Luogo</label>
            <input
              type="text"
              className="input"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Es: Milano, Roma, ecc."
            />
          </div>
          <div>
            <label className="label">Organizzatore</label>
            <input
              type="text"
              className="input"
              value={formData.organizer}
              onChange={(e) => updateField('organizer', e.target.value)}
              placeholder="Es: Capibara Media"
            />
          </div>
        </div>

        <div>
          <label className="label">Indirizzo completo</label>
          <textarea
            className="input"
            rows={2}
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Es: Via Roma 123, 20121 Milano (MI)"
          />
        </div>

        {/* isOnline toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.isOnline}
              onChange={(e) => updateField('isOnline', e.target.checked)}
            />
            <div className="w-9 h-5 bg-surface-200 dark:bg-surface-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 dark:border-surface-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
          <span className="text-sm text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
            <Globe size={14} />
            Evento online
          </span>
        </div>

        {formData.isOnline && (
          <div>
            <label className="label">Link evento online</label>
            <input
              type="url"
              className="input"
              value={formData.onlineUrl}
              onChange={(e) => updateField('onlineUrl', e.target.value)}
              placeholder="https://zoom.us/j/... o https://meet.google.com/..."
            />
          </div>
        )}
      </div>

      {/* External URL */}
      <div>
        <label className="label">URL esterno (iscrizione / info)</label>
        <input
          type="url"
          className="input"
          value={formData.externalUrl}
          onChange={(e) => updateField('externalUrl', e.target.value)}
          placeholder="https://eventbrite.com/..."
        />
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
          Link per iscrizione o maggiori informazioni sull'evento.
        </p>
      </div>

      {/* isFeatured */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={formData.isFeatured}
            onChange={(e) => updateField('isFeatured', e.target.checked)}
          />
          <div className="w-9 h-5 bg-surface-200 dark:bg-surface-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 dark:border-surface-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
        <span className="text-sm text-surface-700 dark:text-surface-300">
          Evento in evidenza
        </span>
      </div>

      {/* Tags */}
      {tagOptions.length > 0 && (
        <MultiSelect
          value={formData.tags}
          onChange={(value) => updateField('tags', value)}
          options={tagOptions}
          label="Tag"
          placeholder="Seleziona tag..."
        />
      )}

      {/* SEO Section */}
      <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
        <button
          type="button"
          onClick={() => {
            setShowSeo(!showSeo);
            if (!showSeo && !formData.seo) {
              updateField('seo', {
                metaTitle: '',
                metaDescription: '',
                keywords: '',
                preventIndexing: false,
                metaImage: null,
              });
            }
          }}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {showSeo ? 'Nascondi SEO' : 'Mostra impostazioni SEO'}
        </button>

        {showSeo && (
          <div className="mt-4 space-y-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700">
            <div>
              <label className="label">Meta Title</label>
              <input
                type="text"
                className="input"
                value={formData.seo?.metaTitle || ''}
                onChange={(e) =>
                  updateField('seo', {
                    ...(formData.seo || {}),
                    metaTitle: e.target.value,
                  })
                }
                placeholder="Titolo per i motori di ricerca"
              />
            </div>
            <div>
              <label className="label">Meta Description</label>
              <textarea
                className="input"
                rows={2}
                value={formData.seo?.metaDescription || ''}
                onChange={(e) =>
                  updateField('seo', {
                    ...(formData.seo || {}),
                    metaDescription: e.target.value,
                  })
                }
                placeholder="Descrizione per i motori di ricerca"
              />
            </div>
            <div>
              <label className="label">Keywords</label>
              <input
                type="text"
                className="input"
                value={formData.seo?.keywords || ''}
                onChange={(e) =>
                  updateField('seo', {
                    ...(formData.seo || {}),
                    keywords: e.target.value,
                  })
                }
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
            <ImageUpload
              value={formData.seo?.metaImage || null}
              onChange={(value) =>
                updateField('seo', {
                  ...(formData.seo || {}),
                  metaImage: value,
                })
              }
              label="Meta Image"
            />
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.seo?.preventIndexing || false}
                  onChange={(e) =>
                    updateField('seo', {
                      ...(formData.seo || {}),
                      preventIndexing: e.target.checked,
                    })
                  }
                />
                <div className="w-9 h-5 bg-surface-200 dark:bg-surface-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 dark:border-surface-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
              <span className="text-sm text-surface-700 dark:text-surface-300">
                Impedisci indicizzazione (noindex)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
        <button
          type="submit"
          disabled={isSubmitting || !formData.title || !formData.description}
          className="btn-primary inline-flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="animate-spin" size={16} />}
          {initialData ? 'Salva modifiche' : 'Crea evento'}
        </button>
      </div>
    </form>
  );
}
