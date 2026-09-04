import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// O polyfill do Temporal e o CSS das libs de planning SAÍRAM daqui (#227).
//
// Ficavam globais porque, quando Libs-0 instalou as libs, nenhuma tela as
// montava — e o próprio comentário de então dizia que a troca era de quem
// viesse depois: "quando Libs-1/2/3 montarem os componentes, mover cada import
// para o módulo que o usa faz o Vite empacotá-lo no chunk daquela rota".
// Libs-1/2/3 montaram, e agora cada import mora no módulo que o usa —
// hoje só `features/planner` (tema do gantt). A porta do Schedule-X, que era a
// outra dona, SUMIU na D12: a agenda passou a usar o calendário do próprio
// sistema, e com ela foram embora o polyfill do Temporal e o tema da lib.
// Entrada global aqui = folha e polyfill em TODA página, inclusive na de
// login, por causa de duas telas.
import { configurarApi } from '@/api/cliente'
import { Providers } from '@/app/providers'
import { opcoesDoRouter } from '@/app/router'

// URL base + cookie de sessão (credentials: 'include') — sem isso o cliente
// gerado bateria na origem errada e o backend não veria a sessão.
configurarApi()

// Modo da API: `mock` = MSW responde no lugar do backend, com as semânticas do
// contrato sobre um store em memória (src/mocks/api). Enquanto o backend Node
// não existe, o DEV nasce em mock — o default mora AQUI (e não num .env)
// porque `.env.*` é gitignored neste repo; quando o backend chegar, um
// `.env.local` com VITE_API_MODE=http vira a chave, sem tocar código.
// O import é dinâmico de propósito — msw/faker ficam fora do bundle no modo
// http. `await` antes do render: tela montando antes do worker deixaria as
// primeiras consultas vazarem para a rede e falharem como bug de backend.
const modoDaApi = import.meta.env.VITE_API_MODE ?? (import.meta.env.DEV ? 'mock' : 'http')
if (modoDaApi === 'mock') {
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
  // 1ª visita a uma origem nova: o SW instala mas ainda NÃO controla a página.
  // Qualquer fetch nessa janela vaza pra rede e o fallback SPA do hosting
  // responde index.html 200 — o login "não acontece", em silêncio (medido no
  // demo público em 2026-08-06). Um reload único entrega a página já
  // controlada; a flag de sessão impede loop (ex: Ctrl+Shift+R, que carrega
  // sem controller por design do navegador).
  if (!navigator.serviceWorker.controller && !sessionStorage.getItem('msw-primeira-visita')) {
    sessionStorage.setItem('msw-primeira-visita', '1')
    window.location.reload()
    // Trava o boot: nada deve montar por cima de um reload já disparado.
    await new Promise(() => {})
  }
}

// A configuração mora em `@/app/router` para o TESTE montar o mesmo router que
// o app (ver o comentário de lá). Aqui entra só o que é do navegador.
const router = createRouter({ ...opcoesDoRouter })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
