import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import ImageUpload from '../ui/ImageUpload';
import Select from '../ui/Select';
import MultiSelect from '../ui/MultiSelect';
import RichTextEditor from '../editors/RichTextEditor';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTutorial } from '../../hooks/useTutorial';
import TutorialTour from '../TutorialTour';
import { Step } from 'react-joyride';

interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  metaImage?: { id: number; url: string } | null;
  preventIndexing?: boolean;
}

interface ArticleFormData {
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
  seo: SEOData | null;
}

interface ArticleFormProps {
  initialData?: {
    id: number;
    attributes: Partial<
      ArticleFormData & {
        author?: { data?: { id: number } };
        tags?: { data?: Array<{ id: number }> };
        partners?: { data?: Array<{ id: number }> };
        heroImage?: { data?: { id: number; attributes?: { url?: string } } };
        seo?: SEOData & {
          metaImage?: { data?: { id: number; attributes?: { url?: string } } };
        };
      }
    >;
  };
  onSubmit: (data: ArticleFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ArticleForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: ArticleFormProps) {
  const { isRunning, completeTutorial, stopTutorial } = useTutorial('article-form');
  
  // Stati separati per data e ora
  const [publishDate, setPublishDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [publishTime, setPublishTime] = useState<string>(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:mm
  });

  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    heroImage: null,
    publishDate: new Date().toISOString().slice(0, 16),
    isPremium: false,
    readingTime: null,
    author: null,
    tags: [],
    partners: [],
    seo: null,
  });

  // Stato per verificare se lo slug esiste già
  const [slugExists, setSlugExists] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const slugCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const articleFormSteps: Step[] = [
    {
      target: '[data-tour="article-title"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Titolo dell'articolo</h3>
          <p className="text-sm text-gray-600 mb-2">
            Il titolo è obbligatorio e viene visualizzato come intestazione principale dell'articolo.
            <strong className="block mt-1">💡 Suggerimento:</strong> Quando inserisci il titolo, lo slug viene generato automaticamente in base al titolo.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="article-slug"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Slug (URL)</h3>
          <p className="text-sm text-gray-600 mb-2">
            Lo slug è l'URL dell'articolo (es: "mio-articolo"). Viene generato automaticamente dal titolo,
            ma puoi modificarlo manualmente se necessario.
          </p>
          <p className="text-sm text-gray-500 italic">
            Importante: usa solo lettere minuscole, numeri e trattini.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="article-excerpt"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Estratto</h3>
          <p className="text-sm text-gray-600 mb-2">
            L'estratto è una breve descrizione dell'articolo (max 300 caratteri).
            Viene utilizzato come anteprima nelle liste di articoli e nelle meta description SEO.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="article-body"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Editor Rich Text</h3>
          <p className="text-sm text-gray-600 mb-2">
            Questo è l'editor per il contenuto principale dell'articolo. La toolbar ti permette di:
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside mb-2 space-y-1">
            <li><strong>Grassetto</strong> e <em>Corsivo</em></li>
            <li>Liste puntate e numerate</li>
            <li>Collegamenti (link)</li>
            <li>Intestazioni (H2, H3)</li>
          </ul>
          <p className="text-sm text-gray-500 italic">
            Il contenuto è obbligatorio e supporta Markdown.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="article-hero-image"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Immagine Hero</h3>
          <p className="text-sm text-gray-600 mb-2">
            L'immagine hero è l'immagine principale dell'articolo, visualizzata in evidenza.
            Puoi caricare un'immagine dal tuo computer o selezionarne una già presente nel sistema.
          </p>
          <p className="text-sm text-gray-500 italic">
            Consiglio: usa immagini di alta qualità in formato ottimizzato (WebP o JPG).
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="article-author"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Autore</h3>
          <p className="text-sm text-gray-600 mb-2">
            Seleziona l'autore dell'articolo dalla lista. Gli autori devono essere creati prima
            di poter essere assegnati agli articoli.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="article-tags"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Tag</h3>
          <p className="text-sm text-gray-600 mb-2">
            I tag aiutano a categorizzare e organizzare gli articoli. Puoi selezionare più tag
            per classificare il contenuto per argomento, tema o categoria.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="article-metadata"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Metadata e Pubblicazione</h3>
          <p className="text-sm text-gray-600 mb-2">
            Qui puoi impostare:
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside mb-2 space-y-1">
            <li><strong>Data di pubblicazione:</strong> quando l'articolo verrà pubblicato</li>
            <li><strong>Contenuto Premium:</strong> marca l'articolo come contenuto premium (a pagamento)</li>
            <li><strong>Tempo di lettura:</strong> stima in minuti (aiuta gli utenti)</li>
          </ul>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="article-seo"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Ottimizzazione SEO</h3>
          <p className="text-sm text-gray-600 mb-2">
            La sezione SEO è fondamentale per la visibilità sui motori di ricerca:
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside mb-2 space-y-1">
            <li><strong>Meta Title:</strong> titolo per i motori (max 60 caratteri)</li>
            <li><strong>Meta Description:</strong> descrizione per i risultati di ricerca (max 160 caratteri)</li>
            <li><strong>Keywords:</strong> parole chiave separate da virgole</li>
            <li><strong>Meta Image:</strong> immagine per condivisioni social (Open Graph)</li>
            <li><strong>Prevent Indexing:</strong> impedisci ai motori di indicizzare questa pagina</li>
          </ul>
          <p className="text-sm text-gray-500 italic mt-2">
            💡 Suggerimento: se lasci vuoto, il sistema userà titolo ed estratto come default.
          </p>
        </div>
      ),
      placement: 'top',
    },
  ];

  // Load authors, tags, partners
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
        // Solo aggiorna se è diverso per evitare loop infiniti
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
      const getImageUrl = (img: unknown) => {
        if (
          typeof img === 'object' &&
          img !== null &&
          'data' in img &&
          img.data &&
          typeof img.data === 'object' &&
          'attributes' in img.data &&
          img.data.attributes &&
          typeof img.data.attributes === 'object' &&
          'url' in img.data.attributes
        ) {
          const url = img.data.attributes.url;
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
        excerpt: attrs.excerpt || '',
        body: attrs.body || '',
        heroImage:
          attrs.heroImage?.data?.id && getImageUrl(attrs.heroImage)
            ? { id: attrs.heroImage.data.id, url: getImageUrl(attrs.heroImage) }
            : null,
        publishDate: attrs.publishDate
          ? new Date(attrs.publishDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        isPremium: attrs.isPremium || false,
        readingTime: attrs.readingTime || null,
        author: attrs.author?.data?.id || null,
        tags: attrs.tags?.data?.map((t) => t.id) || [],
        partners: attrs.partners?.data?.map((p) => p.id) || [],
        seo: attrs.seo || null,
      });
    }
  }, [initialData]);

  // Verifica se lo slug esiste già (solo per nuovi articoli, non in modifica)
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
        const existingArticles = await apiClient.find<{ 
          id: number; 
          attributes?: { slug?: string }; 
          slug?: string 
        }>('articles', {
          filters: {
            slug: { $eq: formData.slug },
          },
          pagination: { limit: 1 },
        });

        if (existingArticles?.data && existingArticles.data.length > 0) {
          const existingArticle = existingArticles.data[0];
          const existingSlug = existingArticle.attributes?.slug || existingArticle.slug;
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
    <>
      <TutorialTour
        steps={articleFormSteps}
        isRunning={isRunning}
        onComplete={completeTutorial}
        onSkip={stopTutorial}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div data-tour="article-title">
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
            placeholder="Titolo dell'articolo"
          />
        </div>

      {/* Slug */}
      <div data-tour="article-slug">
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
            placeholder="slug-dell-articolo"
          />
          {isCheckingSlug && !initialData && formData.slug.length >= 3 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-gray-400" size={16} />
            </div>
          )}
        </div>
        {slugExists && !initialData && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">
                Attenzione: Esiste già un articolo con questo slug!
              </p>
              <p className="text-xs text-red-600 mt-1">
                Modifica lo slug per evitare conflitti. Gli articoli con lo stesso slug potrebbero essere sovrascritti durante le importazioni.
              </p>
            </div>
          </div>
        )}
        {!slugExists && !isCheckingSlug && !initialData && formData.slug.length >= 3 && (
          <p className="mt-1 text-xs text-green-600">
            ✓ Questo slug è disponibile
          </p>
        )}
      </div>

      {/* Excerpt */}
      <div data-tour="article-excerpt">
        <label htmlFor="excerpt" className="label">
          Estratto
        </label>
        <textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
          }
          className="input"
          rows={3}
          placeholder="Breve descrizione dell'articolo..."
          maxLength={300}
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.excerpt.length}/300 caratteri
        </p>
      </div>

      {/* Body */}
      <div data-tour="article-body">
        <RichTextEditor
          label="Contenuto"
          value={formData.body}
          onChange={(body) => setFormData((prev) => ({ ...prev, body }))}
          placeholder="Inizia a scrivere il contenuto dell'articolo..."
        />
      </div>

      {/* Hero Image */}
      <div data-tour="article-hero-image">
        <ImageUpload
          label="Immagine Hero"
          value={formData.heroImage}
          onChange={(heroImage) =>
            setFormData((prev) => ({ ...prev, heroImage }))
          }
        />
      </div>

      {/* Author */}
      <div data-tour="article-author">
        <Select
          label="Autore"
          value={formData.author}
          onChange={(author) =>
            setFormData((prev) => ({ ...prev, author: author as number }))
          }
          options={authorOptions}
          placeholder="Seleziona un autore..."
        />
      </div>

      {/* Tags */}
      <div data-tour="article-tags">
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
            <label htmlFor="publishDate" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="publishTime" className="block text-sm font-medium text-gray-700 mb-1">
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

      {/* Premium & Reading Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="article-metadata">
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isPremium}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isPremium: e.target.checked }))
              }
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="label mb-0">Contenuto Premium</span>
          </label>
        </div>

        <div>
          <label htmlFor="readingTime" className="label">
            Tempo di lettura (minuti)
          </label>
          <input
            id="readingTime"
            type="number"
            min="1"
            value={formData.readingTime || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                readingTime: e.target.value ? parseInt(e.target.value) : null,
              }))
            }
            className="input"
            placeholder="es. 5"
          />
        </div>
      </div>

      {/* SEO Section */}
      <div className="border-t border-gray-200 pt-6" data-tour="article-seo">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO</h3>

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
            <p className="mt-1 text-xs text-gray-500">
              {(formData.seo?.metaTitle || '').length}/60 caratteri
            </p>
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
            <p className="mt-1 text-xs text-gray-500">
              {(formData.seo?.metaDescription || '').length}/160 caratteri
            </p>
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
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="label mb-0">
                Impedisci indicizzazione (noindex)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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
    </>
  );
}
