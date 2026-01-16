# Analisi Problema Cancellazione Contenuti

## Problema Segnalato

Gli utenti segnalano che alcuni contenuti "spariscono" dopo il caricamento/importazione, anche se riescono ad aggiungere nuovi contenuti.

## Analisi del Problema

### Causa Principale: Strapi PUT Request

Strapi usa `PUT` per gli aggiornamenti, che **sostituisce completamente** l'entità. Questo significa:

1. **Se un campo non è incluso nella richiesta UPDATE, viene cancellato**
2. **Se un array (come `links`) viene inviato parzialmente, gli elementi mancanti vengono persi**
3. **Se un campo opzionale non è nel payload, viene impostato a `null` o `[]`**

### Scenari Problematici

#### Scenario 1: Importazione Parziale
```javascript
// ❌ SBAGLIATO - Cancella tutti i link esistenti
async function importColumn(columnId, partialData) {
  return updateColumn(columnId, {
    title: partialData.title,
    // links non incluso → CANCELLATI!
  });
}
```

#### Scenario 2: Form Incompleto
```javascript
// Se il form non carica tutti i link esistenti
// e l'utente salva, i link mancanti vengono cancellati
const formData = {
  title: "Nuovo Titolo",
  links: [/* solo alcuni link, altri mancanti */]
};
updateColumn(id, formData); // Link mancanti → CANCELLATI!
```

#### Scenario 3: Campi Opzionali
```javascript
// Se tags/partners/SEO non sono nel form
updateArticle(id, {
  title: "Nuovo Titolo",
  // tags, partners, seo non inclusi → CANCELLATI!
});
```

## Soluzioni Implementate

### 1. Protezione Link nelle Colonne

**File**: `src/pages/EditColumn.tsx`

**Logica**:
- Se form vuoto → preserva tutti i link esistenti
- Se form ha < 50% dei link esistenti → preserva i link non nel form
- Altrimenti → usa solo i link del form (utente ha gestito esplicitamente)

**Codice**:
```typescript
const formLinksCount = formData.links.filter(link => link.url && link.url.trim()).length;
const existingLinksCount = formattedExisting.filter(link => link.url && link.url.trim()).length;

if (formLinksCount === 0 && existingLinksCount > 0) {
  // Preserva tutti i link esistenti
  finalLinks = formattedExisting;
} else if (formLinksCount < existingLinksCount * 0.5 && existingLinksCount > 3) {
  // Preserva i link esistenti non nel form
  // Combina preservati + form
} else {
  // Usa solo i link del form
  finalLinks = formData.links;
}
```

### 2. Protezione Campi Opzionali negli Articoli

**File**: `src/pages/EditArticle.tsx`

**Campi Protetti**:
- `tags`: Se form vuoto ma ci sono tag esistenti → preservati
- `partners`: Se form vuoto ma ci sono partner esistenti → preservati
- `heroImage`: Se non specificato → preserva quello esistente
- `author`: Se non specificato → preserva quello esistente
- `seo`: Se non nel form → preserva tutti i dati SEO esistenti

**Codice**:
```typescript
// Esempio per tags
if (formData.tags.length > 0) {
  data.tags = formData.tags;
} else {
  // Preserva tags esistenti se form è vuoto
  const currentTags = currentAttrs?.tags;
  if (currentTags && Array.isArray(currentTags) && currentTags.length > 0) {
    data.tags = extractTagIds(currentTags);
  } else {
    data.tags = [];
  }
}
```

## Verifica

### Come Testare

1. **Test Link Colonne**:
   - Crea una colonna con 5 link
   - Modifica la colonna e rimuovi 2 link dal form
   - Salva → I 3 link rimanenti devono essere preservati
   - Modifica la colonna e lascia il form vuoto
   - Salva → Tutti i 5 link devono essere preservati

2. **Test Articoli**:
   - Crea un articolo con tags, partners, SEO
   - Modifica l'articolo senza toccare questi campi
   - Salva → Tutti i campi devono essere preservati

3. **Test Importazione Parziale**:
   - Crea un articolo/colonna con contenuti
   - Simula un'importazione che aggiorna solo il titolo
   - Verifica che tutti gli altri campi siano preservati

## Note Importanti

1. **Bilanciamento**: La protezione previene cancellazioni accidentali, ma permette ancora all'utente di rimuovere esplicitamente contenuti dal form

2. **Performance**: La logica di preservazione aggiunge un leggero overhead, ma è necessario per la sicurezza dei dati

3. **Compatibilità**: Le modifiche sono retrocompatibili e non influenzano il comportamento normale del form

4. **Logging**: I casi sospetti vengono loggati nella console per debugging:
   - `⚠️ Form vuoto ma ci sono link esistenti`
   - `⚠️ Form ha significativamente meno link rispetto a quelli esistenti`

## Raccomandazioni per Processi di Importazione

Se hai processi di importazione esterni, assicurati che:

1. **Usino PATCH invece di PUT** (se supportato da Strapi)
2. **Includano tutti i campi esistenti** nell'UPDATE
3. **Facciano merge intelligente** invece di sostituzione completa
4. **Verifichino i dati esistenti** prima di aggiornare

### Esempio Sicuro
```javascript
async function safeUpdateColumn(columnId, newData) {
  // 1. Recupera dati esistenti
  const existing = await getColumn(columnId);
  
  // 2. Merge intelligente
  const mergedData = {
    ...existing,
    ...newData,
    // Preserva array esistenti se non specificati
    links: newData.links ?? existing.links,
  };
  
  // 3. Aggiorna
  return updateColumn(columnId, mergedData);
}
```
