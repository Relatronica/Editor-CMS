import { useState, useRef } from 'react';
import { X, Loader2, Film } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface VideoUploadProps {
  value?: { id: number; url: string } | null;
  onChange: (value: { id: number; url: string } | null) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export default function VideoUpload({
  value,
  onChange,
  label = 'Video',
  accept = 'video/*',
  maxSizeMB = 500,
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Seleziona un file video valido (MP4, MOV, AVI, WebM, etc.)');
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Il file è troppo grande. Massimo ${maxSizeMB}MB`);
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = await apiClient.upload(file);
      onChange(uploaded);
    } catch (err) {
      setError('Errore durante l\'upload del video. Riprova.');
      console.error('Video upload error:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError('');
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}
      
      {value ? (
        <div className="relative group">
          <div className="relative w-full bg-surface-900 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
            <video
              src={value.url}
              controls
              className="w-full h-auto max-h-96"
              preload="metadata"
            >
              Il tuo browser non supporta la riproduzione video.
            </video>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-lg opacity-80 group-hover:opacity-100"
              title="Rimuovi video"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-2 text-xs text-surface-400 dark:text-surface-500">
            Video caricato su Cloudinary. La transcodifica potrebbe richiedere alcuni minuti per video di grandi dimensioni.
          </p>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isUploading
              ? 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 cursor-wait'
              : 'border-surface-300 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={36} />
              <span className="text-sm font-medium text-surface-600 dark:text-surface-300">
                Upload in corso...
              </span>
              <span className="text-xs text-surface-400 dark:text-surface-500">
                Il caricamento potrebbe richiedere alcuni minuti per file grandi.
                <br />
                Cloudinary ottimizzerà automaticamente il video.
              </span>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-primary-600 dark:bg-primary-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-2xl">
                <Film className="text-primary-600 dark:text-primary-400" size={28} />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-surface-600 dark:text-surface-300 block">
                  Clicca per caricare un video
                </span>
                <span className="text-xs text-surface-400 dark:text-surface-500 block">
                  MP4, MOV, AVI, WebM (max {maxSizeMB}MB)
                </span>
                <span className="text-xs text-surface-400 dark:text-surface-500 block">
                  Il video verrà ottimizzato automaticamente da Cloudinary
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
          <X size={14} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
