import { BotaoVoltar } from '@/components/cabinet/botao-voltar'
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
 * Ação do cabeçalho — a mesma forma para a fraca, a forte e a do menu `⋯`.
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
   * que metade dos operadores nunca lê.
   */
  motivo?: string
  /** Desativação/cancelamento — tinta de destrutivo no item. */
  destrutiva?: boolean
}

export interface PageHeaderProps {
  /** Nome da tela, literal da transcrição ("Cadastro de Clientes"). */
  titulo: string
  /**
   * A linha de baixo: o que a tela TEM agora ("14 ordens · 3 fornecedores"),
   * não o que ela é. Descrever a tela em prosa embaixo do próprio nome é ruído
   * que o operador aprende a pular no segundo dia.
   */
  subtitulo?: string
  /** Contexto que qualifica o título (modo da tela, empresa, nº do documento). */
  contexto?: string
  /**
   * As ações FRACAS da tela, à esquerda do `⋯` — o que vale a pena estar à
   * vista sem disputar com a primária (`Imprimir`, `Exportar`).
   *
   * ## Por que a forte continua numa prop própria
   *
   * O mockup desenha três pesos na faixa (ghost · `⋯` · primária), e a leitura
   * literal disso seria UMA lista com um campo `tom`. Foi tentado e recusado:
   * `tom` só descobre a segunda primária em tempo de execução, com um
   * `console.error` que ninguém lê em produção, e "a ação principal" no plural
   * não é hierarquia — é a barra Softlux de volta. Com a forte em prop
   * separada, quem tenta duas não compila. A ordem visual dos três grupos é do
   * componente, não da tela.
   */
  acoes?: readonly AcaoDeCabecalho[]
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
  /**
   * A saída. Ligada por padrão: quem some sozinho quando não há para onde
   * voltar é o `BotaoVoltar` (tela que o menu publica não ganha tecla). Passar
   * `false` é para a tela que MONTA a própria saída — o diálogo em página
   * inteira do login, por exemplo.
   */
  voltar?: boolean
  /**
   * O degrau do título na régua (§Hierarquia), e são três porque a régua tem
   * três: `pagina` (28px, o padrão), `registro` (24px — a ficha e o documento,
   * onde o id em mono divide a linha com o nome) e `display` (30px, reservado
   * à saudação do dashboard e ao claim do login).
   *
   * Não é escolha de gosto da tela: `--t-display` tem UM uso declarado, e
   * `registro` e `pagina` nunca coexistem numa tela ("um Gambarino por tela,
   * no máximo dois").
   */
  variante?: 'display' | 'pagina' | 'registro'
  /** Fim da faixa: carimbo, nº do documento — o que a tela precisar. */
  children?: ReactNode
  className?: string
}

/**
 * Cada variante é UM degrau da régua, escrito uma vez. A tela pede o papel
 * ("isto é uma ficha"), não a medida — mudar 24 para 22 é uma linha em
 * `index.css`, e nenhuma tela precisa saber.
 */
const DEGRAU_DO_TITULO = {
  display: 't-display',
  pagina: 't-pagina',
  registro: 't-registro',
} as const

