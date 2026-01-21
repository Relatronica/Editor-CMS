import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
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

  // Recupera articoli programmati (include sia passati che futuri)
  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles', 'scheduled'],
    queryFn: async () => {
      const result = await apiClient.find<ArticleData>('articles', {
        filters: {
          publishDate: { $notNull: true },
        },
        populate: ['author'],
        sort: ['publishDate:asc'],
        pagination: { limit: 1000 },
      });
      return result;
    },
  });

  // Recupera colonne con i loro link
  const { data: columnsData, isLoading: columnsLoading } = useQuery({
    queryKey: ['columns', 'scheduled'],
    queryFn: async () => {
      const result = await apiClient.find<ColumnData>('columns', {
        populate: ['author', 'links'],
        pagination: { limit: 1000 },
      });
      return result;
    },
  });

  // Helper per estrarre il nome dell'autore da diverse strutture Strapi
  const extractAuthorName = (author: unknown): string => {
    if (!author) return 'Nessun autore';
    
    if (typeof author === 'number') {
      return `Autore #${author}`;
    }
    
    if (typeof author === 'object' && author !== null) {
      const authorObj = author as Record<string, unknown>;
      
      // Prova diverse strutture possibili (Strapi v4 e v5)
      // author.data.attributes.name
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
      
      // author.attributes.name
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
      
      // author.name
      if (typeof authorObj.name === 'string') {
        return authorObj.name;
      }
    }
    
    return 'Nessun autore';
  };

  // Processa e combina tutti i contenuti programmati
  const scheduledContent = useMemo<ScheduledContent[]>(() => {
    const content: ScheduledContent[] = [];

    // Processa articoli
    if (articlesData?.data) {
      articlesData.data.forEach((article) => {
        const attrs = article.attributes || article;
        const publishDateStr = attrs.publishDate;
        
        if (publishDateStr) {
          try {
            const publishDate = parseISO(publishDateStr);
            // Mostra tutti gli articoli con publishDate, sia passati che futuri (per il calendario)
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
            console.warn('Errore nel parsing della data per articolo:', article, error);
          }
        }
      });
    }

    // Processa link delle colonne
    if (columnsData?.data) {
      let totalLinks = 0;
      let linksWithPublishDate = 0;
      
      columnsData.data.forEach((column) => {
        const attrs = column.attributes || column;
        // Estrai i link da diverse strutture possibili (come in ManageColumnLinks)
        const links = (column?.links ?? column?.attributes?.links ?? []) as ColumnLink[];
        const linksArray = Array.isArray(links) ? links : [];
        
        totalLinks += linksArray.length;

        const authorName = extractAuthorName(attrs.author);

        linksArray.forEach((link, index) => {
          // Estrai publishDate da diverse strutture possibili
          const publishDateStr = link?.publishDate || (link as any)?.attributes?.publishDate;
          
          if (publishDateStr) {
            linksWithPublishDate++;
            try {
              const publishDate = parseISO(publishDateStr);
              // Mostra tutti i link con publishDate, anche quelli passati (per il calendario)
              // Estrai label e description da diverse strutture
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
              console.warn('Errore nel parsing della data per link:', link, error);
            }
          }
        });
      });
    }

    // Ordina per data di pubblicazione
    return content.sort((a, b) => a.publishDate.getTime() - b.publishDate.getTime());
  }, [articlesData, columnsData]);

  // Filtra contenuti per il mese corrente
  const monthContent = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return scheduledContent.filter((item) => {
      return item.publishDate >= monthStart && item.publishDate <= monthEnd;
    });
  }, [scheduledContent, currentMonth]);

  // Raggruppa contenuti per giorno
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

  // Genera giorni del mese
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Primo giorno del mese (per allineare il calendario)
  const firstDayOfMonth = startOfMonth(currentMonth);
  const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Domenica, 6 = Sabato
  const adjustedFirstDay = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Converti a Lun=0, Dom=6

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
    // Permetti la selezione di qualsiasi giorno, anche senza contenuti
    // Se il giorno selezionato è già quello corrente, deselezionalo
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  // Contenuti del giorno selezionato
  const selectedDayContent = useMemo(() => {
    if (!selectedDay) return [];
    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    return contentByDay[dayKey] || [];
  }, [selectedDay, contentByDay]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Calendar size={24} />
              <span>Calendario Contenuti Programmati</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Visualizza tutti i contenuti programmati per la pubblicazione
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Oggi
            </button>
          </div>
        </div>
      </div>

      {/* Navigazione mese */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendario */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Intestazioni giorni */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-700 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Giorni del mese */}
            <div className="grid grid-cols-7 gap-2">
              {/* Spazi vuoti prima del primo giorno */}
              {Array.from({ length: adjustedFirstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Giorni del mese */}
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
                    className={`aspect-square border rounded-lg p-2 flex flex-col items-start justify-between transition-colors relative cursor-pointer ${
                      isSelected
                        ? 'bg-primary-100 border-primary-400 ring-2 ring-primary-300'
                        : isToday
                        ? 'bg-primary-50 border-primary-300'
                        : 'bg-white border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                    } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        isSelected
                          ? 'text-primary-900'
                          : isToday
                          ? 'text-primary-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    {dayContent.length > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold text-white bg-primary-600 rounded-full leading-none">
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

      {/* Statistiche */}
      <div className="flex items-center justify-end gap-4 px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText className="text-primary-600" size={16} />
          <div>
            <p className="text-xs text-gray-500 leading-tight">Articoli</p>
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {scheduledContent.filter((c) => c.type === 'article').length}
            </p>
          </div>
        </div>
        <div className="h-7 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <LinkIcon className="text-primary-600" size={16} />
          <div>
            <p className="text-xs text-gray-500 leading-tight">Link</p>
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {scheduledContent.filter((c) => c.type === 'column-link').length}
            </p>
          </div>
        </div>
        <div className="h-7 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <Calendar className="text-primary-600" size={16} />
          <div>
            <p className="text-xs text-gray-500 leading-tight">Totale</p>
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {scheduledContent.length}
            </p>
          </div>
        </div>
      </div>

      {/* Lista contenuti del giorno selezionato */}
      {selectedDay && selectedDayContent.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contenuti programmati per {format(selectedDay, "dd MMMM yyyy", { locale: it })}
          </h3>
          <div className="space-y-3">
            {selectedDayContent.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {item.type === 'article' ? (
                        <FileText size={16} className="text-primary-600 flex-shrink-0" />
                      ) : (
                        <LinkIcon size={16} className="text-primary-600 flex-shrink-0" />
                      )}
                      <h4 className="font-medium text-gray-900 truncate">
                        {item.title}
                      </h4>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {item.type === 'article' ? 'Articolo' : 'Link Colonna'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Autore: <span className="font-medium">{item.authorName}</span>
                    </p>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
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
        <div className="card text-center py-12">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nessun contenuto programmato
          </h3>
          <p className="text-gray-600">
            Non ci sono contenuti programmati per {format(selectedDay, "dd MMMM yyyy", { locale: it })}.
          </p>
        </div>
      )}

      {!selectedDay && monthContent.length === 0 && (
        <div className="card text-center py-12">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nessun contenuto programmato
          </h3>
          <p className="text-gray-600">
            Non ci sono contenuti programmati per {format(currentMonth, 'MMMM yyyy', { locale: it })}.
          </p>
        </div>
      )}

      {!selectedDay && monthContent.length > 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-600">
            Clicca su un giorno nel calendario per vedere i contenuti programmati
          </p>
        </div>
      )}
    </div>
  );
}
