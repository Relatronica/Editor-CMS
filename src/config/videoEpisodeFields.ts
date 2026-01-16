/**
 * Configurazione dei nomi dei campi per Video Episode
 * 
 * IMPORTANTE: Assicurati che questi nomi corrispondano ESATTAMENTE
 * ai nomi dei campi configurati nel Content Type "Video Episode" in Strapi.
 * 
 * Per verificare i nomi corretti:
 * 1. Vai su Strapi Admin → Content-Type Builder
 * 2. Clicca su "Video Episode"
 * 3. Verifica il nome esatto di ogni campo (nella colonna "Name")
 */

export const VIDEO_EPISODE_FIELDS = {
  title: 'title',
  slug: 'slug',
  synopsis: 'synopsis',
  body: 'body',
  heroImage: 'heroImage',
  videoUrl: 'videoUrl',
  videoOrientation: 'videoOrientation',
  durationSeconds: 'durationSeconds',
  publishDate: 'publishDate',
  isPremium: 'isPremium',
  show: 'show',
  tags: 'tags',
  partners: 'partners',
  seo: 'seo',
} as const;
