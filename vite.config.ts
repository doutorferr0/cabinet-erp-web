import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig, loadEnv } from 'vite'

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
function sufixoDeDemo(usuarioDemo: string | undefined): Plugin {
  return {
    name: 'cabinet-sufixo-de-demo',
    transformIndexHtml(html) {
      if (!usuarioDemo) return html
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
 * tem servidor no ar define `VITE_API_PROXY` — no `.env.local` ou exportada
 * antes do `pnpm dev`, as duas valem (ver `loadEnv` abaixo). Sem ela o desvio
 * não é montado.
 *
 * **Sem a variável, `/api` cai na SPA — e isso NÃO é sintoma honesto**, ao
 * contrário do que esta nota dizia: o fallback devolve `index.html` com status
 * **200**, e um 200 com HTML atravessa a fronteira como se fosse dado. Quem
 * recusa é `apiFetch` (`src/api/http.ts`), conferindo o `content-type` — o
 * contrato só devolve JSON. Ver issue #226.
 *
 * O mecanismo fica de pé porque é a metade `http` do toggle previsto
 * `VITE_API_MODE=mock|http`: no modo mock a camada em memória responde dentro do
 * browser e nada sai da origem; no modo http as mesmas rotas atravessam este
 * proxy. Muda o alvo, não a razão de existir (cookie de mesma origem, abaixo).
 */
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /**
   * `loadEnv`, e NÃO `process.env` — o `.env.local` não chega aqui sozinho.
   *
   * O Vite injeta arquivo `.env*` em `import.meta.env`, que é o lado do
   * CLIENTE. Este arquivo roda no Node, antes disso, e `process.env` só tem o
   * que o shell exportou. Enquanto a leitura era `process.env.VITE_API_PROXY`,
   * seguir a instrução do próprio `.env.example` (`cp .env.example .env.local`)
   * produzia o pior estado possível: `src/mocks/rotas-do-backend.ts` lê a MESMA
   * variável por `import.meta.env` — que enxerga o `.env.local` — então o MSW
   * LIBERAVA a passagem e o proxy não existia. `/api` e `/auth` caíam no
   * fallback da SPA e voltavam `index.html` **com status 200**, e o erro só
   * aparecia lá adiante como `empresas.find is not a function` (issue #226).
   *
   * A variável ser uma só era para as duas metades não divergirem; elas
   * divergiam assim mesmo, porque eram lidas de duas FONTES diferentes.
   * `loadEnv` faz as duas lerem a mesma coisa.
   *
   * O prefixo `VITE_` é o mesmo que o cliente enxerga: variável sem ele
   * continua fora daqui, como no resto do Vite. E `loadEnv` mantém a
   * precedência do shell — `VITE_API_PROXY=… pnpm dev` continua valendo e
   * ganha do arquivo, que é o que o `CLAUDE.md` documenta.
   */
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const BACKEND_DEV = env.VITE_API_PROXY

  return {
    plugins: [
      TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      sufixoDeDemo(env.VITE_DEMO_USER),
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
  }
})
