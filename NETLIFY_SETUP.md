# 🚀 Configurazione Netlify dopo il Deploy

## ✅ Step 1: Configurare le Variabili d'Ambiente

Dopo il deploy su Netlify, devi configurare le variabili d'ambiente:

1. **Vai su [Netlify Dashboard](https://app.netlify.com)**
2. **Seleziona il tuo sito**
3. Vai su **Site settings** → **Environment variables**
4. Clicca **Add a variable** e aggiungi:

### Variabili Richieste:

```
VITE_STRAPI_URL=https://capibara-1z0m.onrender.com
VITE_API_TOKEN=il-tuo-token-api-strapi
```

**⚠️ IMPORTANTE:**
- Sostituisci `https://capibara-1z0m.onrender.com` con l'URL reale del tuo backend Render
- Sostituisci `il-tuo-token-api-strapi` con il token API che hai configurato in Strapi
- Le variabili devono essere disponibili per **Production**, **Deploy previews** e **Branch deploys**

### Come trovare il Token API:

1. Vai su `https://tuo-backend.onrender.com/admin`
2. **Settings** → **API Tokens** → **Create new API Token**
3. Tipo: **Full access** (o Custom con permessi per Columns/Articles)
4. **Copia il token generato**

---

## ✅ Step 2: Trigger un Nuovo Deploy

Dopo aver aggiunto le variabili d'ambiente:

1. Vai su **Deploys** nel tuo sito Netlify
2. Clicca **Trigger deploy** → **Deploy site**
3. Oppure fai un commit vuoto e push per triggerare un nuovo deploy

**⚠️ IMPORTANTE:** Le variabili d'ambiente vengono caricate solo durante il build, quindi devi fare un nuovo deploy!

---

## ✅ Step 3: Aggiornare CORS nel Backend Render

Una volta che hai l'URL finale di Netlify (es: `https://tuo-sito.netlify.app`):

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il servizio Strapi (backend)
3. Vai su **Environment**
4. Aggiungi/modifica la variabile:

```
EDITOR_URL=https://tuo-sito.netlify.app
```

**⚠️ IMPORTANTE:**
- Usa l'URL completo senza trailing slash (`/`)
- Render farà un redeploy automatico dopo aver salvato

---

## 🔍 Verifica che Funzioni

1. Apri il sito Netlify deployato
2. Apri la **Console del Browser** (F12)
3. Verifica che non ci siano errori CORS o 401
4. Prova a creare/modificare un articolo o una rubrica

### Errori Comuni:

- **CORS Error**: Verifica che `EDITOR_URL` in Render sia corretto (senza trailing slash)
- **401 Unauthorized**: Verifica che `VITE_API_TOKEN` sia corretto in Netlify
- **403 Forbidden**: Controlla i permessi del token API in Strapi

---

## 📝 Checklist Finale

- [ ] Variabili d'ambiente configurate in Netlify (`VITE_STRAPI_URL` e `VITE_API_TOKEN`)
- [ ] Nuovo deploy fatto dopo aver aggiunto le variabili
- [ ] `EDITOR_URL` aggiornato in Render con l'URL di Netlify
- [ ] Testato che l'app funzioni correttamente
- [ ] Verificato che non ci siano errori nella console del browser

---

## 🆘 Problemi?

Se qualcosa non funziona:

1. **Verifica le variabili d'ambiente:**
   - Netlify Dashboard → Site settings → Environment variables
   - Assicurati che siano visibili per Production

2. **Controlla i log di build:**
   - Netlify Dashboard → Deploys → Seleziona un deploy → Build log
   - Verifica che il build sia completato con successo

3. **Verifica il backend:**
   - Controlla che il backend Render sia online
   - Testa l'API direttamente: `curl https://tuo-backend.onrender.com/api/columns`

4. **Verifica CORS:**
   - Controlla che `EDITOR_URL` in Render corrisponda esattamente all'URL di Netlify
   - Senza `http://` o `https://` nel backend, solo l'URL completo nel frontend
