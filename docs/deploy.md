# Deploy Capibara Editor

Guida completa per il deploy della PWA Editor con backend Strapi su Render.

## Prerequisiti

- Node.js 20+
- npm 10+
- Backend Strapi deployato su Render (o altro hosting)
- Accesso a Strapi Admin

## 1. Creare l'API Token in Strapi

1. Accedi a Strapi Admin: `https://your-backend.onrender.com/admin`
2. Vai su **Settings → API Tokens → Create new API Token**
3. Configura:
   - **Name**: `Capibara Editor PWA`
   - **Token type**: `Full access` (o Custom con permessi specifici)
   - **Token duration**: `Unlimited`
4. **Copia il token subito** - non sarà più visibile dopo.

### Permessi Custom (opzionale)

Se preferisci un token con permessi limitati:

| Content Type | Create | Read | Update | Delete |
|---|---|---|---|---|
| Columns | yes | yes | yes | opzionale |
| Articles | yes | yes | yes | opzionale |
| Video Episodes | yes | yes | yes | opzionale |
| Events | yes | yes | yes | opzionale |
| Authors, Tags, Partners | - | yes | - | - |
| Upload | yes | - | - | - |

## 2. Configurare le variabili d'ambiente

Copia il template e inserisci i tuoi valori:

```bash
cp .env.example .env
```

Modifica `.env`:

```env
VITE_STRAPI_URL=https://your-backend.onrender.com
VITE_API_TOKEN=il-token-copiato
```

## 3. Test locale

```bash
npm install
npm run dev
```

Verifica che tutto funzioni su `http://localhost:3001`.

## 4. Deploy

### Opzione A: Netlify (attuale)

**Da CLI:**

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

**Da dashboard:**

1. Collega il repo GitHub su [Netlify](https://app.netlify.com)
2. Configura:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Vai su **Site settings → Environment variables** e aggiungi:
   - `VITE_STRAPI_URL` = URL del backend
   - `VITE_API_TOKEN` = token API
4. Triggera un nuovo deploy dopo aver aggiunto le variabili

### Opzione B: Vercel

```bash
npm i -g vercel
vercel
```

In Vercel Dashboard → **Settings → Environment Variables**, aggiungi `VITE_STRAPI_URL` e `VITE_API_TOKEN`, poi:

```bash
vercel --prod
```

### Opzione C: Render (Static Site)

1. Render Dashboard → **New+ → Static Site**
2. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Aggiungi le variabili d'ambiente

## 5. Configurare CORS nel backend

Dopo il deploy, il backend deve accettare richieste dall'URL della PWA.

1. Render Dashboard → servizio backend → **Environment**
2. Aggiungi:
   ```
   EDITOR_URL=https://your-editor-url.netlify.app
   ```
   (senza trailing slash)
3. Salva e attendi il redeploy automatico

Il file `config/middlewares.ts` del backend deve includere:

```typescript
origin: [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.EDITOR_URL || 'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:1337',
],
```

## 6. Verifica finale

- [ ] Login / accesso diretto funziona
- [ ] Dashboard mostra i contenuti
- [ ] Creazione contenuti funziona
- [ ] Upload immagini/video funziona
- [ ] Nessun errore CORS in console
