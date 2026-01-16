import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import ColumnForm from '../components/forms/ColumnForm';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ColumnFormData {
  title: string;
  slug: string;
  description: string;
  cover: { id: number; url: string } | null;
  author: number | null;
  links: Array<{ label: string; url: string; description?: string; publishDate?: string }>;
}

// Support both Strapi v4 (with attributes) and v5 (direct fields)
interface ColumnData {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  description?: string;
  cover?: any;
  author?: { data?: { id: number } } | number | null;
  links?: Array<{ label: string; url: string; description?: string; publishDate?: string }>;
  attributes?: Partial<ColumnFormData & { author?: { data?: { id: number } } }>;
}

interface ColumnResponse {
  data: ColumnData;
  meta?: any;
}

export default function EditColumnPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<ColumnResponse>({
    queryKey: ['columns', id],
    queryFn: () =>
      apiClient.findOne<ColumnData>('columns', id!, {
        populate: ['cover', 'author', 'links'],
      }) as Promise<ColumnResponse>,
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async (formData: {
      title: string;
      slug: string;
      description: string;
      cover: { id: number; url: string } | null;
      author: number | null;
      links: Array<{ label: string; url: string; description?: string; publishDate?: string }>;
    }) => {
      // IMPORTANTE: Protezione contro la cancellazione accidentale di link
      // Se il form ha meno link rispetto a quelli esistenti, potrebbe essere una perdita accidentale
      // (es: durante un'importazione parziale). In questo caso, preserviamo i link esistenti.
      const currentColumn = data?.data;
      const existingLinks = currentColumn?.links ?? currentColumn?.attributes?.links ?? [];
      const existingLinksArray = Array.isArray(existingLinks) ? existingLinks : [];
      
      // Formatta i link esistenti per il confronto
      const formattedExisting = existingLinksArray.map((link: any) => ({
        label: link?.label ?? link?.attributes?.label ?? '',
        url: link?.url ?? link?.attributes?.url ?? '',
        description: link?.description ?? link?.attributes?.description ?? null,
        publishDate: link?.publishDate ?? link?.attributes?.publishDate ?? null,
      }));

      // Se il form è vuoto o ha significativamente meno link, preserva quelli esistenti
      // Questo previene la cancellazione accidentale durante importazioni
      const formLinksCount = formData.links.filter(link => link.url && link.url.trim()).length;
      const existingLinksCount = formattedExisting.filter(link => link.url && link.url.trim()).length;
      
      let finalLinks: Array<{ label: string; url: string; description: string | null; publishDate: string | null }>;
      
      if (formLinksCount === 0 && existingLinksCount > 0) {
        // Form vuoto ma ci sono link esistenti: preserva quelli esistenti
        // Questo previene la cancellazione accidentale
        console.warn('⚠️ Form vuoto ma ci sono link esistenti. Preservando i link esistenti per sicurezza.');
        finalLinks = formattedExisting;
      } else if (formLinksCount < existingLinksCount * 0.5 && existingLinksCount > 3) {
        // Form ha meno della metà dei link esistenti: potrebbe essere una perdita accidentale
        // Preserva i link esistenti e aggiungi quelli del form
        console.warn('⚠️ Form ha significativamente meno link rispetto a quelli esistenti. Preservando i link esistenti.');
        const formLinkUrls = new Set(
          formData.links
            .filter(link => link.url && link.url.trim())
            .map(link => link.url.trim().toLowerCase())
        );
        
        // Preserva i link esistenti che non sono nel form
        const preservedLinks = formattedExisting.filter(existingLink => {
          const normalizedUrl = existingLink.url?.trim().toLowerCase();
          return !normalizedUrl || !formLinkUrls.has(normalizedUrl);
        });
        
        // Combina: link preservati + link dal form
        finalLinks = [
          ...preservedLinks,
          ...formData.links.map((link) => ({
            label: link.label,
            url: link.url,
            description: link.description || null,
            publishDate: link.publishDate || null,
          })),
        ];
        
        // Rimuovi duplicati (mantieni quello dal form se c'è conflitto)
        const uniqueLinksMap = new Map<string, typeof finalLinks[0]>();
        finalLinks.forEach(link => {
          if (link.url && link.url.trim()) {
            const normalizedUrl = link.url.trim().toLowerCase();
            if (!uniqueLinksMap.has(normalizedUrl) || formLinkUrls.has(normalizedUrl)) {
              uniqueLinksMap.set(normalizedUrl, link);
            }
          }
        });
        finalLinks = Array.from(uniqueLinksMap.values());
      } else {
        // Form ha un numero ragionevole di link: usa solo quelli del form
        // L'utente ha esplicitamente gestito i link
        finalLinks = formData.links.map((link) => ({
          label: link.label,
          url: link.url,
          description: link.description || null,
          publishDate: link.publishDate || null,
        }));
      }

      // Format data for Strapi API
      const data: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        links: finalLinks,
      };

      if (formData.cover) {
        data.cover = formData.cover.id;
      } else {
        // Non impostare a null se esiste già una cover - preservala
        // Solo se l'utente ha esplicitamente rimosso la cover, allora sarà null nel formData
        const currentCover = currentColumn?.cover ?? currentColumn?.attributes?.cover;
        if (!currentCover && formData.cover === null) {
          data.cover = null;
        }
        // Se c'è una cover esistente e formData.cover è null, non la sovrascriviamo
      }

      if (formData.author !== null && formData.author !== undefined) {
        data.author = formData.author;
      } else {
        // Preserva l'autore esistente se non specificato
        const currentAuthor = currentColumn?.author ?? currentColumn?.attributes?.author;
        if (currentAuthor) {
          const authorId = typeof currentAuthor === 'object' && 'data' in currentAuthor && currentAuthor.data
            ? (currentAuthor as { data: { id: number } }).data.id
            : typeof currentAuthor === 'number'
            ? currentAuthor
            : null;
          if (authorId) {
            data.author = authorId;
          }
        } else {
          data.author = null;
        }
      }

      return apiClient.update('columns', id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns'] });
      navigate('/');
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante il salvataggio. Riprova.'
      );
    },
  });

  const handleSubmit = async (formData: ColumnFormData) => {
    setError('');
    await mutation.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Rubrica non trovata
          </h2>
          <p className="text-gray-600 mb-4">
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
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          <span>Torna alla Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifica Rubrica</h1>
        <p className="text-gray-600 mt-1">
          Modifica i dettagli della rubrica
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <p className="text-sm text-red-800">{error}</p>
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
