import { useParams, useNavigate, Link } from 'react-router-dom';
import ArticleForm from '../components/forms/ArticleForm';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  useArticleDetail,
  useUpdateArticle,
} from '../hooks/useArticles';

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

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data, isLoading } = useArticleDetail(id);

  const mutation = useUpdateArticle(id, data);

  const handleSubmit = async (formData: ArticleFormData) => {
    setError('');
    try {
      await mutation.mutateAsync(formData);
      navigate('/');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante il salvataggio. Riprova.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-surface-400 dark:text-surface-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
            Articolo non trovato
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
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
          className="inline-flex items-center space-x-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Modifica Articolo</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Modifica i dettagli dell'articolo
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
          <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5" size={20} />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
                      ? { data: (data.data.tags as number[]).map(tagId => ({ id: tagId })) }
                      : undefined,
                    partners: Array.isArray(data.data.partners) && data.data.partners.length > 0 && typeof data.data.partners[0] === 'object'
                      ? { data: (data.data.partners as unknown as Array<{ id: number }>).map(p => ({ id: p.id })) }
                      : Array.isArray(data.data.partners) && data.data.partners.length > 0 && typeof data.data.partners[0] === 'number'
                      ? { data: (data.data.partners as number[]).map(pId => ({ id: pId })) }
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