/**
 * CABEÇALHO DE PÁGINA 2.0 (Reface 2.0 · D5) — o título desce da casca para o
 * CONTEÚDO, em Gambarino 28px, com o subtítulo de dado embaixo e as ações à
 * direita.
 *
 * ## Um `<h1>` no sistema inteiro, e ele é este
 *
 * Antes havia três vozes para a mesma frase: o `<h1>` deste componente, o
 * `<h1>` dentro da caixa preta da `BandaDeIdentidade` (19 telas) e o `<h1>`
 * solto copiado em rota (`Previsão de Chegada`, `Tarefas`, `Planner`). Cada uma
 * com sua fonte, seu tamanho e sua caixa. Na 2.0 todas passam por aqui —
 * `grep "<h1" src/routes src/features` não acha nenhum, e mudar o degrau do
 * título do sistema volta a ser uma linha.
 *
 * ## A caixa preta saiu
 *
 * A banda pintava uma faixa lilás com borda de 2px em volta do nome da tela.
 * Pela §Hierarquia, título é TIPO, não caixa: a fronteira entre o cabeçalho e o
 * que vem abaixo é espaço (`--s-5`), e gastar borda + fundo + gradiente ali
 * consumia três das quatro ferramentas de separação numa fronteira que não
 * precisava de nenhuma.
 *
 * ## A saída volta para o cabeçalho, e agora sem opt-in
 *
 * A prop `voltar` já existiu, era opcional, e de três consumidores UM a passava
 * — o resto das telas ficava sem saída visível (#235, que a mudou para o
 * `PageFrame`). Ela volta porque o mockup 2.0 põe a tecla colada no título, que
 * é onde o olho já está; o que não volta é o opt-in: o padrão é LIGADO e quem
 * decide se há tecla é `rotaMaeDe`, não a tela. Tela nova continua nascendo com
 * saída sem ninguém lembrar de pedir.
 */
export function PageHeader({
  titulo,
  subtitulo,
  contexto,
  acoes = [],
  primaria,
  secundarias = [],
  avisoDasSecundarias,
  voltar = true,
  variante = 'pagina',
  children,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      data-variante={variante}
      // A fronteira com o que vem abaixo é ESPAÇO, sem linha (§Hierarquia:
      // uma ferramenta de separação por fronteira, e a mais barata que resolve).
      className={cn('mb-6 flex flex-wrap items-start gap-x-3 gap-y-2', className)}
    >
      {voltar ? <BotaoVoltar /> : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {/* `t-pagina`/`t-registro`: os degraus da §Hierarquia, definidos uma
              vez em `index.css` (D1). Tamanho literal aqui seria a 12ª medida
              de um sistema que tem 11. `min-w-0` + `truncate` porque título de
              documento carrega nome de cliente, e nome comprido não pode
              empurrar a ação primária para fora da linha. */}
          <h1
            data-slot="page-header-titulo"
            className={cn('min-w-0 truncate', DEGRAU_DO_TITULO[variante])}
          >
            {titulo}
          </h1>

          {/* O MODO da tela é rótulo, não título: `t-rotulo` é o único degrau
              em caixa alta da régua, e ele não leva caixa nem borda próprias
              (§Hierarquia). O pill âmbar da banda 1.x era a segunda ferramenta
              de separação numa fronteira que já tinha espaço. */}
          {contexto ? (
            <span
              data-slot="page-header-contexto"
              className="t-rotulo shrink-0 text-muted-foreground"
            >
              {contexto}
            </span>
          ) : null}

          {children}
        </div>

        {subtitulo ? (
          <p data-slot="page-header-subtitulo" className="t-meta text-muted-foreground">
            {subtitulo}
          </p>
        ) : null}
      </div>

      {/* `ml-auto` no GRUPO, não em cada peça: as ações formam um bloco só no
          canto, com o mesmo gutter entre elas que o resto da tela usa. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {acoes.map((acao) => (
          <Button
            key={acao.id}
            type="button"
            variant="ghost"
            disabled={acao.disabled === true}
            {...(acao.motivo ? { title: acao.motivo } : {})}
            onClick={() => acao.onClick?.()}
          >
            {acao.icon ? <acao.icon aria-hidden="true" /> : null}
            {acao.label}
          </Button>
        ))}

        {secundarias.length > 0 ? (
          <DropdownMenuTrigger>
            <Button type="button" variant="outline" size="icon" aria-label="Mais ações">
              <MoreHorizontal aria-hidden="true" />
            </Button>
            {/* `min-w-64` e não `w-64`: a largura base do menu é a do gatilho
                (`w-(--trigger-width)`), e aqui o gatilho é um ícone — o mínimo
                não disputa com ela, vence sempre. */}
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
    </header>
  )
}
