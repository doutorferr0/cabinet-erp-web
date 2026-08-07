import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig } from 'vite'

/**
 * O título só ganha " — demo" no BUILD DEMO, e o gate é o MESMO que liga a
 * credencial única em `src/mocks/api/handlers.ts`: `VITE_DEMO_USER`.
 *
 * Escrever o sufixo direto no `index.html` deixaria "Cabinet — demo" na aba de
 * produção, porque `index.html` é um só para os dois builds. Um `%VITE_X%` no
 * HTML também não serve: quando a variável não existe o Vite deixa o literal na
 * página. Daqui o sufixo é condicional de verdade — sem a variável, o HTML sai
 * exatamente como está no arquivo.
 */
function sufixoDeDemo(): Plugin {
  return {
    name: 'cabinet-sufixo-de-demo',
    transformIndexHtml(html) {
      if (!process.env.VITE_DEMO_USER) return html
      return html.replace('<title>Cabinet</title>', '<title>Cabinet — demo</title>')
    },
  }
}

/**
 * Backend em desenvolvimento — endereço INTEIRAMENTE por env, sem padrão.
 *
 * O front é o dono do contrato (`contracts/openapi-v1.json`); quem o implementa
 * é um servidor externo que ainda não existe. Não há porta canônica para chutar,
 * e padrão inventado dá recusa de conexão com cara de configuração certa. Quem
 * tem servidor no ar exporta `VITE_API_PROXY` antes do `pnpm dev`; sem ela o
 * desvio não é montado e `/api` cai na SPA, que é o sintoma honesto de "não há
 * backend configurado".
 *
 * O mecanismo fica de pé porque é a metade `http` do toggle previsto
 * `VITE_API_MODE=mock|http`: no modo mock a camada em memória responde dentro do
 * browser e nada sai da origem; no modo http as mesmas rotas atravessam este
 * proxy. Muda o alvo, não a razão de existir (cookie de mesma origem, abaixo).
 */
const BACKEND_DEV = process.env.VITE_API_PROXY

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    sufixoDeDemo(),
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
     * A sessão é um cookie opaco (ADR-010, D2). Apontar o front direto para a
     * porta do backend faria toda chamada ser cross-origin, e aí o cookie
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
    proxy: BACKEND_DEV
      ? {
          '/api': { target: BACKEND_DEV, changeOrigin: true },
          '/auth': { target: BACKEND_DEV, changeOrigin: true },
        }
      : undefined,
  },
})
