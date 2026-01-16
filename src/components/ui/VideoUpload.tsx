import { useState, useRef } from 'react';
import { Upload, X, Loader2, Play, Film } from 'lucide-react';
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
  maxSizeMB = 500, // Default 500MB per video (Cloudinary può gestire file più grandi)
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Seleziona un file video valido (MP4, MOV, AVI, WebM, etc.)');
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Il file è troppo grande. Massimo ${maxSizeMB}MB`);
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Note: apiClient.upload doesn't support progress tracking directly
      // Cloudinary will handle the upload and transcoding
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

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}
      
      {value ? (
        <div className="relative">
          <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-300">
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
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
              title="Rimuovi video"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Video caricato su Cloudinary. La transcodifica potrebbe richiedere alcuni minuti per video di grandi dimensioni.
          </p>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isUploading
              ? 'border-primary-400 bg-primary-50 cursor-wait'
              : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer'
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
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="animate-spin text-primary-600" size={40} />
              <span className="text-sm font-medium text-gray-700">
                Upload in corso...
              </span>
              <span className="text-xs text-gray-500">
                Il caricamento potrebbe richiedere alcuni minuti per file grandi.
                <br />
                Cloudinary ottimizzerà automaticamente il video.
              </span>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="p-4 bg-primary-100 rounded-full">
                <Film className="text-primary-600" size={32} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 block mb-1">
                  Clicca per caricare un video
                </span>
                <span className="text-xs text-gray-500 block">
                  MP4, MOV, AVI, WebM (max {maxSizeMB}MB)
                </span>
                <span className="text-xs text-gray-400 block mt-1">
                  Il video verrà ottimizzato automaticamente da Cloudinary
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
          <X size={14} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
