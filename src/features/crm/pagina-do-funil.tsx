import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFunis } from '@/data/crm-api'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { QuadroDoFunil } from './quadro-do-funil'

/**
 * A página do quadro: a ESCOLHA do funil em cima, o quadro embaixo.
 *
 * A empresa tem vários funis (modelos de venda distintos), e o funil escolhido
 * mora na URL — `/crm/funil/{id}`. Não é enfeite: o quadro é a tela que o
 * operador deixa aberta e manda por link, e um seletor só em estado local
 * devolveria o funil padrão a cada recarga.
 *
 * A escolha é uma fileira de botões, e não um combo: são poucos funis, todos
 * cabem à vista, e um clique basta. Combo esconderia a lista inteira atrás de
 * um clique para escolher entre dois.
 */
export function PaginaDoFunil({ pipelineId }: { pipelineId: string }) {
  const funis = useFunis()
  const atual = funis.data?.find((funil) => funil.id === pipelineId)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-lg font-bold">{atual?.name ?? 'Funil'}</h1>

        {funis.isPending ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          <nav aria-label="Funis" className="flex flex-wrap items-center gap-2">
            {(funis.data ?? []).map((funil) => (
              // `Link` do router com a pele do botão: o funil escolhido mora na
              // URL, então isto é NAVEGAÇÃO — botão com `onClick` que navega
              // perderia o meio-clique, o "abrir em nova aba" e o endereço na
              // barra de status.
              <Link
                key={funil.id}
                to="/crm/funil/$funilId"
                params={{ funilId: funil.id }}
                className={buttonVariants({
                  variant: funil.id === pipelineId ? 'default' : 'outline',
                  size: 'sm',
                })}
              >
                {funil.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Caminho para a configuração a partir de onde ela é sentida: quem vê
            uma etapa faltando no quadro está aqui, não no menu lateral. */}
        <Link
          to="/crm/funis"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto')}
        >
          Configurar funis
        </Link>
      </header>

      <QuadroDoFunil pipelineId={pipelineId} />
    </div>
  )
}
