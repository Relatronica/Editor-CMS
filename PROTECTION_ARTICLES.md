# Protezione Contenuti da Sovrascritture e Cancellazioni

## Problemi Identificati

### 1. Sovrascritture durante la Creazione
Quando si caricano contenuti sul CMS tramite processi di importazione, questi potrebbero sovrascrivere i contenuti inseriti manualmente se utilizzano lo stesso identificatore univoco:
- **Articoli**: sovrascritti se usano lo stesso **slug**
- **Colonne/Rubriche**: sovrascritte se usano lo stesso **slug**
- **Link nelle colonne**: duplicati o sovrascritti se hanno la stessa **URL**

### 2. Cancellazioni durante gli Aggiornamenti ⚠️ **CRITICO**
**Problema principale**: Quando si aggiorna un contenuto, Strapi usa `PUT` che **sostituisce completamente** l'entità. Se un campo non è incluso nella richiesta di aggiornamento, viene **cancellato**.

**Casi problematici**:
- Se un processo di importazione fa UPDATE parziale (es: aggiorna solo il titolo), tutti gli altri campi vengono cancellati
- Se il form non include tutti i link esistenti, questi vengono persi
- Se campi opzionali (tags, partners, SEO) non sono nel form, vengono cancellati
- Se l'heroImage o l'author non sono specificati, vengono rimossi

**Sintomo**: Gli utenti vedono contenuti che "spariscono" dopo un caricamento/importazione.

## Soluzioni Implementate

### Protezione da Cancellazioni durante UPDATE

### 1. Protezione Articoli

#### Controllo Pre-Creazione
Nel file `src/pages/CreateArticle.tsx` è stato aggiunto un controllo che verifica se esiste già un articolo con lo stesso slug prima di creare un nuovo articolo. Se lo slug esiste già, viene mostrato un errore che impedisce la creazione.

#### Avviso in Tempo Reale
Nel form di creazione articolo (`src/components/forms/ArticleForm.tsx`) è stato aggiunto:
- Un controllo in tempo reale (con debounce di 500ms) che verifica se lo slug esiste già
- Un avviso visivo se lo slug è già in uso
- Un indicatore di disponibilità se lo slug è libero

### 2. Protezione Colonne/Rubriche

#### Controllo Pre-Creazione
Nel file `src/pages/CreateColumn.tsx` è stato aggiunto lo stesso controllo per le colonne, verificando se esiste già una colonna con lo stesso slug.

#### Avviso in Tempo Reale
Nel form di creazione colonna (`src/components/forms/ColumnForm.tsx`) è stato aggiunto:
- Un controllo in tempo reale che verifica se lo slug esiste già
- Un avviso visivo se lo slug è già in uso
- Un indicatore di disponibilità se lo slug è libero

### 3. Protezione Link nelle Colonne

#### Controllo Link Duplicati
Nel form di gestione link (`src/pages/ManageColumnLinks.tsx` e `src/components/forms/ColumnForm.tsx`) è stato aggiunto:
- Verifica che non ci siano link duplicati con la stessa URL all'interno della stessa colonna
- Verifica che i nuovi link non abbiano URL già presenti nei link esistenti
- Avviso visivo in tempo reale per link con URL duplicati
- Blocco del salvataggio se ci sono duplicati

### 4. Protezione da Cancellazioni durante UPDATE ⚠️ **CRITICO**

#### Per Colonne (`EditColumn.tsx`)
- **Preservazione Link**: Se il form è vuoto o ha significativamente meno link rispetto a quelli esistenti, i link esistenti vengono preservati
- **Logica Intelligente**: 
  - Se form vuoto → preserva tutti i link esistenti
  - Se form ha < 50% dei link esistenti → preserva i link non nel form
  - Altrimenti → usa solo i link del form (utente ha gestito esplicitamente)
- **Preservazione Cover e Author**: Se non specificati nel form, vengono preservati quelli esistenti

#### Per Articoli (`EditArticle.tsx`)
- **Preservazione Campi Opzionali**: 
  - `tags` e `partners`: se il form è vuoto ma ci sono tag/partner esistenti, vengono preservati
  - `heroImage`: se non specificato, preserva quello esistente
  - `author`: se non specificato, preserva quello esistente
  - `seo`: se non nel form, preserva tutti i dati SEO esistenti
- **Protezione da Perdite Accidentali**: Previene la cancellazione di dati durante importazioni parziali

## Come Funziona

### Articoli e Colonne
1. **Durante la digitazione dello slug**: Il sistema verifica automaticamente (dopo 500ms di inattività) se lo slug esiste già
2. **Prima della creazione**: Viene eseguito un controllo finale per assicurarsi che lo slug non esista
3. **Se lo slug esiste**: Viene mostrato un errore che impedisce la creazione e suggerisce di modificare lo slug

