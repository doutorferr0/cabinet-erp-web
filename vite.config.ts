import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Backend em desenvolvimento — a porta que o `docs/ligar-com-o-front.md` do
 * `vitra-erp-dotnet` publica. É a fonte certa: o `launchSettings.json` tem dois
 * perfis com portas diferentes, e quem diz onde o backend atende para o front é
 * o documento que o backend escreveu para o front.
 *
 * Quem sobe o backend em outra porta ou host exporta `VITE_API_PROXY` antes do
 * `pnpm dev`; o padrão cobre o caso comum sem exigir `.env`.
 */
const BACKEND_DEV = process.env.VITE_API_PROXY ?? 'http://localhost:5199'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    /**
     * PROXY — o dev roda MESMA ORIGEM, e isso não é conveniência: é o que faz a
     * sessão funcionar.
     *
     * A sessão é um cookie opaco (ADR-010, D2). Apontar o front direto para
     * `http://localhost:5199` faria toda chamada ser cross-origin, e aí o cookie
     * depende de `SameSite=None; Secure` + CORS com `Allow-Credentials` — três
     * coisas que teriam de valer em desenvolvimento e mudariam em produção.
     * Atravessando o servidor do Vite, `/api` e `/auth` saem da MESMA origem que
     * a página, o cookie viaja sozinho e o dev se parece com a implantação.
     *
     * Por isso `configurarApi()` não precisa de `VITE_API_URL`: a base fica em
     * `/` (mesma origem) e o proxy resolve o destino.
     *
     * Só `/api` e `/auth` são desviados — são os dois prefixos do contrato. As
     * rotas da SPA (`/login`, `/cadastros/...`) continuam com o Vite.
     */
    proxy: {
      '/api': { target: BACKEND_DEV, changeOrigin: true },
      '/auth': { target: BACKEND_DEV, changeOrigin: true },
    },
  },
})
