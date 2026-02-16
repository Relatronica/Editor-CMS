import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { queryKeys } from '../config/queryKeys';
import { logger } from '../lib/logger';
import { Calendar, ChevronLeft, ChevronRight, FileText, Link as LinkIcon, Loader2, ArrowLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface ScheduledContent {
  id: string;
  type: 'article' | 'column-link';
  title: string;
  authorName: string;
  description?: string;
  publishDate: Date;
  articleId?: number;
  columnId?: number;
  linkIndex?: number;
}

interface ArticleData {
  id: number;
  attributes?: {
    title: string;
    publishDate?: string;
    author?: {
      data?: {
        id: number;
        attributes?: {
          name: string;
        };
      };
    };
  };
  title?: string;
  publishDate?: string;
  author?: {
    data?: {
      id: number;
      attributes?: {
        name: string;
      };
    };
  } | number;
}

interface ColumnLink {
  label: string;
  url: string;
  description?: string;
  publishDate?: string;
}

interface ColumnData {
  id: number;
  attributes?: {
    title: string;
    author?: {
      data?: {
        id: number;
        attributes?: {
          name: string;
        };
      };
    };
    links?: ColumnLink[];
  };
  title?: string;
  author?: {
    data?: {
      id: number;
      attributes?: {
        name: string;
      };
    };
  } | number;
  links?: ColumnLink[];
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const dateRange = useMemo(() => {
    const rangeStart = startOfMonth(subMonths(currentMonth, 1));
    const rangeEnd = endOfMonth(addMonths(currentMonth, 1));
    return {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
    };
  }, [currentMonth]);

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: queryKeys.articles.list({
      type: 'scheduled',
      start: dateRange.start,
      end: dateRange.end,
    }),
    queryFn: ({ signal }) =>
      apiClient.find<ArticleData>(
        'articles',
        {
          filters: {
            publishDate: {
              $gte: dateRange.start,
              $lte: dateRange.end,
            },
          },
          populate: ['author'],
          sort: ['publishDate:asc'],
          pagination: { limit: 200 },
        },
        signal
      ),
  });

  const { data: columnsData, isLoading: columnsLoading } = useQuery({
    queryKey: queryKeys.columns.list({
      type: 'scheduled',
      start: dateRange.start,
      end: dateRange.end,
    }),
    queryFn: ({ signal }) =>
      apiClient.find<ColumnData>(
        'columns',
        {
          populate: ['author', 'links'],
          pagination: { limit: 200 },
        },
        signal
      ),
  });

  const extractAuthorName = (author: unknown): string => {
    if (!author) return 'Nessun autore';
    
    if (typeof author === 'number') {
      return `Autore #${author}`;
    }
    
    if (typeof author === 'object' && author !== null) {
      const authorObj = author as Record<string, unknown>;
      
      if (
        authorObj.data &&
        typeof authorObj.data === 'object' &&
        authorObj.data !== null
      ) {
        const dataObj = authorObj.data as Record<string, unknown>;
        if (
          dataObj.attributes &&
          typeof dataObj.attributes === 'object' &&
          dataObj.attributes !== null
        ) {
          const attrs = dataObj.attributes as Record<string, unknown>;
          if (typeof attrs.name === 'string') {
            return attrs.name;
          }
        }
        if (typeof dataObj.name === 'string') {
          return dataObj.name;
        }
      }
      
      if (
        authorObj.attributes &&
        typeof authorObj.attributes === 'object' &&
        authorObj.attributes !== null
      ) {
        const attrs = authorObj.attributes as Record<string, unknown>;
        if (typeof attrs.name === 'string') {
          return attrs.name;
        }
      }
      
      if (typeof authorObj.name === 'string') {
        return authorObj.name;
      }
    }
    
    return 'Nessun autore';
  };

  const scheduledContent = useMemo<ScheduledContent[]>(() => {
    const content: ScheduledContent[] = [];

    if (articlesData?.data) {
      articlesData.data.forEach((article) => {
        const attrs = article.attributes || article;
        const publishDateStr = attrs.publishDate;
        
        if (publishDateStr) {
          try {
            const publishDate = parseISO(publishDateStr);
            const authorName = extractAuthorName(attrs.author);

            content.push({
              id: `article-${article.id}`,
              type: 'article',
              title: attrs.title || 'Senza titolo',
              authorName,
              publishDate,
              articleId: article.id,
            });
          } catch (error) {
            logger.warn('Errore nel parsing della data per articolo:', article, error);
          }
        }
      });
    }

    if (columnsData?.data) {
      columnsData.data.forEach((column) => {
        const attrs = column.attributes || column;
        const links = (column?.links ?? column?.attributes?.links ?? []) as ColumnLink[];
        const linksArray = Array.isArray(links) ? links : [];
        const authorName = extractAuthorName(attrs.author);

        linksArray.forEach((link, index) => {
          const publishDateStr = link?.publishDate || (link as any)?.attributes?.publishDate;
          
          if (publishDateStr) {
            try {
              const publishDate = parseISO(publishDateStr);
              const label = link?.label || (link as any)?.attributes?.label || 'Link senza label';
              const description = link?.description || (link as any)?.attributes?.description;
              
              content.push({
                id: `column-${column.id}-link-${index}`,
                type: 'column-link',
                title: label,
                authorName,
                description,
                publishDate,
                columnId: column.id,
                linkIndex: index,
              });
            } catch (error) {
              logger.warn('Errore nel parsing della data per link:', link, error);
            }
          }
        });
      });
    }

    return content.sort((a, b) => a.publishDate.getTime() - b.publishDate.getTime());
  }, [articlesData, columnsData]);

  const monthContent = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return scheduledContent.filter((item) => {
      return item.publishDate >= monthStart && item.publishDate <= monthEnd;
    });
  }, [scheduledContent, currentMonth]);

  const contentByDay = useMemo(() => {
    const grouped: Record<string, ScheduledContent[]> = {};
    
    monthContent.forEach((item) => {
      const dayKey = format(item.publishDate, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(item);
    });
    
    return grouped;
  }, [monthContent]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  const firstDayOfMonth = startOfMonth(currentMonth);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const adjustedFirstDay = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

  const isLoading = articlesLoading || columnsLoading;

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDay(null);
  };

  const handleDayClick = (day: Date) => {
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  const selectedDayContent = useMemo(() => {
    if (!selectedDay) return [];
    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    return contentByDay[dayKey] || [];
  }, [selectedDay, contentByDay]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
      </div>
    );
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="space-y-6">
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2.5 tracking-tight">
              <Calendar size={24} className="text-primary-600 dark:text-primary-400" />
              <span>Calendario Contenuti Programmati</span>
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Visualizza tutti i contenuti programmati per la pubblicazione
            </p>
          </div>
          <button
            onClick={handleToday}
            className="btn-secondary"
          >
            Oggi
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="p-2.5 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2.5 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-surface-500 dark:text-surface-400 py-2 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: adjustedFirstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {monthDays.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayContent = contentByDay[dayKey] || [];
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square border rounded-xl p-2 flex flex-col items-start justify-between transition-all duration-200 relative cursor-pointer ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-400 dark:border-primary-600 ring-2 ring-primary-300 dark:ring-primary-700'
                        : isToday
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                        : 'bg-white dark:bg-surface-800/50 border-surface-200 dark:border-surface-700/50 hover:border-primary-200 dark:hover:border-primary-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                    } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        isSelected
                          ? 'text-primary-800 dark:text-primary-200'
                          : isToday
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-surface-700 dark:text-surface-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    {dayContent.length > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-primary-600 dark:bg-primary-500 rounded-full leading-none shadow-sm">
                          {dayContent.length}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-end gap-6 px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText className="text-primary-600 dark:text-primary-400" size={16} />
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 leading-tight">Articoli</p>
            <p className="text-xs font-bold text-surface-900 dark:text-surface-100 leading-tight">
              {scheduledContent.filter((c) => c.type === 'article').length}
            </p>
          </div>
        </div>
        <div className="h-7 w-px bg-surface-200 dark:bg-surface-700" />
        <div className="flex items-center gap-2">
          <LinkIcon className="text-primary-600 dark:text-primary-400" size={16} />
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 leading-tight">Link</p>
            <p className="text-xs font-bold text-surface-900 dark:text-surface-100 leading-tight">
              {scheduledContent.filter((c) => c.type === 'column-link').length}
            </p>
          </div>
        </div>
        <div className="h-7 w-px bg-surface-200 dark:bg-surface-700" />
        <div className="flex items-center gap-2">
          <Calendar className="text-primary-600 dark:text-primary-400" size={16} />
          <div>
            <p className="text-xs text-surface-400 dark:text-surface-500 leading-tight">Totale</p>
            <p className="text-xs font-bold text-surface-900 dark:text-surface-100 leading-tight">
              {scheduledContent.length}
            </p>
          </div>
        </div>
      </div>

      {selectedDay && selectedDayContent.length > 0 && (
        <div className="card animate-slide-up">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            Contenuti programmati per {format(selectedDay, "dd MMMM yyyy", { locale: it })}
          </h3>
          <div className="space-y-3">
            {selectedDayContent.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {item.type === 'article' ? (
                        <FileText size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      ) : (
                        <LinkIcon size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      )}
                      <h4 className="font-medium text-surface-900 dark:text-surface-100 truncate">
                        {item.title}
                      </h4>
                      <span className="badge-gray">
                        {item.type === 'article' ? 'Articolo' : 'Link Colonna'}
                      </span>
                    </div>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      Autore: <span className="font-medium text-surface-700 dark:text-surface-300">{item.authorName}</span>
                    </p>
                    {item.description && (
                      <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">
                      {format(item.publishDate, "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && selectedDayContent.length === 0 && (
        <div className="card text-center py-12 animate-slide-up">
          <Calendar className="mx-auto text-surface-300 dark:text-surface-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
            Nessun contenuto programmato
          </h3>
          <p className="text-surface-500 dark:text-surface-400">
            Non ci sono contenuti programmati per {format(selectedDay, "dd MMMM yyyy", { locale: it })}.
          </p>
        </div>
      )}

      {!selectedDay && monthContent.length === 0 && (
        <div className="card text-center py-12">
          <Calendar className="mx-auto text-surface-300 dark:text-surface-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
            Nessun contenuto programmato
          </h3>
          <p className="text-surface-500 dark:text-surface-400">
            Non ci sono contenuti programmati per {format(currentMonth, 'MMMM yyyy', { locale: it })}.
          </p>
        </div>
      )}

      {!selectedDay && monthContent.length > 0 && (
        <div className="card text-center py-8">
          <p className="text-surface-500 dark:text-surface-400">
            Clicca su un giorno nel calendario per vedere i contenuti programmati
          </p>
        </div>
      )}
    </div>
  );
}
