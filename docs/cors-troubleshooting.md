# Troubleshooting CORS

Guida per risolvere errori CORS tra la PWA Editor e il backend Strapi su Render.

## Sintomi

```
Origin https://your-site.netlify.app is not allowed by Access-Control-Allow-Origin
```

oppure

```
XMLHttpRequest cannot load ... due to access control checks
```

## Soluzione rapida

### 1. Aggiungi l'URL dell'editor in Render

1. [Render Dashboard](https://dashboard.render.com) → servizio backend → **Environment**
2. Aggiungi o modifica:
   ```
   EDITOR_URL=https://your-editor.netlify.app
   ```
   - Senza trailing slash (`/`)
   - Senza spazi
3. Salva. Render farà un redeploy automatico (2-3 minuti).

### 2. Verifica il file middlewares.ts del backend

Il file `config/middlewares.ts` deve contenere:

```typescript
{
  name: 'strapi::cors',
  config: {
    enabled: true,
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.EDITOR_URL || 'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:1337',
    ],
    credentials: true,
  },
},
```

Se manca `process.env.EDITOR_URL`, aggiungilo, commit e push.

### 3. Hard refresh del browser

- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`
- Oppure apri in modalità incognito

## Debug avanzato

### Testa l'API direttamente

```bash
curl -v -H "Origin: https://your-editor.netlify.app" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-backend.onrender.com/api/columns
```

Cerca nella risposta:
```
Access-Control-Allow-Origin: https://your-editor.netlify.app
```

Se non c'e', il backend non accetta quell'origine.

### Controlla i log del backend

Render Dashboard → servizio backend → **Logs**. Cerca errori relativi a CORS o middlewares.

### Verifica che il backend sia online

```bash
curl https://your-backend.onrender.com/api/columns
```

## Checklist

- [ ] `EDITOR_URL` configurato in Render (senza trailing slash)
- [ ] Redeploy completato (verifica in Events)
- [ ] `middlewares.ts` include `process.env.EDITOR_URL`
- [ ] Variabili `VITE_STRAPI_URL` e `VITE_API_TOKEN` corrette nel deploy
- [ ] Hard refresh del browser eseguito
