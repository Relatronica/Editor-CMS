import { useParams, useNavigate, Link } from 'react-router-dom';
import EventForm, { EventFormData } from '../components/forms/EventForm';
import { ArrowLeft, AlertCircle, Loader2, Trash2, Clock } from 'lucide-react';
import { useState } from 'react';
import { isPast } from 'date-fns';
import { useEventDetail, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents';

function isEventPast(startDate?: string, endDate?: string): boolean {
  if (!startDate) return false;
  const end = endDate ? new Date(endDate) : new Date(startDate);
  return isPast(end);
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading } = useEventDetail(id);

  const mutation = useUpdateEvent(id, data);

  const deleteMutation = useDeleteEvent(id);

  const handleSubmit = async (formData: EventFormData) => {
    setError('');
    try {
      await mutation.mutateAsync(formData);
      navigate('/events');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante il salvataggio. Riprova.'
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      navigate('/events');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'eliminazione. Riprova."
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
            Evento non trovato
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            L'evento che stai cercando non esiste o è stato eliminato.
          </p>
          <Link to="/events" className="btn-primary inline-block">
            Torna agli eventi
          </Link>
        </div>
      </div>
    );
  }

  const eventData = data.data;
  const eventAttrs = eventData.attributes || eventData;
  const eventStartDate = eventAttrs.startDate;
  const eventEndDate = eventAttrs.endDate;

  if (isEventPast(eventStartDate, eventEndDate)) {
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
        </div>
        <div className="card text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 mb-4">
            <Clock className="text-surface-400" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
            Evento concluso
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-6">
            Non e' possibile modificare un evento passato. Puoi consultare la lista eventi per vederne i dettagli.
          </p>
          <Link to="/events" className="btn-primary inline-block">
            Torna agli eventi
          </Link>
        </div>
      </div>
    );
  }

  const initialData = eventData.attributes
    ? (eventData as { id: number; attributes: any })
    : {
        id: eventData.id,
        attributes: {
          title: eventData.title,
          slug: eventData.slug,
          description: eventData.description,
          body: eventData.body,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          location: eventData.location,
          address: eventData.address,
          isOnline: eventData.isOnline,
          onlineUrl: eventData.onlineUrl,
          organizer: eventData.organizer,
          externalUrl: eventData.externalUrl,
          isFeatured: eventData.isFeatured,
          heroImage: eventData.heroImage,
          seo: eventData.seo,
          tags: Array.isArray(eventData.tags) && eventData.tags.length > 0 && typeof eventData.tags[0] === 'object'
            ? { data: (eventData.tags as unknown as Array<{ id: number }>).map((t) => ({ id: t.id })) }
            : Array.isArray(eventData.tags) && eventData.tags.length > 0 && typeof eventData.tags[0] === 'number'
            ? { data: (eventData.tags as number[]).map((tagId) => ({ id: tagId })) }
            : undefined,
        },
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Modifica Evento</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Modifica i dettagli dell'evento
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger inline-flex items-center gap-2"
          >
            <Trash2 size={16} />
            <span>Elimina</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
          <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5" size={20} />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            Sei sicuro di voler eliminare questo evento? Questa azione non può essere annullata.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="btn-danger inline-flex items-center gap-2 text-sm"
            >
              {deleteMutation.isPending && (
                <Loader2 className="animate-spin" size={14} />
              )}
              Conferma eliminazione
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary text-sm"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <EventForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