### Link nelle Colonne
1. **Durante la digitazione dell'URL**: Il sistema verifica in tempo reale se l'URL è già presente in altri link
2. **Prima del salvataggio**: Viene eseguito un controllo completo per:
   - Verificare duplicati tra i nuovi link
   - Verificare se gli URL dei nuovi link esistono già nei link della colonna
3. **Se ci sono duplicati**: Viene mostrato un errore che impedisce il salvataggio

## Importante: Verifica Processi di Importazione

Se hai processi di importazione esterni (script, webhook, API) che importano contenuti nel CMS, **verifica che**:

### Per Articoli e Colonne:
1. **Non facciano UPDATE invece di CREATE** quando trovano uno slug esistente
2. **Utilizzino un identificatore univoco diverso dallo slug** (es: ID esterno, UUID)
3. **Verifichino se il contenuto esiste già** prima di procedere con l'importazione

### Per Link nelle Colonne:
1. **Non sostituiscano l'intero array di link** ma aggiungano solo nuovi link
2. **Verifichino se un link con la stessa URL esiste già** prima di aggiungerlo
3. **Non sovrascrivano link esistenti** con nuovi dati

### Esempio di Logica Sicura per Importazione

#### Articoli e Colonne
```javascript
// ❌ SBAGLIATO - Sovrascrive contenuti esistenti
async function importContent(contentData) {
  const existing = await findContentBySlug(contentData.slug);
  if (existing) {
    return updateContent(existing.id, contentData); // SOVRASCRIVE!
  }
  return createContent(contentData);
}

// ✅ CORRETTO - Non sovrascrive, crea solo se non esiste
async function importContent(contentData) {
  const existing = await findContentBySlug(contentData.slug);
  if (existing) {
    console.warn(`Contenuto con slug "${contentData.slug}" già esistente. Saltato.`);
    return existing; // Non sovrascrive
  }
  return createContent(contentData);
}

// ✅ ANCORA MEGLIO - Usa un identificatore esterno univoco
async function importContent(contentData) {
  // Usa un campo esterno (es: externalId) invece dello slug
  const existing = await findContentByExternalId(contentData.externalId);
  if (existing) {
    // Aggiorna solo se necessario, senza sovrascrivere dati manuali
    return updateContentSafely(existing.id, contentData);
  }
  return createContent(contentData);
}
```

#### Link nelle Colonne
```javascript
// ❌ SBAGLIATO - Sostituisce tutti i link esistenti
async function importLinks(columnId, newLinks) {
  return updateColumn(columnId, { links: newLinks }); // SOVRASCRIVE TUTTI I LINK!
}

// ✅ CORRETTO - Aggiunge solo nuovi link, senza duplicati
async function importLinks(columnId, newLinks) {
  const column = await getColumn(columnId);
  const existingLinks = column.links || [];
  const existingUrls = new Set(
    existingLinks.map(link => link.url.toLowerCase().trim())
  );
  
  // Filtra solo i link con URL non esistenti
  const linksToAdd = newLinks.filter(link => {
    const normalizedUrl = link.url.toLowerCase().trim();
    if (existingUrls.has(normalizedUrl)) {
      console.warn(`Link con URL "${link.url}" già esistente. Saltato.`);
      return false;
    }
    return true;
  });
  
  if (linksToAdd.length === 0) {
    console.log('Nessun nuovo link da aggiungere.');
    return column;
  }
  
  // Aggiungi solo i nuovi link, preservando quelli esistenti
  return updateColumn(columnId, {
    links: [...existingLinks, ...linksToAdd]
  });
}
```

## Verifica Manuale

Per verificare se ci sono contenuti con identificatori duplicati, puoi:

1. **Articoli e Colonne**: Controllare nel database Strapi se ci sono slug duplicati
2. **Link**: Verificare se ci sono link con la stessa URL nella stessa colonna
3. Verificare i log del processo di importazione
4. Controllare se i contenuti inseriti manualmente sono stati modificati dopo un'importazione

## Note

### Articoli e Colonne
- Il controllo funziona solo per **nuovi contenuti** (non in modalità modifica)
- Il controllo richiede almeno 3 caratteri nello slug per evitare chiamate inutili
- In caso di errori di rete durante la verifica, il sistema continua comunque (non blocca la creazione)

### Link
- Il controllo dei link duplicati funziona sia in creazione che in modifica
- Il controllo verifica sia i link nuovi che quelli esistenti
- Gli URL vengono normalizzati (trim + lowercase) per il confronto
- Il salvataggio viene bloccato se ci sono duplicati

### Protezione da Cancellazioni
- **Colonne**: I link esistenti vengono preservati se il form è vuoto o ha meno del 50% dei link esistenti
- **Articoli**: I campi opzionali (tags, partners, SEO, heroImage, author) vengono preservati se non nel form
- **Importante**: Questa protezione previene la cancellazione accidentale durante importazioni parziali, ma permette ancora all'utente di rimuovere esplicitamente contenuti dal form
