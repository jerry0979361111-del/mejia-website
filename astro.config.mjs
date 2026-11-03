// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mejia.au',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // sitemap-index.xml；上線時在 robots.txt 加上 Sitemap: https://mejia.au/sitemap-index.xml
  integrations: [sitemap({ filter: (page) => !page.includes('/favorites/') })],
});
