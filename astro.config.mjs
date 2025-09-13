// @ts-check
import { defineConfig } from 'astro/config';
import { imageService } from '@unpic/astro/service';

import sitemap from '@astrojs/sitemap';

import robotsTxt from 'astro-robots-txt';

// https://astro.build/config
export default defineConfig({
    site: 'https://www.example.com',
  image: {
      service: imageService(),
  },

  integrations: [sitemap(), robotsTxt()],
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      cssCodeSplit: false,
    }
  }
});