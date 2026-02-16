import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, Loader2, Plus, X, Link as LinkIcon, CheckCircle2, ExternalLink, Calendar } from 'lucide-react';
import {
  useColumnLinks,
  useAddColumnLinks,
  type LinkItem,
  type ColumnDetail,
} from '../hooks/useColumns';
import { queryKeys } from '../config/queryKeys';

export default function ManageColumnLinksPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newLinks, setNewLinks] = useState<LinkItem[]>([]);
  const [sessionSavedLinks, setSessionSavedLinks] = useState<LinkItem[]>([]);

  const { data: columnData, isLoading, error: queryError } = useColumnLinks(id);

  const mutation = useAddColumnLinks(id, columnData);

  // Conta i link esistenti
  const existingLinksCount = useMemo(() => {
    const column = columnData?.data;
    if (!column) return 0;
    const links = column?.links ?? column?.attributes?.links ?? [];
    return Array.isArray(links) ? links.length : 0;
  }, [columnData]);

  const handleAddLink = () => {
    setNewLinks([...newLinks, { label: '', url: '', description: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setNewLinks(newLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (
    index: number,
    field: keyof LinkItem,
    value: string
  ) => {
    setNewLinks(
      newLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  };

  const splitDateTime = (dateTimeStr: string | undefined): { date: string; time: string } => {
    if (!dateTimeStr) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    }
    try {
      const date = new Date(dateTimeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    } catch {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    }
  };

  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hours, minutes);
    return localDate.toISOString();
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    
    if (newLinks.length === 0) {
      setError('Aggiungi almeno un link prima di salvare.');
      return;
    }
    
    const invalidLinks = newLinks.filter(
      (link) => !link.label.trim() || !link.url.trim()
    );
    
    if (invalidLinks.length > 0) {
      setError('Tutti i link devono avere label e URL compilati.');
      return;
    }

    // Verifica link duplicati tra i nuovi link
    const urlMap = new Map<string, number[]>();
    newLinks.forEach((link, index) => {
      if (link.url && link.url.trim()) {
        const normalizedUrl = link.url.trim().toLowerCase();
        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl)!.push(index);
      }
    });

    const duplicates: number[] = [];
    urlMap.forEach((indices) => {
      if (indices.length > 1) {
        duplicates.push(...indices);
      }
    });

    if (duplicates.length > 0) {
      setError('Ci sono link duplicati con la stessa URL. Rimuovi i duplicati prima di salvare.');
      return;
    }

    // Verifica conflitti con link esistenti
    const column = columnData?.data;
    const existingLinks = column?.links ?? column?.attributes?.links ?? [];
    const existingLinksArray = Array.isArray(existingLinks) ? existingLinks : [];
    
    const existingUrls = new Set(
      existingLinksArray
        .map((link: any) => {
          const url = link?.url ?? link?.attributes?.url;
          return url && typeof url === 'string' ? url.trim().toLowerCase() : null;
        })
        .filter((url): url is string => url !== null)
    );

    const conflictingLinks: number[] = [];
    newLinks.forEach((link, index) => {
      if (link.url && link.url.trim()) {
        const normalizedUrl = link.url.trim().toLowerCase();
        if (existingUrls.has(normalizedUrl)) {
          conflictingLinks.push(index);
        }
      }
    });

    if (conflictingLinks.length > 0) {
      setError(
        `${conflictingLinks.length} link hanno URL già presenti nella rubrica. ` +
        `Modifica gli URL o rimuovi i link duplicati.`
      );
      return;
    }

    try {
      await mutation.mutateAsync(newLinks);
      setSuccess(`${newLinks.length} link aggiunto/i con successo! Puoi continuare ad aggiungerne altri.`);
      setSessionSavedLinks(prev => [...prev, ...newLinks]);
      setNewLinks([]);
      // Refetch i dati aggiornati dal server
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.links(id!) });
      setTimeout(() => setSuccess(''), 5000);
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

  if (queryError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-red-400 dark:text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
            Errore nel caricamento della rubrica
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-2">
            Impossibile caricare la rubrica con ID: {id}
          </p>
          <p className="text-sm text-surface-400 dark:text-surface-500 mb-4">
            {queryError instanceof Error ? queryError.message : 'Errore sconosciuto'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/columns/select-links" className="btn-primary inline-block">
              Seleziona un'altra rubrica
            </Link>
            <Link to="/" className="btn-secondary inline-block">
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!columnData?.data) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-surface-400 dark:text-surface-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
            Rubrica non trovata
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            La rubrica che stai cercando non esiste o è stata eliminata.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/columns/select-links" className="btn-primary inline-block">
              Seleziona un'altra rubrica
            </Link>
            <Link to="/" className="btn-secondary inline-block">
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const column: ColumnDetail = columnData.data;
  const columnTitle = column?.title ?? column?.attributes?.title ?? 'Senza titolo';

  const formattedSessionLinks = sessionSavedLinks.map((link, index) => ({
    index,
    label: link.label || 'Senza label',
    url: link.url || '',
    description: link.description,
    publishDate: link.publishDate,
  }));

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <LinkIcon className="text-primary-600" size={24} />
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
            Aggiungi Link - {columnTitle}
          </h1>
        </div>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Aggiungi nuovi link a questa rubrica {existingLinksCount > 0 && `(${existingLinksCount} link esistenti)`}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2">
          <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5" size={20} />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-start space-x-2">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
        </div>
      )}

      {/* Session Saved Links Section */}
      {formattedSessionLinks.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Link inseriti in questa sessione ({formattedSessionLinks.length})
            </h2>
          </div>
          <div className="space-y-3">
            {formattedSessionLinks.map((link, idx) => (
              <div
                key={idx}
                className="p-4 border border-surface-200 dark:border-surface-700 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-surface-900 dark:text-surface-100 truncate">
                        {link.label}
                      </h3>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex-shrink-0"
                        title="Apri link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-surface-500 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 font-mono truncate block mb-2"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                    {link.description && (
                      <p className="text-sm text-surface-500 dark:text-surface-400 mb-2 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                    {link.publishDate && (
                      <div className="flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
                        <Calendar size={12} />
                        <span>Pubblicazione: {formatDate(link.publishDate) || 'Data non valida'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="label text-lg">
                Nuovi Link da Aggiungere
              </label>
              <button
                type="button"
                onClick={handleAddLink}
                className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                <Plus size={16} />
                <span>Aggiungi Link</span>
              </button>
            </div>

            {newLinks.length === 0 ? (
              <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-8 border border-dashed border-surface-300 dark:border-surface-700 rounded-xl">
                Nessun nuovo link da aggiungere. Clicca "Aggiungi Link" per iniziare.
              </p>
            ) : (
              <div className="space-y-4">
                {newLinks.map((link, index) => (
                  <div
                    key={index}
                    className="p-4 border border-surface-200 dark:border-surface-700 rounded-xl space-y-3 bg-surface-50 dark:bg-surface-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        Link #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Rimuovi link"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Label *</label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) =>
                            handleLinkChange(index, 'label', e.target.value)
                          }
                          className="input text-sm"
                          required
                          placeholder="Testo del link"
                        />
                      </div>

                      <div>
                        <label className="label text-xs">URL *</label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) =>
                            handleLinkChange(index, 'url', e.target.value)
                          }
                          className="input text-sm font-mono"
                          required
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label text-xs">Descrizione</label>
                      <textarea
                        value={link.description || ''}
                        onChange={(e) =>
                          handleLinkChange(index, 'description', e.target.value)
                        }
                        className="input text-sm"
                        rows={2}
                        placeholder="Descrizione opzionale del link..."
                      />
                    </div>

                    <div>
                      <label className="label text-xs mb-2">Data di pubblicazione (opzionale)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Data
                          </label>
                          <input
                            type="date"
                            value={splitDateTime(link.publishDate).date}
                            onChange={(e) => {
                              const { time } = splitDateTime(link.publishDate);
                              const newDateTime = combineDateTime(e.target.value, time);
                              handleLinkChange(index, 'publishDate', newDateTime);
                            }}
                            className="input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Ora
                          </label>
                          <input
                            type="time"
                            value={splitDateTime(link.publishDate).time}
                            onChange={(e) => {
                              const { date } = splitDateTime(link.publishDate);
                              const newDateTime = combineDateTime(date, e.target.value);
                              handleLinkChange(index, 'publishDate', newDateTime);
                            }}
                            className="input text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={handleSave}
              disabled={mutation.isPending || newLinks.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {mutation.isPending && <Loader2 className="animate-spin" size={16} />}
              <span>
                {mutation.isPending 
                  ? 'Salvataggio...' 
                  : newLinks.length === 0
                  ? 'Aggiungi almeno un link'
                  : `Aggiungi ${newLinks.length} link`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
