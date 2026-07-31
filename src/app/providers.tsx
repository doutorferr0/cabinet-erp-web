import { TooltipProvider } from '@/components/ui/tooltip'
import { repetirSeValeAPena } from '@/data/api-provider'
import { ThemeProvider } from '@/hooks/use-theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * Era `Infinity` porque mock não muda sozinho. Com backend real isso
             * passou a ser mentira: sessão expira, empresa ativa muda e lista de
             * apoio recebe item novo — nada disso chegaria à tela enquanto ela
             * estivesse montada.
             *
             * 30s é o degrau entre "cada montagem de tela refaz a consulta"
             * (custo por navegação, sem ganho: o operador não trocou de aba nesse
             * intervalo) e dado velho na mesa. Consulta que precisa ser fresca na
             * hora usa `invalidateQueries` — é o que a troca de empresa faz.
             */
            staleTime: 30_000,
            // Foco de janela não é sinal de dado velho num ERP de mesa: o
            // operador alterna com planilha e PDF o tempo todo.
            refetchOnWindowFocus: false,
            /**
             * Repetir 4xx é esperar por uma resposta que não vai mudar: a tela
             * ficaria ~7s em esqueleto para exibir o que o servidor já disse na
             * primeira vez (409 "escolha uma empresa" é o caso do dia). 5xx e
             * rede continuam repetindo — ver `repetirSeValeAPena`.
             */
            retry: repetirSeValeAPena,
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
