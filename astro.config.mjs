// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import robotsTxt from 'astro-robots-txt';

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
    site: 'https://shine-portfolio-new.netlify.app',
  output: 'server',
  adapter: netlify(),
  integrations: [sitemap(), robotsTxt()],
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    define: {
      'process.env.RESEND_API_KEY': JSON.stringify(process.env.RESEND_API_KEY),
      'process.env.CSRF_SECRET': JSON.stringify(process.env.CSRF_SECRET),
    },
    build: {
      cssCodeSplit: false,
    },
    ssr: {
      noExternal: ['gsap']
    }
  }
});