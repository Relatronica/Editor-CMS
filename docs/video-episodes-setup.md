# Setup Video Episodes

Guida per configurare il content type Video Episode in Strapi.

## Creare il Content Type in Strapi

1. Strapi Admin → **Content-Type Builder**
2. **Create new collection type** → Nome: `Video Episode` (API ID: `video-episode`)

### Campi da aggiungere

**Base:**
- `title` - Text (Short text, Required)
- `slug` - Text (Short text, Required, Unique)
- `description` - Rich text

**Media:**
- `video` - Media (Single, Type: Video, Required)
- `thumbnail` - Media (Single, Type: Image, Optional)

**Metadata:**
- `publishDate` - Date & time
- `duration` - Number (Integer) - Durata in minuti
- `episodeNumber` - Number (Integer)

**Relazioni:**
- `author` - Relation (Many-to-one con Author)

### Permessi

In **Settings → Roles**, abilita per Video Episode:
- find, findOne, create, update, delete (opzionale)

Per Upload:
- upload

## Componente VideoUpload

Caratteristiche:
- Supporto multi-formato: MP4, MOV, AVI, WebM
- Limite default: 500MB (configurabile con prop `maxSizeMB`)
- Preview video con player HTML5
- Upload diretto su Cloudinary (configurato in Strapi)

## Troubleshooting

| Problema | Soluzione |
|---|---|
| Video non si carica | Verifica permessi Upload in Strapi e connessione Cloudinary |
| Video non visibile dopo upload | Attendi completamento transcodifica Cloudinary |
| Upload molto lento | Normale per file grandi, Cloudinary transcodifica in background (5-15 min per HD/4K) |
