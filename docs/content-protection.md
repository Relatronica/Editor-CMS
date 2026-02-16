# Protezione Contenuti

Documentazione sulle protezioni implementate contro sovrascritture e cancellazioni accidentali.

## Problema

Strapi usa `PUT` per gli aggiornamenti, che **sostituisce completamente** l'entita'. Se un campo non e' incluso nella richiesta, viene cancellato. Questo causa la perdita di dati durante importazioni parziali o salvataggi incompleti.

## Protezioni implementate

### Slug duplicati (Articoli e Colonne)

- **Controllo in tempo reale** (debounce 500ms) durante la digitazione dello slug
- **Verifica pre-creazione** prima del submit
- Avviso visivo se lo slug e' gia' in uso

File coinvolti: `CreateArticle.tsx`, `CreateColumn.tsx`, `ArticleForm.tsx`, `ColumnForm.tsx`

### Link duplicati (Colonne)

- Verifica URL duplicati tra i nuovi link
- Verifica che i nuovi URL non esistano gia' nei link della colonna
- Blocco del salvataggio se ci sono duplicati

File coinvolti: `ManageColumnLinks.tsx`, `ColumnForm.tsx`

### Preservazione dati durante UPDATE

#### Colonne (`EditColumn.tsx`)

| Condizione | Comportamento |
|---|---|
| Form link vuoto, link esistenti presenti | Preserva tutti i link esistenti |
| Form ha < 50% dei link esistenti (e > 3 esistenti) | Merge: preserva link non nel form + link del form |
| Altrimenti | Usa solo i link del form |

Cover e Author vengono preservati se non specificati nel form.

#### Articoli (`EditArticle.tsx`)

Campi protetti:
- **tags**: se form vuoto ma tag esistenti → preservati
- **partners**: se form vuoto ma partner esistenti → preservati
- **heroImage**: se non specificato → preserva quello esistente
- **author**: se non specificato → preserva quello esistente
- **seo**: se non nel form → preserva i dati SEO esistenti

## Raccomandazioni per importazioni esterne

Se hai script o webhook che importano contenuti:

1. **Verifica se il contenuto esiste** prima di creare (evita duplicati)
2. **Non fare UPDATE parziali** - includi sempre tutti i campi
3. **Fai merge intelligente** invece di sostituzione completa
4. **Usa PATCH invece di PUT** se supportato

```javascript
// Esempio di import sicuro
async function safeImport(contentData) {
  const existing = await findBySlug(contentData.slug);
  if (existing) {
    console.warn(`"${contentData.slug}" gia' esistente, saltato.`);
    return existing;
  }
  return create(contentData);
}
```
