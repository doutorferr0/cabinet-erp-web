import { RegiaoDeAvisos } from '@/components/cabinet/regiao-de-avisos'
import { repetirSeValeAPena } from '@/data/api-provider'
import { ThemeProvider } from '@/hooks/use-theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
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
      {/*
       * `reducedMotion="user"` é OBRIGATÓRIO e fica na raiz de propósito
       * (DoD da fase 1.6): com ele, quem marcou "reduzir movimento" no sistema
       * recebe a animação com duração zero, e nenhum componente precisa
       * lembrar de checar a preferência. Deixar a cargo de cada tela é como
       * se perde acessibilidade — basta um esquecimento.
       *
       * Este ERP é ferramenta de oito horas: movimento aqui é para dizer que
       * a tela trocou, não para enfeitar. Entrada de tela anima UMA vez; linha,
       * célula e input não animam nunca (§Motion).
       */}
      <MotionConfig reducedMotion="user">
        {/* RAC não precisa de provider de tooltip — o TooltipTrigger é local. */}
        <ThemeProvider>
          {children}
          {/* Fora de qualquer tela, e é o ponto: o aviso nasce na tela que SAI
              (o `Gravar` navega de volta para a listagem) e é lido na que
              entra. Dentro do `ThemeProvider` porque ele pinta com os tokens
              do tema ativo. */}
          <RegiaoDeAvisos />
        </ThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
