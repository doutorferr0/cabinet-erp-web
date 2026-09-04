import { itemDaRota } from '@/app/navigation'
import { buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { Link, useRouterState } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'

/**
 * Guarda de RECURSO: tela de módulo que a empresa ativa não opera não renderiza.
 *
 * Esconder o item na barra lateral não basta — o endereço continua digitável, e
 * fica na mão do operador que salvou o link de `Fornecedores` na outra empresa.
 * Sem guarda, a tela abriria, consultaria e mostraria lista vazia: "a empresa
 * não opera compras" e "não há fornecedor cadastrado" viram a mesma imagem, que
 * é exatamente a confusão que o projeto proíbe.
 *
 * A regra é lida de `itemDaRota` + `gruposVisiveis` — a MESMA tabela que monta o
 * menu. Duas listas separadas divergiriam no primeiro item novo.
 *
 * Enquanto os vínculos não chegam, nem afirma nem nega: mostra esqueleto. Negar
 * antes de saber piscaria "indisponível" em toda navegação para tela gated.
 */
export function RequireRecurso({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const item = itemDaRota(location.pathname)
  const { tem, conhecido } = useRecursosDaEmpresa()

  if (!item?.recurso) return children
  if (!conhecido) return <Skeleton className="h-40 w-full" />
  if (tem(item.recurso)) return children

  return <RecursoIndisponivel titulo={item.title} />
}

/**
 * Não é erro e não é 404: o endereço existe, a empresa é que não o opera.
 *
 * Por isso o sinal é o da EMPRESA (soft blue), não o vermelho do 404 nem o
 * tomate da indisponibilidade de rede — a frase que a tela precisa dizer é
 * "isto é sobre em que empresa você está", e a saída oferecida é justamente
 * trocar de empresa, no rodapé da barra lateral.
 */
function RecursoIndisponivel({ titulo }: { titulo: string }) {
  const { empresas, ativa } = useEmpresasDaSessao()
  const outras = empresas.filter((e) => e.tenantId !== ativa?.tenantId).length

  return (
    <Empty className="py-16">
      <EmptyMedia>
        <Building2 className="text-empresa" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{titulo} não faz parte desta empresa</EmptyTitle>
        <EmptyDescription>
          {ativa
            ? `${ativa.name} não opera este cadastro.`
            : 'A empresa ativa não opera este cadastro.'}{' '}
          {outras > 0
            ? 'Se você procura este dado em outra empresa, troque a empresa ativa no rodapé do menu.'
            : 'Nenhuma outra empresa vinculada a este usuário oferece este cadastro.'}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          Ir para o Boletim
        </Link>
      </EmptyContent>
    </Empty>
  )
}
