import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// CSS das libs de planning (issue #227, trilho Libs-0). Entram AQUI e não numa
// tela porque nenhuma tela as monta ainda — este trilho só instala, e os
// trilhos Libs-1/2/3 é que trocam os componentes.
//
// Os dois arquivos foram conferidos ANTES de virarem global: nenhum tem
// seletor de elemento (`button`, `table`, `input`) nem toca `html`/`body`/`*`,
// e o único `:root` é o do schedule-x, com 30 propriedades TODAS prefixadas
// `--sx-`. CSS de lib importado global não fica dentro do componente — seria a
// aplicação inteira herdando o tema de outro design system.
//
// **Custo medido, e é decisão de quem vier depois:** juntos somam 66 KB brutos
// (~9 KB gzip) na folha única, em toda página, para libs que ainda não têm
// consumidor. Quando Libs-1/2/3 montarem os componentes, mover cada import
// para o módulo que o usa faz o Vite empacotá-lo no chunk daquela rota — o
// número acima é o que essa troca economiza.
//
// O especificador do SVAR é `style.css` e NÃO `dist/index.css`: o `exports` do
// pacote só publica `./style.css` (o tema do gantt) e `./all.css` (a suíte
// inteira). Apontar para o caminho de arquivo derruba o build — não é aviso, é
// erro de resolução. Fica `style.css` de propósito: `all.css` traz o CSS de
// grid, editor, menu e toolbar, que este trilho não vai montar.
import '@schedule-x/theme-default/dist/index.css'
import '@svar-ui/react-gantt/style.css'
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
