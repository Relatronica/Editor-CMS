import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import VideoEpisodeForm from '../components/forms/VideoEpisodeForm';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../config/endpoints';
import { VIDEO_EPISODE_FIELDS } from '../config/videoEpisodeFields';

interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  metaImage?: { id: number; url: string } | null;
  preventIndexing?: boolean;
}

export default function CreateVideoEpisodePage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (formData: {
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
    }) => {
      // Verifica se esiste già un episodio con lo stesso slug
      try {
        const existingEpisodes = await apiClient.find<{ id: number; attributes?: { slug?: string }; slug?: string }>(API_ENDPOINTS.videoEpisodes, {
          filters: {
            slug: { $eq: formData.slug },
          },
          pagination: { limit: 1 },
        });

        if (existingEpisodes?.data && existingEpisodes.data.length > 0) {
          const existingEpisode = existingEpisodes.data[0];
          const existingSlug = existingEpisode.attributes?.slug || existingEpisode.slug;
          if (existingSlug === formData.slug) {
            throw new Error(
              `Esiste già un episodio video con lo slug "${formData.slug}". ` +
              `Modifica lo slug o modifica l'episodio esistente (ID: ${existingEpisode.id}).`
            );
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Esiste già un episodio')) {
          throw error;
        }
        console.warn('Errore durante la verifica dello slug esistente:', error);
      }

      // Format data for Strapi API usando i nomi dei campi dalla configurazione
      const data: Record<string, unknown> = {
        [VIDEO_EPISODE_FIELDS.title]: formData.title,
        [VIDEO_EPISODE_FIELDS.slug]: formData.slug,
        [VIDEO_EPISODE_FIELDS.videoUrl]: formData.videoUrl,
        // Invia isPremium esplicitamente come false se non è true
        [VIDEO_EPISODE_FIELDS.isPremium]: formData.isPremium === true,
      };

      // Aggiungi synopsis solo se presente
      if (formData.synopsis && formData.synopsis.trim()) {
        data[VIDEO_EPISODE_FIELDS.synopsis] = formData.synopsis;
      }

      // Aggiungi body solo se presente
      if (formData.body && formData.body.trim()) {
        data[VIDEO_EPISODE_FIELDS.body] = formData.body;
      }

      // Aggiungi publishDate solo se presente
      if (formData.publishDate) {
        data[VIDEO_EPISODE_FIELDS.publishDate] = formData.publishDate;
      }

      // Aggiungi campi opzionali solo se presenti
      if (formData.heroImage) {
        data[VIDEO_EPISODE_FIELDS.heroImage] = formData.heroImage.id;
      }

      if (formData.videoOrientation) {
        data[VIDEO_EPISODE_FIELDS.videoOrientation] = formData.videoOrientation;
      }

      if (formData.durationSeconds !== null && formData.durationSeconds !== undefined) {
        data[VIDEO_EPISODE_FIELDS.durationSeconds] = formData.durationSeconds;
      }

      if (formData.show) {
        data[VIDEO_EPISODE_FIELDS.show] = formData.show;
      }

      if (formData.tags.length > 0) {
        data[VIDEO_EPISODE_FIELDS.tags] = formData.tags;
      }

      if (formData.partners.length > 0) {
        data[VIDEO_EPISODE_FIELDS.partners] = formData.partners;
      }

      // SEO component
      if (formData.seo) {
        const seoData: Record<string, unknown> = {};
        if (formData.seo.metaTitle) seoData.metaTitle = formData.seo.metaTitle;
        if (formData.seo.metaDescription) seoData.metaDescription = formData.seo.metaDescription;
        if (formData.seo.keywords) seoData.keywords = formData.seo.keywords;
        if (formData.seo.metaImage) {
          seoData.metaImage = formData.seo.metaImage.id;
        }
        if (formData.seo.preventIndexing !== undefined) {
          seoData.preventIndexing = formData.seo.preventIndexing;
        }
        if (Object.keys(seoData).length > 0) {
          data[VIDEO_EPISODE_FIELDS.seo] = seoData;
        }
      }

      console.log('🎬 Creating video episode with endpoint:', API_ENDPOINTS.videoEpisodes);
      console.log('📦 Data being sent:', JSON.stringify(data, null, 2));
      
      try {
        const result = await apiClient.create(API_ENDPOINTS.videoEpisodes, data);
        console.log('✅ Video episode created successfully:', result);
        return result;
      } catch (error: any) {
        console.error('❌ Error creating video episode:', error);
        if (error?.response?.data) {
          console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
          const errorData = error.response.data;
          if (errorData?.error?.message) {
            throw new Error(`Errore Strapi: ${errorData.error.message}`);
          } else if (errorData?.error?.details?.errors) {
            const errors = errorData.error.details.errors;
            const errorMessages = Object.entries(errors)
              .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
            throw new Error(`Errore di validazione: ${errorMessages}`);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      navigate('/');
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante la creazione. Riprova.'
      );
    },
  });

  const handleSubmit = async (formData: {
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
  }) => {
    setError('');
    await mutation.mutateAsync(formData);
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
        <h1 className="text-2xl font-bold text-gray-900">Nuovo Episodio Video</h1>
        <p className="text-gray-600 mt-1">
          Crea un nuovo episodio video
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
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
