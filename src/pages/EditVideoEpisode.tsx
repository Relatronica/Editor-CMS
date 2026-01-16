import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import VideoEpisodeForm from '../components/forms/VideoEpisodeForm';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { API_ENDPOINTS } from '../config/endpoints';
import { VIDEO_EPISODE_FIELDS } from '../config/videoEpisodeFields';

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

interface VideoEpisodeData {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  synopsis?: string;
  body?: string;
  heroImage?: any;
  videoUrl?: string;
  videoOrientation?: string | null;
  durationSeconds?: number | null;
  publishDate?: string;
  isPremium?: boolean;
  show?: { data?: { id: number } } | number | null;
  tags?: { data?: Array<{ id: number }> } | number[];
  partners?: { data?: Array<{ id: number }> } | number[];
  seo?: SEOData & {
    metaImage?: { data?: { id: number; attributes?: { url?: string } } } | { id: number; url: string } | null;
  } | null;
  attributes?: Partial<
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
}

interface VideoEpisodeResponse {
  data: VideoEpisodeData;
  meta?: any;
}

export default function EditVideoEpisodePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<VideoEpisodeResponse>({
    queryKey: ['video-episodes', id],
    queryFn: () => {
      console.log('🎬 Fetching video episode with endpoint:', API_ENDPOINTS.videoEpisodes, 'id:', id);
      return apiClient.findOne<VideoEpisodeData>(API_ENDPOINTS.videoEpisodes, id!, {
        populate: ['heroImage', 'show', 'tags', 'partners', 'seo.metaImage'],
      }) as Promise<VideoEpisodeResponse>;
    },
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async (formData: VideoEpisodeFormData) => {
      const currentEpisode = data?.data;
      const currentAttrs = currentEpisode?.attributes || currentEpisode;

      const updateData: Record<string, unknown> = {
        [VIDEO_EPISODE_FIELDS.title]: formData.title,
        [VIDEO_EPISODE_FIELDS.slug]: formData.slug,
        [VIDEO_EPISODE_FIELDS.videoUrl]: formData.videoUrl,
        // Invia isPremium esplicitamente come false se non è true
        [VIDEO_EPISODE_FIELDS.isPremium]: formData.isPremium === true,
      };

      // Aggiungi synopsis solo se presente
      if (formData.synopsis && formData.synopsis.trim()) {
        updateData[VIDEO_EPISODE_FIELDS.synopsis] = formData.synopsis;
      }

      // Aggiungi body solo se presente
      if (formData.body && formData.body.trim()) {
        updateData[VIDEO_EPISODE_FIELDS.body] = formData.body;
      }

      // PublishDate
      if (formData.publishDate) {
        updateData[VIDEO_EPISODE_FIELDS.publishDate] = formData.publishDate;
      }

      // HeroImage
      if (formData.heroImage) {
        updateData[VIDEO_EPISODE_FIELDS.heroImage] = formData.heroImage.id;
      } else {
        const currentHeroImage = currentAttrs?.heroImage;
        if (currentHeroImage) {
          const heroImageId = currentHeroImage?.data?.id ?? currentHeroImage?.id;
          if (heroImageId) {
            updateData[VIDEO_EPISODE_FIELDS.heroImage] = heroImageId;
          } else {
            updateData[VIDEO_EPISODE_FIELDS.heroImage] = null;
          }
        } else {
          updateData[VIDEO_EPISODE_FIELDS.heroImage] = null;
        }
      }

      // VideoOrientation
      if (formData.videoOrientation) {
        updateData[VIDEO_EPISODE_FIELDS.videoOrientation] = formData.videoOrientation;
      }

      // DurationSeconds
      if (formData.durationSeconds !== null && formData.durationSeconds !== undefined) {
        updateData[VIDEO_EPISODE_FIELDS.durationSeconds] = formData.durationSeconds;
      }

      // Show
      if (formData.show !== null && formData.show !== undefined) {
        updateData[VIDEO_EPISODE_FIELDS.show] = formData.show;
      } else {
        const currentShow = currentAttrs?.show;
        if (currentShow) {
          const showId = typeof currentShow === 'object' && 'data' in currentShow && currentShow.data
            ? (currentShow as { data: { id: number } }).data.id
            : typeof currentShow === 'number'
            ? currentShow
            : null;
          if (showId) {
            updateData[VIDEO_EPISODE_FIELDS.show] = showId;
          } else {
            updateData[VIDEO_EPISODE_FIELDS.show] = null;
          }
        } else {
          updateData[VIDEO_EPISODE_FIELDS.show] = null;
        }
      }

      // Tags
      if (formData.tags.length > 0) {
        updateData[VIDEO_EPISODE_FIELDS.tags] = formData.tags;
      } else {
        const currentTags = currentAttrs?.tags;
        if (currentTags) {
          const tagIds = Array.isArray(currentTags) && currentTags.length > 0
            ? currentTags.map((tag: any) => 
                typeof tag === 'object' && 'id' in tag ? tag.id : tag
              ).filter((id: any): id is number => typeof id === 'number')
            : [];
          updateData[VIDEO_EPISODE_FIELDS.tags] = tagIds.length > 0 ? tagIds : [];
        } else {
          updateData[VIDEO_EPISODE_FIELDS.tags] = [];
        }
      }

      // Partners
      if (formData.partners.length > 0) {
        updateData[VIDEO_EPISODE_FIELDS.partners] = formData.partners;
      } else {
        const currentPartners = currentAttrs?.partners;
        if (currentPartners) {
          const partnerIds = Array.isArray(currentPartners) && currentPartners.length > 0
            ? currentPartners.map((partner: any) => 
                typeof partner === 'object' && 'id' in partner ? partner.id : partner
              ).filter((id: any): id is number => typeof id === 'number')
            : [];
          updateData[VIDEO_EPISODE_FIELDS.partners] = partnerIds.length > 0 ? partnerIds : [];
        } else {
          updateData[VIDEO_EPISODE_FIELDS.partners] = [];
        }
      }

      // SEO
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
        updateData[VIDEO_EPISODE_FIELDS.seo] = seoData;
      } else {
        const currentSeo = currentAttrs?.seo;
        if (currentSeo && typeof currentSeo === 'object') {
          const seoData: Record<string, unknown> = {};
          if ('metaTitle' in currentSeo) seoData.metaTitle = currentSeo.metaTitle;
          if ('metaDescription' in currentSeo) seoData.metaDescription = currentSeo.metaDescription;
          if ('keywords' in currentSeo) seoData.keywords = currentSeo.keywords;
          if ('preventIndexing' in currentSeo) seoData.preventIndexing = currentSeo.preventIndexing;
          const currentMetaImage = (currentSeo as any)?.metaImage;
          if (currentMetaImage) {
            const metaImageId = currentMetaImage?.data?.id ?? currentMetaImage?.id;
            if (metaImageId) {
              seoData.metaImage = metaImageId;
            }
          }
          if (Object.keys(seoData).length > 0) {
            updateData[VIDEO_EPISODE_FIELDS.seo] = seoData;
          } else {
            updateData[VIDEO_EPISODE_FIELDS.seo] = null;
          }
        } else {
          updateData[VIDEO_EPISODE_FIELDS.seo] = null;
        }
      }

      console.log('🎬 Updating video episode with endpoint:', API_ENDPOINTS.videoEpisodes, 'id:', id);
      return apiClient.update(API_ENDPOINTS.videoEpisodes, id!, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-episodes'] });
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

  const handleSubmit = async (formData: VideoEpisodeFormData) => {
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
            Episodio video non trovato
          </h2>
          <p className="text-gray-600 mb-4">
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
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifica Episodio Video</h1>
        <p className="text-gray-600 mt-1">
          Modifica i dettagli dell'episodio video
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <p className="text-sm text-red-800">{error}</p>
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
                      ? { data: (data.data.tags as number[]).map(id => ({ id })) }
                      : undefined,
                    partners: Array.isArray(data.data.partners) && data.data.partners.length > 0 && typeof data.data.partners[0] === 'object'
                      ? { data: (data.data.partners as unknown as Array<{ id: number }>).map(p => ({ id: p.id })) }
                      : Array.isArray(data.data.partners) && data.data.partners.length > 0 && typeof data.data.partners[0] === 'number'
                      ? { data: (data.data.partners as number[]).map(id => ({ id })) }
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
