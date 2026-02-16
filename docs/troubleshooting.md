# Troubleshooting

## Errore 401 Unauthorized
- Verifica che `VITE_API_TOKEN` sia corretto in `.env`
- Controlla che il token non sia scaduto in Strapi Admin

## Errore 403 Forbidden
- Controlla i permessi dell'API Token in Strapi
- Verifica che il token abbia accesso ai content types necessari (Columns, Articles, Video Episodes, Events)

## Upload immagini non funziona
- Verifica che Cloudinary sia configurato in Strapi
- Controlla i permessi di Upload per il token API

## Errori CORS
Vedi [cors-troubleshooting.md](./cors-troubleshooting.md).

## Lista autori vuota

Possibili cause:

1. **Permessi API Token** (piu' probabile): il token non ha permessi Read per Author
   - Strapi Admin → Settings → API Tokens → verifica permessi Read su Author

2. **Autori in Draft**: l'app usa `publicationState: 'preview'` per incluere anche i draft

3. **Formato risposta API diverso**: apri la console del browser (F12) e cerca log `Authors data:` per verificare la struttura

### Verifica diretta

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-backend.onrender.com/api/authors?publicationState=preview
```
