import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface ImageUploadProps {
  value?: { id: number; url: string } | null;
  onChange: (value: { id: number; url: string } | null) => void;
  label?: string;
  accept?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Immagine',
  accept = 'image/*',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Seleziona un file immagine valido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Il file è troppo grande. Massimo 10MB');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const uploaded = await apiClient.upload(file);
      onChange(uploaded);
    } catch (err) {
      setError('Errore durante l\'upload. Riprova.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
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
          <div className="relative w-full h-48 bg-surface-100 dark:bg-surface-800 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
            <img
              src={value.url}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md opacity-80 group-hover:opacity-100"
              title="Rimuovi immagine"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all duration-200"
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
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={28} />
              <span className="text-sm text-surface-500 dark:text-surface-400">Upload in corso...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-xl">
                <Upload className="text-surface-400" size={24} />
              </div>
              <span className="text-sm font-medium text-surface-600 dark:text-surface-300">
                Clicca per caricare un'immagine
              </span>
              <span className="text-xs text-surface-400 dark:text-surface-500">
                JPG, PNG o GIF (max 10MB)
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
