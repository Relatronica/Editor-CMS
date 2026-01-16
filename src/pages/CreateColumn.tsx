import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import ColumnForm from '../components/forms/ColumnForm';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateColumnPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (formData: {
      title: string;
      slug: string;
      description: string;
      cover: { id: number; url: string } | null;
      author: number | null;
      links: Array<{ label: string; url: string; description?: string; publishDate?: string }>;
    }) => {
      // Verifica se esiste già una colonna con lo stesso slug
      // Questo previene sovrascritture accidentali durante importazioni
      try {
        const existingColumns = await apiClient.find<{ id: number; attributes?: { slug?: string }; slug?: string }>('columns', {
          filters: {
            slug: { $eq: formData.slug },
          },
          pagination: { limit: 1 },
        });

        if (existingColumns?.data && existingColumns.data.length > 0) {
          const existingColumn = existingColumns.data[0];
          const existingSlug = existingColumn.attributes?.slug || existingColumn.slug;
          if (existingSlug === formData.slug) {
            throw new Error(
              `Esiste già una rubrica con lo slug "${formData.slug}". ` +
              `Modifica lo slug o modifica la rubrica esistente (ID: ${existingColumn.id}).`
            );
          }
        }
      } catch (error) {
        // Se l'errore è già il nostro messaggio personalizzato, rilanciamolo
        if (error instanceof Error && error.message.includes('Esiste già una rubrica')) {
          throw error;
        }
        // Altrimenti, potrebbe essere un errore di rete o altro - continuiamo comunque
        // per non bloccare la creazione in caso di problemi temporanei
        console.warn('Errore durante la verifica dello slug esistente:', error);
      }

      // Format data for Strapi API
      const data: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        links: formData.links.map((link) => ({
          label: link.label,
          url: link.url,
          description: link.description || null,
          publishDate: link.publishDate || null,
        })),
      };

      if (formData.cover) {
        data.cover = formData.cover.id;
      }

      if (formData.author) {
        data.author = formData.author;
      }

      return apiClient.create('columns', data);
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
    description: string;
    cover: { id: number; url: string } | null;
    author: number | null;
    links: Array<{ label: string; url: string; description?: string; publishDate?: string }>;
  }) => {
    setError('');
    await mutation.mutateAsync(formData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuova Rubrica</h1>
        <p className="text-gray-600 mt-1">
          Crea una nuova rubrica con link curati
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="card">
        <ColumnForm onSubmit={handleSubmit} isSubmitting={mutation.isPending} />
      </div>
    </div>
  );
}
