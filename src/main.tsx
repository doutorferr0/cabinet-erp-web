import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { configurarApi } from '@/api/cliente'
import { Providers } from '@/app/providers'
import { routeTree } from './routeTree.gen'

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

const router = createRouter({ routeTree })

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
