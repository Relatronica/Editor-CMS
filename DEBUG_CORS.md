# 🔍 Debug CORS - Verifica Step by Step

## Step 1: Verifica che il Redeploy sia Completato

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il tuo servizio backend
3. Vai su **Events** (menu laterale)
4. Verifica che l'ultimo deploy sia **completato** (status: "Live" o "Deployed")
5. Se è ancora in corso, aspetta che finisca (può richiedere 2-5 minuti)

## Step 2: Verifica le Variabili d'Ambiente in Render

1. Render Dashboard → Il tuo servizio → **Environment**
2. Verifica che esista:
   - `EDITOR_URL` = `https://capibara-cms.netlify.app`
   - ⚠️ **Senza spazi, senza trailing slash, esatto come scritto sopra**

## Step 3: Testa l'API Direttamente

Apri il terminale e esegui:

```bash
curl -v -H "Origin: https://capibara-cms.netlify.app" \
     -H "Authorization: Bearer IL_TUO_TOKEN" \
     https://capibara-1z0m.onrender.com/api/columns
```

Cerca nella risposta l'header:
```
Access-Control-Allow-Origin: https://capibara-cms.netlify.app
```

**Se NON vedi questo header**, significa che il backend non sta permettendo l'origine.

## Step 4: Verifica il File middlewares.ts nel Backend

Se hai accesso al codice del backend, verifica che il file `apps/cms/config/middlewares.ts` (o `config/middlewares.ts`) contenga:

```typescript
export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.EDITOR_URL || 'http://localhost:3001', // ⚠️ QUESTA RIGA DEVE ESSERCI!
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:1337',
      ],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

**Se manca `process.env.EDITOR_URL`**, devi:
1. Aggiungere quella riga
2. Fare commit e push del backend
3. Render farà un nuovo deploy automatico

## Step 5: Soluzione Alternativa - Aggiungi Direttamente l'URL

Se non puoi modificare il codice o se `process.env.EDITOR_URL` non funziona, puoi aggiungere direttamente l'URL nell'array:

```typescript
origin: [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.EDITOR_URL || 'http://localhost:3001',
  'https://capibara-cms.netlify.app', // ⚠️ AGGIUNGI QUESTA RIGA DIRETTAMENTE
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:1337',
],
```

Poi:
1. Commit e push del backend
2. Render farà un nuovo deploy

## Step 6: Verifica i Log del Backend

1. Render Dashboard → Il tuo servizio → **Logs**
2. Cerca errori o warning relativi a CORS o middlewares
3. Verifica che il backend si sia avviato correttamente

## Step 7: Hard Refresh del Browser

Dopo aver verificato tutto:
1. Apri il sito Netlify
2. Fai **Hard Refresh**: 
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`
3. Oppure apri in **modalità incognito**

## 🆘 Se Ancora Non Funziona

### Opzione A: Aggiungi anche FRONTEND_URL

In Render, aggiungi/modifica anche:
- `FRONTEND_URL` = `https://capibara-cms.netlify.app`

Alcune configurazioni Strapi usano `FRONTEND_URL` invece di `EDITOR_URL`.

### Opzione B: Contatta il Team Backend

Se non hai accesso al codice del backend, chiedi al team di:
1. Verificare che `middlewares.ts` supporti `EDITOR_URL`
2. Oppure aggiungere direttamente `https://capibara-cms.netlify.app` nell'array delle origini CORS

### Opzione C: Verifica Strapi Version

Alcune versioni di Strapi hanno configurazioni CORS diverse. Verifica la versione e la documentazione specifica.
