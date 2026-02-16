# Capibara Editor

PWA per l'inserimento e la gestione di contenuti nel CMS Strapi.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** per lo styling
- **TanStack Query** per data fetching e caching
- **Zustand** per lo state management
- **Tiptap** per il rich text editor
- **Workbox** per PWA e service worker

## Content Types

| Tipo | Descrizione |
|---|---|
| **Columns** (Rubriche) | Titolo, slug, descrizione, cover, autore, links |
| **Articles** | Titolo, slug, body (rich text), hero image, autore, tags, partners, SEO |
| **Video Episodes** | Titolo, slug, video (Cloudinary), thumbnail, autore, durata |
| **Events** | Gestione eventi con calendario |

## Quick Start

```bash
# Installa le dipendenze
npm install

# Copia e configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con URL backend e API token

# Avvia il server di sviluppo
npm run dev
```

L'app sara' disponibile su `http://localhost:3001`.

### Variabili d'ambiente

| Variabile | Descrizione |
|---|---|
| `VITE_STRAPI_URL` | URL del backend Strapi |
| `VITE_API_TOKEN` | Token API creato in Strapi Admin → Settings → API Tokens |
| `VITE_APP_ENV` | `development` o `production` |

## Struttura progetto

```
src/
├── components/
│   ├── editors/         # Rich text editor (Tiptap)
│   ├── forms/           # Form per ogni content type
│   └── ui/              # Componenti UI riutilizzabili (ImageUpload, VideoUpload, Select, MultiSelect)
├── config/              # Endpoint API e configurazioni
├── hooks/               # Custom hooks (useArticles, useColumns, useEvents, useVideoEpisodes)
├── lib/                 # API client e utilities
├── pages/               # Pagine dell'app (Dashboard, Create/Edit per ogni content type)
└── store/               # Zustand stores (auth, theme)
```

## Build

```bash
npm run build
```

I file compilati saranno in `dist/`.

## Documentazione

- [Deploy](docs/deploy.md) - Guida completa al deploy (Netlify, Vercel, Render)
- [CORS Troubleshooting](docs/cors-troubleshooting.md) - Risolvere errori CORS
- [Troubleshooting](docs/troubleshooting.md) - Problemi comuni e soluzioni
- [Video Episodes Setup](docs/video-episodes-setup.md) - Configurare Video Episodes in Strapi
- [Content Protection](docs/content-protection.md) - Protezioni contro sovrascritture e cancellazioni
