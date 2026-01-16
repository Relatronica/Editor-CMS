# 🎥 Setup Video Episodes - Guida Completa

## ✅ Implementazione Completata

È stata aggiunta la funzionalità di gestione **Video Episodes** (Episodi Video) come sezione separata nella dashboard. Il componente utilizza **Cloudinary** (già configurato in Strapi) per la gestione, transcodifica e ottimizzazione automatica dei video.

---

## 📋 Configurazione Strapi (Backend)

### 1. Creare il Content Type "Video Episode"

1. Accedi a **Strapi Admin** → **Content-Type Builder**
2. Clicca **"Create new collection type"**
3. Nome: `Video Episode` (API ID: `video-episode`)
4. Clicca **"Continue"** e poi **"Finish"**

### 2. Aggiungere i Campi al Content Type "Video Episode"

Aggiungi i seguenti campi:

#### Campi Base:
- **Text** → `title` (Short text, Required)
- **Text** → `slug` (Short text, Required, Unique)
- **Rich text** → `description` (Long text)

#### Campi Media:
- **Media** → `video` (Single media, Type: Video, Required)
- **Media** → `thumbnail` (Single media, Type: Image, Optional)

#### Campi Metadata:
- **Date** → `publishDate` (Date & time)
- **Number** → `duration` (Integer, Optional) - Durata in minuti
- **Number** → `episodeNumber` (Integer, Optional) - Numero episodio

#### Relazioni:
- **Relation** → `author` (Many-to-one con `Author`)

### 3. Salvare il Content Type

Clicca **"Save"** per salvare tutte le modifiche.

### 4. Configurare i Permessi

1. Vai su **Settings** → **Users & Permissions Plugin** → **Roles**
2. Seleziona il ruolo appropriato (es. **Authenticated** o **Public**)
3. Nella sezione **Video Episode**, abilita:
   - ✅ **find**
   - ✅ **findOne**
   - ✅ **create**
   - ✅ **update**
   - ✅ **delete** (opzionale)
4. Nella sezione **Upload**, assicurati che sia abilitato:
   - ✅ **upload**

### 5. Verificare la Configurazione Cloudinary

Assicurati che Cloudinary sia configurato correttamente in Strapi:

1. Vai su **Settings** → **Plugins** → **Upload**
2. Verifica che **Cloudinary** sia selezionato come provider
3. Controlla le credenziali Cloudinary:
   - Cloud Name
   - API Key
   - API Secret

---

## 🎨 Funzionalità del Componente VideoUpload

### Caratteristiche

- ✅ **Supporto multi-formato**: MP4, MOV, AVI, WebM, e altri formati video
- ✅ **Validazione file**: Controlla tipo e dimensione (default: max 500MB)
- ✅ **Preview video**: Player HTML5 integrato con controlli
- ✅ **Upload automatico**: Integrazione diretta con Cloudinary
- ✅ **Transcodifica automatica**: Cloudinary ottimizza automaticamente i video
- ✅ **UI intuitiva**: Interfaccia coerente con il resto dell'applicazione

### Limitazioni Dimensione

Il componente permette video fino a **500MB** di default. Se necessario, puoi modificare il valore `maxSizeMB` nel componente:

```tsx
<VideoUpload
  maxSizeMB={1000} // Esempio: 1GB
  ...
/>
```

---

## 📝 Utilizzo nella Sezione Video Episodes

La sezione Video Episodes è disponibile nella Dashboard:

1. Dalla **Dashboard**, trova la card **"Video Episodes"**
2. Clicca su **"Nuovo"** per creare un nuovo episodio
3. Compila il form:
   - **Titolo** e **Slug** (obbligatori)
   - **Descrizione** (rich text)
   - **Video** (obbligatorio) - Carica il file video
   - **Thumbnail** (opzionale) - Immagine di anteprima
   - **Numero Episodio** e **Durata** (opzionali)
   - **Autore** e **Data di pubblicazione**
4. Clicca **"Salva"**
5. Il video verrà caricato su Cloudinary e ottimizzato automaticamente

---

## 🔧 Configurazioni Cloudinary Avanzate (Opzionale)

Se vuoi personalizzare la transcodifica video in Cloudinary, puoi configurare transformation presets:

1. Vai su **Cloudinary Dashboard** → **Settings** → **Upload presets**
2. Crea un preset personalizzato con:
   - **Resource type**: Video
   - **Format**: mp4 (o altri formati)
   - **Quality**: auto (ottimizzazione automatica)
   - **Bitrate**: auto
3. Usa il preset nel codice se necessario

---

## 🐛 Troubleshooting

### Il video non si carica

- ✅ Verifica i permessi in Strapi (Upload plugin)
- ✅ Controlla la connessione a Cloudinary
- ✅ Verifica che il file non superi il limite di dimensione
- ✅ Controlla i log di Strapi per errori specifici

### Il video non viene visualizzato dopo il caricamento

- ✅ Verifica che Cloudinary abbia completato la transcodifica
- ✅ Controlla che l'URL del video sia accessibile
- ✅ Verifica i permessi di visualizzazione in Cloudinary

### Upload molto lento

- ✅ Normale per file video di grandi dimensioni
- ✅ Cloudinary transcodifica automaticamente il video
- ✅ Il processo può richiedere 5-15 minuti per video HD/4K

---

## 📚 Struttura Implementata

```
src/
├── components/
│   ├── ui/
│   │   └── VideoUpload.tsx              # Componente caricamento video
│   └── forms/
│       └── VideoEpisodeForm.tsx         # Form per episodi video
├── pages/
│   ├── CreateVideoEpisode.tsx            # Pagina creazione episodio
│   ├── EditVideoEpisode.tsx             # Pagina modifica episodio
│   └── Dashboard.tsx                    # Dashboard con sezione Video Episodes
└── App.tsx                               # Route per video episodes
```

---

## ✨ Note Finali

- **Cloudinary** gestisce automaticamente:
  - Transcodifica in formati ottimizzati
  - Generazione di thumbnails
  - Streaming adattivo
  - Compressione intelligente

- I video episodes sono una **sezione separata** dagli articoli

- Ogni episodio può avere un **video principale** (obbligatorio) e una **thumbnail** (opzionale)

- Il componente VideoUpload è **riutilizzabile** - può essere integrato in altri form se necessario

---

## 🚀 Prossimi Passi

1. ✅ Crea il Content Type `Video Episode` in Strapi (vedi sopra)
2. ✅ Aggiungi tutti i campi necessari
3. ✅ Configura i permessi per il ruolo utilizzato
4. ✅ Verifica la configurazione Cloudinary
5. ✅ Testa la creazione di un episodio video di prova
6. ✅ Controlla che il video sia accessibile dopo il caricamento

Se hai bisogno di supporto o hai domande, fai riferimento alla documentazione di [Strapi](https://docs.strapi.io) e [Cloudinary](https://cloudinary.com/documentation).
