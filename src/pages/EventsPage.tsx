import { Link } from 'react-router-dom';
import {
  CalendarDays,
  MapPin,
  Plus,
  Edit,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { useEventsList, type EventListItem } from '../hooks/useEvents';

function getEventStatus(startDate?: string, endDate?: string) {
  if (!startDate) return { label: 'Senza data', color: 'gray' };
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const now = new Date();

  if (isFuture(start)) return { label: 'In programma', color: 'blue' };
  if (isPast(end)) return { label: 'Concluso', color: 'gray' };
  if (isWithinInterval(now, { start, end }))
    return { label: 'In corso', color: 'green' };
  return { label: 'In programma', color: 'blue' };
}

function isEventPast(startDate?: string, endDate?: string): boolean {
  if (!startDate) return false;
  const end = endDate ? new Date(endDate) : new Date(startDate);
  return isPast(end);
}

const statusColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  gray: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
};

export default function EventsPage() {
  const { data, isLoading, error } = useEventsList();

  const events = data?.data || [];

  const now = new Date();
  const upcomingEvents = events.filter((ev) => {
    const start = ev.attributes?.startDate || ev.startDate;
    const end = ev.attributes?.endDate || ev.endDate;
    return start && !isEventPast(start, end);
  }).reverse();

  const pastEvents = events.filter((ev) => {
    const start = ev.attributes?.startDate || ev.startDate;
    const end = ev.attributes?.endDate || ev.endDate;
    return !start || isEventPast(start, end);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-red-500 dark:text-red-400">Errore nel caricamento degli eventi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-4 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1 tracking-tight">Eventi</h1>
            <p className="text-surface-500 dark:text-surface-400">
              {events.length} {events.length === 1 ? 'evento' : 'eventi'} totali
            </p>
          </div>
          <Link to="/events/new" className="btn-primary">
            <Plus size={18} />
            <span>Nuovo evento</span>
          </Link>
        </div>
      </div>

      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-600 dark:text-blue-400" />
            Prossimi eventi ({upcomingEvents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingEvents.map((event) => (
              <EditableEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={20} className="text-surface-400" />
            Eventi passati ({pastEvents.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {pastEvents.map((event) => (
              <PastEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="card text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 mb-4">
            <CalendarDays className="text-surface-400" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
            Nessun evento ancora
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-6">
            Crea il tuo primo evento per iniziare!
          </p>
          <Link to="/events/new" className="btn-primary">
            <Plus size={18} />
            <span>Crea evento</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function EditableEventCard({ event }: { event: EventListItem }) {
  const attrs = event.attributes || event;
  const title = attrs.title || 'Senza titolo';
  const startDate = attrs.startDate;
  const endDate = attrs.endDate;
  const location = attrs.location;
  const publishedAt = attrs.publishedAt;
  const status = getEventStatus(startDate, endDate);

  return (
    <Link
      to={`/events/${event.documentId || event.id}/edit`}
      className="card hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-soft-lg dark:hover:shadow-glow transition-all duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status.color]}`}
            >
              {status.label}
            </span>
            {publishedAt ? (
              <span title="Pubblicato">
                <CheckCircle2 size={14} className="text-emerald-500" />
              </span>
            ) : (
              <span title="Bozza" className="text-xs text-surface-400 dark:text-surface-500">
                Bozza
              </span>
            )}
          </div>

          <h3 className="font-semibold text-surface-900 dark:text-surface-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
            {title}
          </h3>

          {startDate && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-surface-500 dark:text-surface-400">
              <CalendarDays size={14} className="flex-shrink-0" />
              <span>
                {format(new Date(startDate), "d MMM yyyy 'alle' HH:mm", {
                  locale: it,
                })}
                {endDate &&
                  ` — ${format(new Date(endDate), "d MMM yyyy 'alle' HH:mm", {
                    locale: it,
                  })}`}
              </span>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-surface-400 dark:text-surface-500">
              <MapPin size={14} className="flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        <Edit
          size={16}
          className="text-surface-300 dark:text-surface-600 group-hover:text-primary-500 ml-3 flex-shrink-0 transition-colors"
        />
      </div>
    </Link>
  );
}

function PastEventCard({ event }: { event: EventListItem }) {
  const attrs = event.attributes || event;
  const title = attrs.title || 'Senza titolo';
  const startDate = attrs.startDate;
  const endDate = attrs.endDate;
  const location = attrs.location;
  const isOnline = attrs.isOnline;
  const organizer = attrs.organizer;

  return (
    <div className="card opacity-75 border-surface-200 dark:border-surface-700/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.gray}`}
            >
              Concluso
            </span>
            {isOnline && (
              <span className="inline-flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
                <Globe size={12} />
                Online
              </span>
            )}
          </div>

          <h3 className="font-medium text-surface-600 dark:text-surface-300 truncate">
            {title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {startDate && (
              <div className="flex items-center gap-1.5 text-xs text-surface-400 dark:text-surface-500">
                <CalendarDays size={12} className="flex-shrink-0" />
                <span>
                  {format(new Date(startDate), 'd MMM yyyy', { locale: it })}
                  {endDate &&
                    ` — ${format(new Date(endDate), 'd MMM yyyy', { locale: it })}`}
                </span>
              </div>
            )}

            {location && (
              <div className="flex items-center gap-1.5 text-xs text-surface-400 dark:text-surface-500">
                <MapPin size={12} className="flex-shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}

            {organizer && (
              <span className="text-xs text-surface-400 dark:text-surface-500">
                {organizer}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
