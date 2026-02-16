import { useParams, useNavigate, Link } from 'react-router-dom';
import ColumnForm from '../components/forms/ColumnForm';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  useColumnDetail,
  useUpdateColumn,
  type ColumnFormData,
} from '../hooks/useColumns';

export default function EditColumnPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data, isLoading } = useColumnDetail(id);

  const mutation = useUpdateColumn(id, data);

  const handleSubmit = async (formData: ColumnFormData) => {
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
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-surface-400 dark:text-surface-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
            Rubrica non trovata
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            La rubrica che stai cercando non esiste o è stata eliminata.
          </p>
          <Link to="/" className="btn-primary inline-block">
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Modifica Rubrica</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Modifica i dettagli della rubrica
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
          <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5" size={20} />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="card">
        <ColumnForm
          initialData={
            data.data.attributes
              ? (data.data as { id: number; attributes: Partial<ColumnFormData & { author?: { data?: { id: number } } }> })
              : {
                  id: data.data.id,
                  attributes: {
                    title: data.data.title,
                    slug: data.data.slug,
                    description: data.data.description,
                    cover: data.data.cover,
                    author: typeof data.data.author === 'object' && data.data.author && 'data' in data.data.author && data.data.author.data
                      ? { data: { id: (data.data.author as { data: { id: number } }).data.id } }
                      : typeof data.data.author === 'number'
                      ? { data: { id: data.data.author } }
                      : undefined,
                    links: data.data.links,
                  },
                } as { id: number; attributes: Partial<ColumnFormData & { author?: { data?: { id: number } } }> }
          }
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
