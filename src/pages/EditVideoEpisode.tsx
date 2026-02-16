import { useParams, useNavigate, Link } from 'react-router-dom';
import VideoEpisodeForm from '../components/forms/VideoEpisodeForm';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  useVideoEpisodeDetail,
  useUpdateVideoEpisode,
  type VideoEpisodeFormData,
  type SEOData,
} from '../hooks/useVideoEpisodes';

export default function EditVideoEpisodePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data, isLoading } = useVideoEpisodeDetail(id);

  const mutation = useUpdateVideoEpisode(id, data);

  const handleSubmit = async (formData: VideoEpisodeFormData) => {
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
            Episodio video non trovato
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            L'episodio video che stai cercando non esiste o è stato eliminato.
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
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Modifica Episodio Video</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Modifica i dettagli dell'episodio video
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
          <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5" size={20} />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="card">
        <VideoEpisodeForm
          initialData={
            data.data.attributes
              ? (data.data as { id: number; attributes: Partial<VideoEpisodeFormData & { show?: { data?: { id: number } }; tags?: { data?: Array<{ id: number }> }; partners?: { data?: Array<{ id: number }> }; heroImage?: { data?: { id: number; attributes?: { url?: string } } }; seo?: SEOData & { metaImage?: { data?: { id: number; attributes?: { url?: string } } }; }; }> })
              : {
                  id: data.data.id,
                  attributes: {
                    title: data.data.title,
                    slug: data.data.slug,
                    synopsis: data.data.synopsis,
                    body: data.data.body,
                    videoUrl: data.data.videoUrl,
                    videoOrientation: data.data.videoOrientation,
                    durationSeconds: data.data.durationSeconds,
                    heroImage: data.data.heroImage,
                    publishDate: data.data.publishDate,
                    isPremium: data.data.isPremium,
                    show: typeof data.data.show === 'object' && data.data.show && 'data' in data.data.show && data.data.show.data
                      ? { data: { id: (data.data.show as { data: { id: number } }).data.id } }
                      : typeof data.data.show === 'number'
                      ? { data: { id: data.data.show } }
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
                } as { id: number; attributes: Partial<VideoEpisodeFormData & { show?: { data?: { id: number } }; tags?: { data?: Array<{ id: number }> }; partners?: { data?: Array<{ id: number }> }; heroImage?: { data?: { id: number; attributes?: { url?: string } } }; seo?: SEOData & { metaImage?: { data?: { id: number; attributes?: { url?: string } } }; }; }> }
          }
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
