import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import ArticleForm from '../components/forms/ArticleForm';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

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

// Support both Strapi v4 (with attributes) and v5 (direct fields)
interface ArticleData {
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
  seo?: SEOData & {
    metaImage?: { data?: { id: number; attributes?: { url?: string } } } | { id: number; url: string } | null;
  } | null;
  attributes?: Partial<
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
}

interface ArticleResponse {
  data: ArticleData;
  meta?: any;
}

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<ArticleResponse>({
    queryKey: ['articles', id],
    queryFn: () =>
      apiClient.findOne<ArticleData>('articles', id!, {
        populate: ['heroImage', 'author', 'tags', 'partners', 'seo.metaImage'],
      }) as Promise<ArticleResponse>,
    enabled: !!id,
  });

  const mutation = useMutation({
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
      // IMPORTANTE: Preservare i dati esistenti per evitare cancellazioni accidentali
      // Durante un UPDATE, Strapi sostituisce completamente l'entità se usiamo PUT
      // Dobbiamo assicurarci di includere tutti i campi necessari
      const currentArticle = data?.data;
      const currentAttrs = currentArticle?.attributes || currentArticle;

      // Format data for Strapi API
      const data: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || null,
        body: formData.body,
        publishDate: formData.publishDate || null,
        isPremium: formData.isPremium,
        readingTime: formData.readingTime || null,
      };

      // Preserva heroImage esistente se non specificato nel form
      if (formData.heroImage) {
        data.heroImage = formData.heroImage.id;
      } else {
        // Se il form ha null esplicitamente, rimuovi l'immagine
        // Altrimenti preserva quella esistente
        const currentHeroImage = currentAttrs?.heroImage;
        if (currentHeroImage) {
          // Preserva l'immagine esistente se non è stata rimossa esplicitamente
          const heroImageId = currentHeroImage?.data?.id ?? currentHeroImage?.id;
          if (heroImageId) {
            data.heroImage = heroImageId;
          } else {
            data.heroImage = null;
          }
        } else {
          data.heroImage = null;
        }
      }

      // Preserva author esistente se non specificato
      if (formData.author !== null && formData.author !== undefined) {
        data.author = formData.author;
      } else {
        const currentAuthor = currentAttrs?.author;
        if (currentAuthor) {
          const authorId = typeof currentAuthor === 'object' && 'data' in currentAuthor && currentAuthor.data
            ? (currentAuthor as { data: { id: number } }).data.id
            : typeof currentAuthor === 'number'
            ? currentAuthor
            : null;
          if (authorId) {
            data.author = authorId;
          } else {
            data.author = null;
          }
        } else {
          data.author = null;
        }
      }

      // Preserva tags e partners esistenti se il form è vuoto (potrebbe essere una perdita accidentale)
      if (formData.tags.length > 0) {
        data.tags = formData.tags;
      } else {
        // Se il form è vuoto ma ci sono tag esistenti, preservali per sicurezza
        const currentTags = currentAttrs?.tags;
        if (currentTags) {
          const tagIds = Array.isArray(currentTags) && currentTags.length > 0
            ? currentTags.map((tag: any) => 
                typeof tag === 'object' && 'id' in tag ? tag.id : tag
              ).filter((id: any): id is number => typeof id === 'number')
            : [];
          data.tags = tagIds.length > 0 ? tagIds : [];
        } else {
          data.tags = [];
        }
      }

      if (formData.partners.length > 0) {
        data.partners = formData.partners;
      } else {
        // Se il form è vuoto ma ci sono partner esistenti, preservali per sicurezza
        const currentPartners = currentAttrs?.partners;
        if (currentPartners) {
          const partnerIds = Array.isArray(currentPartners) && currentPartners.length > 0
            ? currentPartners.map((partner: any) => 
                typeof partner === 'object' && 'id' in partner ? partner.id : partner
              ).filter((id: any): id is number => typeof id === 'number')
            : [];
          data.partners = partnerIds.length > 0 ? partnerIds : [];
        } else {
          data.partners = [];
        }
      }

      // Preserva SEO esistente se non specificato
      if (formData.seo) {
        const seoData: Record<string, unknown> = {};
        if (formData.seo.metaTitle) seoData.metaTitle = formData.seo.metaTitle;
        if (formData.seo.metaDescription) seoData.metaDescription = formData.seo.metaDescription;
        if (formData.seo.keywords) seoData.keywords = formData.seo.keywords;
        if (formData.seo.metaImage) {
          seoData.metaImage = formData.seo.metaImage.id;
        } else {
          seoData.metaImage = null;
        }
        if (formData.seo.preventIndexing !== undefined) {
          seoData.preventIndexing = formData.seo.preventIndexing;
        }
        data.seo = seoData;
      } else {
        // Se SEO non è nel form, preserva quello esistente
        const currentSeo = currentAttrs?.seo;
        if (currentSeo && typeof currentSeo === 'object') {
          const seoData: Record<string, unknown> = {};
          if ('metaTitle' in currentSeo) seoData.metaTitle = currentSeo.metaTitle;
          if ('metaDescription' in currentSeo) seoData.metaDescription = currentSeo.metaDescription;
          if ('keywords' in currentSeo) seoData.keywords = currentSeo.keywords;
          if ('preventIndexing' in currentSeo) seoData.preventIndexing = currentSeo.preventIndexing;
          // Preserva metaImage se esiste
          const currentMetaImage = (currentSeo as any)?.metaImage;
          if (currentMetaImage) {
            const metaImageId = currentMetaImage?.data?.id ?? currentMetaImage?.id;
            if (metaImageId) {
              seoData.metaImage = metaImageId;
            }
          }
          if (Object.keys(seoData).length > 0) {
            data.seo = seoData;
          } else {
            data.seo = null;
          }
        } else {
          data.seo = null;
        }
      }

      return apiClient.update('articles', id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      navigate('/');
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante il salvataggio. Riprova.'
      );
    },
  });

  const handleSubmit = async (formData: ArticleFormData) => {
    setError('');
    await mutation.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Articolo non trovato
          </h2>
          <p className="text-gray-600 mb-4">
            L'articolo che stai cercando non esiste o è stato eliminato.
          </p>
          <Link to="/" className="btn-primary inline-block">
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Modifica Articolo</h1>
        <p className="text-gray-600 mt-1">
          Modifica i dettagli dell'articolo
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="card">
        <ArticleForm
          initialData={
            data.data.attributes
              ? (data.data as { id: number; attributes: Partial<ArticleFormData & { author?: { data?: { id: number } }; tags?: { data?: Array<{ id: number }> }; partners?: { data?: Array<{ id: number }> }; heroImage?: { data?: { id: number; attributes?: { url?: string } } }; seo?: SEOData & { metaImage?: { data?: { id: number; attributes?: { url?: string } } } }; }> })
              : {
                  id: data.data.id,
                  attributes: {
                    title: data.data.title,
                    slug: data.data.slug,
                    excerpt: data.data.excerpt,
                    body: data.data.body,
                    heroImage: data.data.heroImage,
                    publishDate: data.data.publishDate,
                    isPremium: data.data.isPremium,
                    readingTime: data.data.readingTime,
                    author: typeof data.data.author === 'object' && data.data.author && 'data' in data.data.author && data.data.author.data
                      ? { data: { id: (data.data.author as { data: { id: number } }).data.id } }
                      : typeof data.data.author === 'number'
                      ? { data: { id: data.data.author } }
                      : undefined,
                    tags: Array.isArray(data.data.tags) && data.data.tags.length > 0 && typeof data.data.tags[0] === 'object'
                      ? { data: (data.data.tags as unknown as Array<{ id: number }>).map(t => ({ id: t.id })) }
                      : Array.isArray(data.data.tags) && data.data.tags.length > 0 && typeof data.data.tags[0] === 'number'
                      ? { data: (data.data.tags as number[]).map(id => ({ id })) }
                      : undefined,
                    partners: Array.isArray(data.data.partners) && data.data.partners.length > 0 && typeof data.data.partners[0] === 'object'
                      ? { data: (data.data.partners as unknown as Array<{ id: number }>).map(p => ({ id: p.id })) }
                      : Array.isArray(data.data.partners) && data.data.partners.length > 0 && typeof data.data.partners[0] === 'number'
                      ? { data: (data.data.partners as number[]).map(id => ({ id })) }
                      : undefined,
                    seo: data.data.seo,
                  },
                } as { id: number; attributes: Partial<ArticleFormData & { author?: { data?: { id: number } }; tags?: { data?: Array<{ id: number }> }; partners?: { data?: Array<{ id: number }> }; heroImage?: { data?: { id: number; attributes?: { url?: string } } }; seo?: SEOData & { metaImage?: { data?: { id: number; attributes?: { url?: string } } } }; }> }
          }
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
