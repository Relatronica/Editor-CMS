import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import EventForm, { EventFormData } from '../components/forms/EventForm';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useCreateEvent } from '../hooks/useEvents';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const mutation = useCreateEvent();

  const handleSubmit = async (formData: EventFormData) => {
    setError('');
    try {
      await mutation.mutateAsync(formData);
      navigate('/events');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante la creazione. Riprova.'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          to="/events"
          className="inline-flex items-center space-x-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna agli eventi</span>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Nuovo Evento</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Crea un nuovo evento
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
          <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5" size={20} />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="card">
        <EventForm onSubmit={handleSubmit} isSubmitting={mutation.isPending} />
      </div>
    </div>
  );
}
