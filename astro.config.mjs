// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import robotsTxt from 'astro-robots-txt';
import vercelServerless from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
    site: 'https://shine-portfolio-puce.vercel.app',
  output: 'server',
  adapter: vercelServerless(),
  integrations: [sitemap(), robotsTxt()],
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      cssCodeSplit: false,
    },
    ssr: {
      noExternal: ['gsap']
    }
  }
});