import { ModuloEmConstrucao } from '@/components/cabinet/modulo-em-construcao'
import { SemPermissao } from '@/components/cabinet/sem-permissao'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ehModuloEmConstrucao } from '@/data/modulos-em-construcao'
import { detalheDoErro, ehSemPermissao } from '@/lib/erros'

/**
 * Miolo compartilhado do tríduo carregando/erro/não-encontrado que toda tela
 * de detalhe (documento e cadastro) repetia igual. Fica de fora do `if` de
 * cada rota de propósito — cada chamador ainda decide QUANDO mostrar cada
 * estado (é isso que dá o `narrowing` de TypeScript no `query.data`
 * seguinte); só o MARKUP de cada estado é compartilhado.
 */

/** Pares de campo do esqueleto — largura de rótulo variada, como texto de verdade. */
const CAMPOS_DO_ESQUELETO = [
  { id: 'campo-1', rotulo: 'w-20' },
  { id: 'campo-2', rotulo: 'w-28' },
  { id: 'campo-3', rotulo: 'w-24' },
  { id: 'campo-4', rotulo: 'w-32' },
  { id: 'campo-5', rotulo: 'w-24' },
  { id: 'campo-6', rotulo: 'w-20' },
  { id: 'campo-7', rotulo: 'w-28' },
  { id: 'campo-8', rotulo: 'w-24' },
] as const

/**
 * O esqueleto tem a FORMA DA FOLHA que vem depois (#201) — nove telas de
 * detalhe passam por aqui.
 *
 * A versão anterior era uma barra de 8 e um bloco de 64: uma mancha do tamanho
 * errado, trocada de repente por cabeçalho, tira de abas e duas colunas de
 * campo. Esqueleto serve para RESERVAR o lugar do que vem; quando o lugar não
 * bate, ele não evita o salto, só o anuncia mais cedo.
 *
 * O que ele desenha é o que toda folha de cadastro tem: título com a ação forte
 * à direita (#202), abas (§9 padrão 4) e pares rótulo+campo em duas colunas.
 *
 * `<output>` (que já é `role="status"`) com o texto: as barras são
 * `aria-hidden`, e sem a frase quem ouve a tela encontra uma região que mudou e
 * não tem o que dizer sobre ela.
 */
export function EsqueletoDeCarregamento() {
  return (
    <output className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <div
        className="flex items-center justify-between gap-4"
        data-testid="esqueleto-cabecalho"
        aria-hidden="true"
      >
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex gap-2" data-testid="esqueleto-abas" aria-hidden="true">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
      {/* Uma coluna no telefone, duas a partir do `sm` — a mesma quebra dos
          blocos de formulário. Esqueleto que ignora a quebra promete lado a
          lado o que vai chegar empilhado. */}
      <div className="grid gap-4 rounded-data border-2 border-border p-4 shadow-el3 sm:grid-cols-2">
        {CAMPOS_DO_ESQUELETO.map((campo) => (
          <div key={campo.id} className="flex flex-col gap-2" data-testid="esqueleto-campo">
            <Skeleton className={`h-3 ${campo.rotulo}`} aria-hidden="true" />
            <Skeleton className="h-9 w-full" aria-hidden="true" />
          </div>
        ))}
      </div>
    </output>
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
  // 403 não é falha de carregamento: é recusa por permissão, e a única coisa
  // que o markup genérico oferece — "Tentar de novo" — nunca resolve. O desvio
  // mora AQUI, e não em cada rota, porque as seis telas de detalhe chamam este
  // mesmo componente: espalhar o `if` daria seis chances de esquecer uma.
  if (ehSemPermissao(erro)) return <SemPermissao erro={erro} />

  // 501 tampouco é falha de carregamento, e é o desvio que faltava: o módulo
  // está no contrato e o servidor ainda não o serve. O bloco genérico diria "o
  // registro não carregou" com um `Tentar de novo` que devolve o mesmo 501 —
  // fica pelo mesmo motivo do 403, e no mesmo lugar, porque são as mesmas seis
  // telas de detalhe chamando este componente.
  if (ehModuloEmConstrucao(erro)) return <ModuloEmConstrucao erro={erro} />

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
