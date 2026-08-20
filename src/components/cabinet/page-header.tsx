import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { type LucideIcon, MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Ação do cabeçalho — a mesma forma para a primária e para as do menu `⋯`.
 *
 * Não é a `DataTableAction`: aquela carrega a linha selecionada no `onClick`
 * (`(row: T | null) => void`) porque nasceu dentro da tabela, que é quem sabe o
 * que está marcado. Aqui o cabeçalho não sabe de linha nenhuma — quem monta a
 * tela já fechou o clique sobre o registro certo antes de entregar. É o que
 * permite este componente servir listagem, ficha e documento sem virar genérico
 * sobre `T`.
 */
export interface AcaoDeCabecalho {
  id: string
  label: string
  icon?: LucideIcon
  onClick?: () => void
  disabled?: boolean
  /**
   * Por que a ação não serve agora. Sai **visível**, em linha própria dentro do
   * item, e não no `title`: item de menu desabilitado não recebe evento de
   * mouse em toda plataforma, e um motivo que só aparece no hover é um motivo
   * que metade dos operadores nunca lê. A barra antiga podia se dar ao luxo do
   * `title` porque o botão ficava à vista o tempo todo.
   */
  motivo?: string
  /** Desativação/cancelamento — tinta de destrutivo no item. */
  destrutiva?: boolean
}

export interface PageHeaderProps {
  /** Nome da tela, literal da transcrição ("Cadastro de Clientes"). */
  titulo: string
  /** Contexto que qualifica o título (empresa, banco, nº do documento). */
  contexto?: string
  /**
   * A ÚNICA ação forte da tela. Uma, e à direita: é o que separa este cabeçalho
   * da barra Softlux, onde `Incluir` tinha o mesmo peso de `Imprimir`.
   */
  primaria?: AcaoDeCabecalho
  /** O resto, atrás do `⋯` — alcançável por teclado, longe do caminho do olho. */
  secundarias?: readonly AcaoDeCabecalho[]
  /**
   * Aviso no topo do menu quando o GRUPO inteiro depende de contexto que a tela
   * ainda não tem (listagem sem linha marcada). Dito uma vez, e não repetido
   * em cada item que ele explica.
   */
  avisoDasSecundarias?: string
  /** Fim da faixa: carimbo, nº do documento — o que a tela precisar. */
  children?: ReactNode
  className?: string
}

/**
 * CABEÇALHO DE PÁGINA (Polaris-2, issue #197) — título à esquerda, **uma** ação
 * forte à direita, o resto atrás do `⋯`.
 *
 * Substitui, nas listagens, a barra herdada do Softlux: sete botões de peso
 * igual (`Filtro · Incluir · Alterar · Consul. · Excluir · Imprimir`) enfileirados
 * acima da tabela. Ela era fiel ao legado e cara de ler — a ação que o operador
 * usa dez vezes por dia tinha o mesmo desenho da que ele usa uma vez por mês, e
 * escolher entre sete iguais custa uma parada a cada abertura de tela.
 *
 * O que muda de fato:
 *
 * 1. **`Incluir` vira a única peça forte** e mora sempre no mesmo canto, em
 *    toda tela. Achar não depende mais de ler a fileira.
 * 2. **Ação de REGISTRO (`Alterar`, `Consul.`, `Excluir`) sai do caminho** — ela
 *    só existe depois de haver linha marcada, e um botão que passa o dia
 *    desabilitado ocupa o lugar de um que serve. Enquanto a linha clicável não
 *    chega (Polaris-3), o `⋯` é onde elas ficam, e o menu DIZ que falta escolher
 *    a linha.
 * 3. **Filtro, colunas e consultas salvas NÃO sobem para cá.** Os três respondem
 *    "como esta listagem está montada agora" e continuam junto da tabela, que é
 *    o que eles montam. Subir só o `Filtro` separaria irmãos.
 *
 * A banda preta da `BandaDeIdentidade` não vem junto: com a fundação Polaris
 * (#195) o título é hierarquia tipográfica, não caixa pintada. Ela segue em pé
 * onde ainda não houve troca — formulário, documento, boletim.
 *
 * ## A SAÍDA NÃO MORA AQUI (issue #235)
 *
 * Havia a prop `voltar`, opt-in, e de três consumidores deste cabeçalho **um**
 * a passava: as outras telas ficavam sem saída visível. Desde a #235 quem monta
 * a saída é a folha (`PageFrame` → `BotaoVoltar`), no canto superior esquerdo
 * de toda tela — a regra fixa da espec da fusão v5.
 *
 * Devolver a prop devolve o buraco: volta a existir tela com saída e tela sem,
 * e a que tiver passa a mostrar duas.
 */
export function PageHeader({
  titulo,
  contexto,
  primaria,
  secundarias = [],
  avisoDasSecundarias,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      {/* Headline: um por tela, na voz de QUEM (o seletor `h1` do `index.css`
          dá a serifada). `min-w-0` + `truncate` porque título de documento
          carrega nome de cliente, e nome comprido não pode empurrar a ação
          primária para fora da linha. */}
      <h1 className="min-w-0 truncate font-bold text-2xl">{titulo}</h1>

      {contexto ? (
        <span className="font-bold font-mono text-[0.75rem] text-text-strong uppercase tracking-[0.07em]">
          {contexto}
        </span>
      ) : null}

      {children}

      {/* `ml-auto` no GRUPO, não em cada peça: as ações formam um bloco só no
          canto, com o mesmo gutter entre elas que o resto da tela usa. */}
      <div className="ml-auto flex items-center gap-2">
        {secundarias.length > 0 ? (
          <DropdownMenuTrigger>
            <Button type="button" variant="outline" size="icon" aria-label="Mais ações">
              <MoreHorizontal aria-hidden="true" />
            </Button>
            {/* `min-w-64` e não `w-64`: a largura base do menu é a do gatilho
                (`w-(--trigger-width)`), e aqui o gatilho é um ícone de 36px —
                sobrescrever a largura dependeria da ordem das classes no CSS,
                que não é a ordem em que elas aparecem aqui. O mínimo não
                disputa: ele vence sempre. */}
            <DropdownMenu placement="bottom end" className="min-w-64">
              {avisoDasSecundarias ? (
                <DropdownMenuLabel className="font-normal text-muted-foreground">
                  {avisoDasSecundarias}
                </DropdownMenuLabel>
              ) : null}
              {secundarias.map((acao) => (
                <DropdownMenuItem
                  key={acao.id}
                  textValue={acao.label}
                  isDisabled={acao.disabled === true}
                  {...(acao.destrutiva ? { variant: 'destructive' as const } : {})}
                  onAction={() => acao.onClick?.()}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      {acao.icon ? <acao.icon aria-hidden="true" /> : null}
                      {acao.label}
                    </span>
                    {acao.motivo ? (
                      <span className="text-muted-foreground text-xs">{acao.motivo}</span>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </DropdownMenuTrigger>
        ) : null}

        {primaria ? (
          <Button
            type="button"
            disabled={primaria.disabled === true}
            {...(primaria.motivo ? { title: primaria.motivo } : {})}
            onClick={() => primaria.onClick?.()}
          >
            {primaria.icon ? <primaria.icon aria-hidden="true" /> : null}
            {primaria.label}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
