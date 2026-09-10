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
 * Os cartões da coluna lateral. Quatro é o que a ordem de compra mostra
 * (identidade · andamento · logística · financeiro) e é o teto do que cabe sem
 * rolar: reservar mais deixaria um rastro de caixas vazias abaixo da folha que
 * chega.
 */
const CARTOES_DO_ESQUELETO = [
  { id: 'cartao-1', corpo: 'w-full' },
  { id: 'cartao-2', corpo: 'w-5/6' },
  { id: 'cartao-3', corpo: 'w-3/4' },
  { id: 'cartao-4', corpo: 'w-5/6' },
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
 * **Reface 2.0 (D18): a folha deixou de ser uma coluna.** O registro agora se
 * lê em duas — o que se PREENCHE à esquerda, os cartões de assunto que se
 * CONSULTAM à direita —, e um esqueleto de coluna única voltaria a mentir do
 * jeito que esta peça existe para não mentir: a lateral apareceria de repente,
 * empurrando o documento inteiro para a esquerda no instante em que a consulta
 * responde. As proporções são as MESMAS da folha (`flex-[3_1_32rem]` /
 * `flex-[1_1_18rem]`), inclusive a quebra sem `@media`: onde a folha empilha,
 * o esqueleto empilha junto.
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
      {/* PRINCIPAL › LATERAL, com as bases da folha. Fronteira entre colunas é
          ESPAÇO (`--s-4` = 16px), sem linha — a régua manda a ferramenta mais
          barata que resolve, e duas colunas já se separam sozinhas. */}
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="grid min-w-0 flex-[3_1_32rem] gap-4 rounded-data border-2 border-border p-4 shadow-el3 sm:grid-cols-2"
          data-testid="esqueleto-documento"
        >
          {CAMPOS_DO_ESQUELETO.map((campo) => (
            <div key={campo.id} className="flex flex-col gap-2" data-testid="esqueleto-campo">
              <Skeleton className={`h-3 ${campo.rotulo}`} aria-hidden="true" />
              <Skeleton className="h-9 w-full" aria-hidden="true" />
            </div>
          ))}
        </div>
        {/* Cartões QUIET, como os de verdade: borda fina e sombra macia. O
            esqueleto que copiasse a caixa de traço grosso do documento
            prometeria à lateral um peso que ela não tem. */}
        <div
          className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4"
          data-testid="esqueleto-lateral"
        >
          {CARTOES_DO_ESQUELETO.map((cartao) => (
            <div
              key={cartao.id}
              className="flex flex-col gap-3 rounded-data border p-4 shadow-el1"
              data-testid="esqueleto-cartao"
              aria-hidden="true"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className={`h-3 ${cartao.corpo}`} />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
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
        <span className="t-meta max-w-prose">{detalheDoErro(erro)}</span>
      ) : null}
      <Button variant="outline" size="sm" onClick={refazer}>
        Tentar de novo
      </Button>
    </div>
  )
}
