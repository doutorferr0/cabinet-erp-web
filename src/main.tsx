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
