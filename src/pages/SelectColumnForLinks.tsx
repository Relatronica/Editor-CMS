import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Columns, Link as LinkIcon } from 'lucide-react';
import Select from '../components/ui/Select';
import { useColumnsList } from '../hooks/useColumns';

interface ColumnItem {
  id?: number;
  documentId?: string;
  title?: string;
  slug?: string;
  description?: string;
  cover?: any;
  author?: {
    id?: number;
    name?: string;
    avatar?: any;
    attributes?: {
      name: string;
      avatar?: any;
    };
  };
  attributes?: {
    title: string;
    slug: string;
    description?: string;
    cover?: any;
    author?: {
      data?: {
        attributes?: {
          name: string;
          avatar?: any;
        };
      };
    };
  };
}

function extractCoverImage(cover: any): string | null {
  if (!cover) return null;
  
  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
  
  if (cover.url) {
    return cover.url.startsWith('http') ? cover.url : `${STRAPI_URL}${cover.url}`;
  }
  if (cover.data?.attributes?.url) {
    const url = cover.data.attributes.url;
    return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
  }
  if (cover.data?.url) {
    const url = cover.data.url;
    return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
  }
  if (Array.isArray(cover) && cover[0]) {
    if (cover[0].url) {
      const url = cover[0].url;
      return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
    }
    if (cover[0].attributes?.url) {
      const url = cover[0].attributes.url;
      return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
    }
  }
  if (Array.isArray(cover.data) && cover.data[0]?.attributes?.url) {
    const url = cover.data[0].attributes.url;
    return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
  }
  
  return null;
}

function extractAvatarImage(avatar: any): string | null {
  if (!avatar) return null;
  
  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
  
  if (avatar.url) {
    return avatar.url.startsWith('http') ? avatar.url : `${STRAPI_URL}${avatar.url}`;
  }
  if (avatar.data?.attributes?.url) {
    const url = avatar.data.attributes.url;
    return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
  }
  if (avatar.data?.url) {
    const url = avatar.data.url;
    return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
  }
  
  return null;
}

export default function SelectColumnForLinksPage() {
  const navigate = useNavigate();

  const { data: columns, isLoading } = useColumnsList({
    limit: 100,
    sort: 'title:asc',
    populate: ['author', 'author.avatar', 'cover'],
  });

  const validColumns =
    (columns?.data?.filter((column: any) => {
      const columnId = typeof column?.id === 'number' ? column.id : (column?.id ?? column?.documentId);
      return column && columnId;
    }) || []) as ColumnItem[];

  const columnOptions = validColumns
    .map((column) => {
      const columnId = typeof column?.id === 'number' ? column.id : (column?.id ?? column?.documentId);
      const title = column?.title ?? column?.attributes?.title;
      
      if (!columnId) return null;
      
      return {
        value: columnId,
        label: title || `Rubrica #${columnId}`,
      };
    })
    .filter((option): option is { value: string | number; label: string } => option !== null);

  const handleColumnSelect = (columnId: string | number | null) => {
    if (columnId) {
      navigate(`/columns/${columnId}/links`, { replace: false });
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
            Seleziona la Rubrica per Gestire i Link
          </h1>
        </div>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Scegli una rubrica dalla lista per aggiungere o modificare i suoi link
        </p>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : columnOptions.length === 0 ? (
          <div className="text-center py-12">
            <Columns className="mx-auto text-surface-400 dark:text-surface-500 mb-4" size={48} />
            <p className="text-surface-500 dark:text-surface-400 mb-4">
              Nessuna rubrica disponibile. Crea una rubrica prima di aggiungere link.
            </p>
            <Link
              to="/columns/new"
              className="btn-primary inline-block"
            >
              Crea Nuova Rubrica
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              {columnOptions.length > 0 ? (
                <>
                  <Select
                    label="Seleziona Rubrica"
                    value={null}
                    onChange={handleColumnSelect}
                    options={columnOptions}
                    placeholder="Scegli una rubrica dalla lista..."
                  />
                  <p className="mt-2 text-sm text-surface-400 dark:text-surface-500">
                    Seleziona una rubrica per gestire i suoi link. Verrai reindirizzato automaticamente alla pagina di gestione.
                  </p>
                </>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    Nessuna rubrica valida trovata.
                  </p>
                  <p className="text-xs text-yellow-700">
                    Rubriche totali: {columns?.data?.length || 0} | Rubriche valide: {validColumns.length}
                  </p>
                </div>
              )}
            </div>

            {validColumns.length > 0 && (
              <div className="pt-6 border-t border-surface-200 dark:border-surface-800">
                <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-4">
                  Rubriche disponibili ({validColumns.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {validColumns.map((column) => {
                    const columnId = typeof column?.id === 'number' ? column.id : (column?.id ?? column?.documentId);
                    const title = column?.title ?? column?.attributes?.title;
                    const description = column?.description ?? column?.attributes?.description;
                    const cover = column?.cover ?? column?.attributes?.cover;
                    const coverImageUrl = extractCoverImage(cover);
                    
                    let authorName: string | undefined;
                    let authorAvatar: any;
                    
                    if (column?.author) {
                      authorName = column.author.name;
                      authorAvatar = column.author.avatar;
                    } else if (column?.attributes?.author?.data?.attributes) {
                      authorName = column.attributes.author.data.attributes.name;
                      authorAvatar = column.attributes.author.data.attributes.avatar;
                    }
                    
                    const avatarImageUrl = extractAvatarImage(authorAvatar);
                    
                    return (
                      <Link
                        key={columnId}
                        to={`/columns/${columnId}/links`}
                        className="block rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-300 hover:shadow-md transition-all overflow-hidden bg-white group"
                      >
                        <div className="relative h-40 w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                          {coverImageUrl ? (
                            <img
                              src={coverImageUrl}
                              alt={title || 'Rubrica'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                              <Columns className="text-primary-400" size={48} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-surface-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                                {title || 'Senza titolo'}
                              </h4>
                              {description && (
                                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">
                                  {description}
                                </p>
                              )}
                              {authorName && (
                                <div className="flex items-center gap-2 mt-2">
                                  {avatarImageUrl ? (
                                    <img
                                      src={avatarImageUrl}
                                      alt={authorName}
                                      className="w-6 h-6 rounded-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                                      <span className="text-xs font-medium text-primary-600">
                                        {authorName.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <span className="text-xs text-surface-400 dark:text-surface-500">di {authorName}</span>
                                </div>
                              )}
                            </div>
                            <LinkIcon
                              size={18}
                              className="text-primary-600 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
