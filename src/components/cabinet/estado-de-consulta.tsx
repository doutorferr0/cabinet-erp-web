import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { detalheDoErro } from '@/lib/erros'

/**
 * Miolo compartilhado do tríduo carregando/erro/não-encontrado que toda tela
 * de detalhe (documento e cadastro) repetia igual. Fica de fora do `if` de
 * cada rota de propósito — cada chamador ainda decide QUANDO mostrar cada
 * estado (é isso que dá o `narrowing` de TypeScript no `query.data`
 * seguinte); só o MARKUP de cada estado é compartilhado.
 */

/** `<Skeleton className="h-8 w-64" /> + <Skeleton className="h-64 w-full" />`, igual nas 6 telas de detalhe. */
export function EsqueletoDeCarregamento() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra
 * falha chega como erro — 409 é "nenhuma empresa ativa na sessão". Tratar os
 * dois como "não encontrado" mandaria o operador procurar um registro que
 * existe.
 */
export function ErroDeCarregamento({
  mensagem,
  erro,
  refazer,
}: {
  mensagem: string
  erro: unknown
  refazer: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-2 text-muted-foreground">
      {mensagem}
      {detalheDoErro(erro) ? (
        <span className="max-w-prose text-[0.75rem]">{detalheDoErro(erro)}</span>
      ) : null}
      <Button variant="outline" size="sm" onClick={refazer}>
        Tentar de novo
      </Button>
    </div>
  )
}
