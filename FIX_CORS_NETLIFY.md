# 🔧 Fix CORS per Netlify - Soluzione Rapida

## ❌ Problema

```
Origin https://capibara-cms.netlify.app is not allowed by Access-Control-Allow-Origin
```

Il backend su Render non permette richieste dal tuo sito Netlify.

## ✅ Soluzione in 2 Passi

### Step 1: Aggiungi URL Netlify in Render Dashboard

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il servizio **backend Strapi** (probabilmente `capibara-1z0m` o simile)
3. Vai su **Environment** (menu laterale sinistro)
4. Cerca la variabile `EDITOR_URL` o aggiungila se non esiste:
   - **Key**: `EDITOR_URL`
   - **Value**: `https://capibara-cms.netlify.app`
   - ⚠️ **IMPORTANTE**: Senza trailing slash (`/`) alla fine!

5. Clicca **Save Changes**

### Step 2: Attendi il Redeploy Automatico

Render farà un **redeploy automatico** quando salvi le variabili d'ambiente.

- Vai su **Events** per vedere lo stato del deploy
- Il redeploy richiede circa 2-3 minuti

## ✅ Verifica

Dopo il redeploy:

1. Ricarica il sito Netlify: https://capibara-cms.netlify.app
2. Apri la **Console del Browser** (F12)
3. Verifica che non ci siano più errori CORS
4. Le colonne dovrebbero caricarsi correttamente

## 🔍 Se Non Funziona

### Verifica 1: Controlla che la variabile sia corretta

In Render Dashboard → Environment, verifica che:
- `EDITOR_URL` = `https://capibara-cms.netlify.app` (esatto, senza `/` alla fine)
- Non ci siano spazi o caratteri strani

### Verifica 2: Controlla il file middlewares.ts nel backend

Se hai accesso al codice del backend, verifica che `apps/cms/config/middlewares.ts` contenga:

```typescript
origin: [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.EDITOR_URL || 'http://localhost:3001', // Questa riga è importante!
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:1337',
],
```

Se manca `process.env.EDITOR_URL`, aggiungila e fai commit + push del backend.

### Verifica 3: Testa l'API direttamente

```bash
curl -H "Origin: https://capibara-cms.netlify.app" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     https://capibara-1z0m.onrender.com/api/columns
```

Se vedi `Access-Control-Allow-Origin: https://capibara-cms.netlify.app` nella risposta, CORS è configurato correttamente.

## 📝 Checklist

- [ ] Variabile `EDITOR_URL` aggiunta in Render con valore `https://capibara-cms.netlify.app`
- [ ] Redeploy completato (verifica in Events)
- [ ] Sito Netlify ricaricato (hard refresh: Cmd+Shift+R)
- [ ] Console browser senza errori CORS
- [ ] Colonne caricate correttamente

## 🆘 Ancora Non Funziona?

1. **Verifica i log del backend Render**: Dashboard → Logs
2. **Controlla che il backend sia online**: `https://capibara-1z0m.onrender.com/api/columns`
3. **Verifica le variabili d'ambiente Netlify**: 
   - `VITE_STRAPI_URL` = `https://capibara-1z0m.onrender.com`
   - `VITE_API_TOKEN` = token corretto
4. **Fai un nuovo deploy Netlify** dopo aver verificato le variabili
