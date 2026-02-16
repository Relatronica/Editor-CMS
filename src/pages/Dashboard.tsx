import { Link } from 'react-router-dom';
import { FileText, Columns, Clock, CheckCircle2, Edit, Link as LinkIcon, Plus, Calendar, Film, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTutorial } from '../hooks/useTutorial';
import TutorialTour from '../components/TutorialTour';
import { Step } from 'react-joyride';
import { useArticlesList } from '../hooks/useArticles';
import { useColumnsList } from '../hooks/useColumns';
import { useRecentEvents } from '../hooks/useEvents';
import { useVideoEpisodesList } from '../hooks/useVideoEpisodes';

export default function DashboardPage() {
  const { isRunning, completeTutorial, stopTutorial } = useTutorial('dashboard');

  const { data: articles, isLoading: articlesLoading, error: articlesError } = useArticlesList({ limit: 10 });
  const { data: columns, isLoading: columnsLoading, error: columnsError } = useColumnsList({ limit: 10 });
  const { data: events, isLoading: eventsLoading, error: eventsError } = useRecentEvents(10);
  const { data: videoEpisodes, isLoading: videoEpisodesLoading, error: videoError } = useVideoEpisodesList({ limit: 10 });

  const isLoading = articlesLoading || columnsLoading || videoEpisodesLoading || eventsLoading;

  const dashboardSteps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Benvenuto nella Dashboard!</h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">
            Questa è la tua area di controllo principale per gestire tutti i contenuti.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Ti guiderò attraverso le funzionalità principali in pochi passaggi.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="articles-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Sezione Articoli</h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">
            Da qui puoi creare nuovi articoli editoriali. Usa il pulsante "Nuovo" per inserire un nuovo articolo
            e compilare tutti i campi necessari (titolo, contenuto, immagini, SEO, ecc.).
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Questa sezione ti permette di inserire contenuti, non di visualizzare quelli già creati.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="columns-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Sezione Rubriche</h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">
            Le rubriche sono contenuti speciali che raggruppano articoli tematici.
            Da qui puoi creare nuove rubriche usando il pulsante "Nuovo".
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Come per gli articoli, questa sezione ti permette di inserire nuove rubriche, non di visualizzare quelle esistenti.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="newsroom-section"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Newsroom</h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">
            La newsroom è una raccolta di articoli interessanti: link e riferimenti ad articoli tematici.
            Da qui puoi creare nuove raccolte di link usando il pulsante "Nuovo".
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Anche in questo caso, puoi solo inserire nuove raccolte, non visualizzare quelle già esistenti.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <TutorialTour
        steps={dashboardSteps}
        isRunning={isRunning}
        onComplete={completeTutorial}
        onSkip={stopTutorial}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Gestisci i tuoi contenuti e crea nuovi articoli o colonne
          </p>
        </div>
        <Link
          to="/calendar"
          className="btn-primary"
        >
          <Calendar size={18} />
          <span>Calendario</span>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Articles */}
        <div className="card" data-tour="articles-section">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                <FileText size={18} className="text-primary-600 dark:text-primary-400" />
              </div>
              <span>Articoli</span>
            </h2>
            <Link to="/articles/new" className="btn-primary !py-1.5 !px-3 !text-xs">
              <Plus size={14} />
              <span>Nuovo</span>
            </Link>
          </div>

          {articlesError ? (
            <p className="text-sm text-red-500 dark:text-red-400 text-center py-4">
              Errore nel caricamento degli articoli.
            </p>
          ) : articles?.data && articles.data.length > 0 ? (
            <div className="space-y-2">
              {articles.data
                .filter((article) => article?.attributes?.title)
                .map((article) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.documentId || article.id}/edit`}
                    className="block p-3 rounded-xl border border-surface-200 dark:border-surface-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-surface-900 dark:text-surface-100 truncate text-sm group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                          {article.attributes.title || 'Senza titolo'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          {article.attributes.updatedAt && (
                            <span className="text-xs text-surface-400 dark:text-surface-500">
                              {format(
                                new Date(article.attributes.updatedAt),
                                'dd MMM yyyy, HH:mm',
                                { locale: it }
                              )}
                            </span>
                          )}
                          {article.attributes.publishedAt ? (
                            <span title="Pubblicato">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                            </span>
                          ) : (
                            <span title="Draft">
                              <Clock size={13} className="text-surface-400 dark:text-surface-500" />
                            </span>
                          )}
                        </div>
                      </div>
                      <Edit size={14} className="text-surface-300 dark:text-surface-600 group-hover:text-primary-500 ml-2 flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 mb-3">
                <FileText size={20} className="text-surface-400" />
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Nessun articolo ancora. Crea il primo!
              </p>
            </div>
          )}
        </div>

        {/* Columns */}
        <div className="card" data-tour="columns-section">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
                <Columns size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span>Rubriche</span>
            </h2>
            <Link to="/columns/new" className="btn-primary !py-1.5 !px-3 !text-xs">
              <Plus size={14} />
              <span>Nuovo</span>
            </Link>
          </div>

          {columnsError ? (
            <p className="text-sm text-red-500 dark:text-red-400 text-center py-4">
              Errore nel caricamento delle rubriche.
            </p>
          ) : columns?.data && columns.data.length > 0 ? (
            <div className="space-y-2">
              {columns.data
                .filter((column) => column?.attributes?.title)
                .map((column) => (
                  <div
                    key={column.id}
                    className="block p-3 rounded-xl border border-surface-200 dark:border-surface-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/columns/${column.documentId || column.id}/edit`}
                        className="flex-1 min-w-0"
                      >
                        <h3 className="font-medium text-surface-900 dark:text-surface-100 truncate text-sm group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                          {column.attributes.title || 'Senza titolo'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          {column.attributes.updatedAt && (
                            <span className="text-xs text-surface-400 dark:text-surface-500">
                              {format(
                                new Date(column.attributes.updatedAt),
                                'dd MMM yyyy, HH:mm',
                                { locale: it }
                              )}
                            </span>
                          )}
                          {column.attributes.publishedAt ? (
                            <span title="Pubblicato">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                            </span>
                          ) : (
                            <span title="Draft">
                              <Clock size={13} className="text-surface-400 dark:text-surface-500" />
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Link
                          to={`/columns/${column.documentId || column.id}/links`}
                          className="p-1.5 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-all"
                          title="Gestisci link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <LinkIcon size={14} />
                        </Link>
                        <Link
                          to={`/columns/${column.documentId || column.id}/edit`}
                          className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-all"
                          title="Modifica rubrica"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 mb-3">
                <Columns size={20} className="text-surface-400" />
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Nessuna rubrica ancora. Crea la prima!
              </p>
            </div>
          )}
        </div>

        {/* Video Episodes */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
                <Film size={18} className="text-rose-600 dark:text-rose-400" />
              </div>
              <span>Video Episodes</span>
            </h2>
            <Link to="/video-episodes/new" className="btn-primary !py-1.5 !px-3 !text-xs">
              <Plus size={14} />
              <span>Nuovo</span>
            </Link>
          </div>

          {videoError ? (
            <p className="text-sm text-red-500 dark:text-red-400 text-center py-4">
              Errore nel caricamento dei video.
            </p>
          ) : videoEpisodes?.data && videoEpisodes.data.length > 0 ? (
            <div className="space-y-2">
              {videoEpisodes.data
                .filter((episode) => episode?.attributes?.title)
                .map((episode) => (
                  <Link
                    key={episode.id}
                    to={`/video-episodes/${episode.documentId || episode.id}/edit`}
                    className="block p-3 rounded-xl border border-surface-200 dark:border-surface-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-surface-900 dark:text-surface-100 truncate text-sm group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                          {episode.attributes.title || 'Senza titolo'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          {episode.attributes.updatedAt && (
                            <span className="text-xs text-surface-400 dark:text-surface-500">
                              {format(
                                new Date(episode.attributes.updatedAt),
                                'dd MMM yyyy, HH:mm',
                                { locale: it }
                              )}
                            </span>
                          )}
                          {episode.attributes.publishedAt ? (
                            <span title="Pubblicato">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                            </span>
                          ) : (
                            <span title="Draft">
                              <Clock size={13} className="text-surface-400 dark:text-surface-500" />
                            </span>
                          )}
                        </div>
                      </div>
                      <Edit size={14} className="text-surface-300 dark:text-surface-600 group-hover:text-primary-500 ml-2 flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 mb-3">
                <Film size={20} className="text-surface-400" />
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Nessun episodio video ancora. Crea il primo!
              </p>
            </div>
          )}
        </div>

        {/* Events */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <CalendarDays size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span>Eventi</span>
            </h2>
            <div className="flex items-center gap-2">
              <Link
                to="/events"
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
              >
                Vedi tutti
              </Link>
              <Link to="/events/new" className="btn-primary !py-1.5 !px-3 !text-xs">
                <Plus size={14} />
                <span>Nuovo</span>
              </Link>
            </div>
          </div>

          {eventsError ? (
            <p className="text-sm text-red-500 dark:text-red-400 text-center py-4">
              Errore nel caricamento degli eventi.
            </p>
          ) : events?.data && events.data.length > 0 ? (
            <div className="space-y-2">
              {events.data
                .filter((event) => (event?.attributes?.title || event?.title))
                .map((event) => {
                  const attrs = event.attributes || event;
                  const title = attrs.title || 'Senza titolo';
                  const updatedAt = attrs.updatedAt;
                  const publishedAt = attrs.publishedAt;
                  return (
                  <Link
                    key={event.id}
                    to={`/events/${event.documentId || event.id}/edit`}
                    className="block p-3 rounded-xl border border-surface-200 dark:border-surface-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-surface-900 dark:text-surface-100 truncate text-sm group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                          {title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          {updatedAt && (
                            <span className="text-xs text-surface-400 dark:text-surface-500">
                              {format(
                                new Date(updatedAt),
                                'dd MMM yyyy, HH:mm',
                                { locale: it }
                              )}
                            </span>
                          )}
                          {publishedAt ? (
                            <span title="Pubblicato">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                            </span>
                          ) : (
                            <span title="Draft">
                              <Clock size={13} className="text-surface-400 dark:text-surface-500" />
                            </span>
                          )}
                        </div>
                      </div>
                      <Edit size={14} className="text-surface-300 dark:text-surface-600 group-hover:text-primary-500 ml-2 flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 mb-3">
                <CalendarDays size={20} className="text-surface-400" />
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Nessun evento ancora. Crea il primo!
              </p>
            </div>
          )}
        </div>

        {/* Newsroom */}
        <div className="card" data-tour="newsroom-section">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                <LinkIcon size={18} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <span>Newsroom</span>
            </h2>
            <Link to="/columns/select-links" className="btn-primary !py-1.5 !px-3 !text-xs">
              <Plus size={14} />
              <span>Nuovo</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
