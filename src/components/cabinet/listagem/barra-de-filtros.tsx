import { CaixaDeBusca } from '@/components/cabinet/filtros/caixa-de-busca'
import { PilulasDeFiltro } from '@/components/cabinet/filtros/pilulas-de-filtro'
import {
  type ColunaDoMenu,
  type GrupoDeColunasOpcionais,
  MenuDeColunas,
} from '@/components/cabinet/listagem/menu-de-colunas'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import type { CampoFiltravel, FiltroDaTabela, Juncao } from '@/lib/filtro-de-consulta'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Group, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button as ButtonAria } from 'react-aria-components'

/**
 * A BARRA DE FILTROS 2.0 (`fbar` do mockup) — o estado da consulta, visível.
 *
 * O que morreu aqui: o botão `Filtro` genérico da barra de ações, o
 * `Adicionar filtro` com rótulo por extenso, o painel de colunas que abria
 * embaixo empurrando a grade, e o `Linha: Padrão` perdido no rodapé. O que
 * entrou: uma linha só, onde cada peça DIZ o que está valendo — busca com
 * prefixo, chips do que já filtrou, agrupamento, ordenação e o menu de colunas
 * com a densidade dentro. É o `IndexFilters` do Polaris com as views do
 * Airtable, que é o que o mockup desenha.
 *
 * ## A barra dobra inteira; nada quebra dentro de um controle
 *
 * `flex-wrap` na barra e `whitespace-nowrap` em cada peça. O contrário — chip
 * que quebra em duas linhas — produz aquela barra de altura imprevisível em que
 * "Situação: Enviada," fica em cima e "Confirmada ×" embaixo, e o `×` já não
 * parece pertencer a nada. Quando não couber, é a BARRA que ganha uma linha.
 *
 * ## Slots em vez de mais props
 *
 * `modos` (D12) e `acoes` entram como `ReactNode`. Quem desenha o alternador de
 * visão é outra issue, e a barra não deve conhecer o vocabulário dela para
 * conseguir posicioná-lo — o que ela sabe é ONDE cada coisa fica.
 */

export interface OpcaoDeAgrupamentoDaBarra {
  id: string
  rotulo: string
}

/**
 * Densidade como DADO, não como o tipo da grade: quem manda nas alturas é a
 * `VitraDataTable` (D8), e importar o enum dela aqui faria as duas peças
 * mudarem juntas por uma decisão que é só de uma.
 */
export interface OpcaoDeDensidade {
  id: string
  rotulo: string
  /** O que a opção significa em pixels — vira `title`, não texto na barra. */
  altura?: string
}

export interface BarraDeFiltrosProps {
  /** Caixa de busca livre + prefixos. `false` no recurso que não publica `q`. */
  busca?: boolean
  textoDaBusca: string
  onBuscaChange: (texto: string) => void
  placeholderDaBusca?: string

  /** Campos filtráveis: alimentam os chips E os prefixos da busca. */
  campos?: readonly CampoFiltravel[]
  filtros: FiltroDaTabela[]
  juncao: Juncao
  onFiltrosChange: (filtros: FiltroDaTabela[]) => void
  onJuncaoChange: (juncao: Juncao) => void
  /**
   * Um montador de filtro no lugar dos chips (o modo por módulo, o modo em
   * lista). Slot, e não uma prop `modo`: a barra sabe ONDE o filtro fica, não
   * quantos jeitos de montá-lo a listagem oferece.
   */
  filtrosSlot?: ReactNode

  /** Agrupamento (a linha de grupo é D10; aqui fica o controle). */
  agrupamentos?: readonly OpcaoDeAgrupamentoDaBarra[]
  agruparPor?: string
  onAgruparPorChange?: (id: string) => void

  /** Ordenação corrente — o resumo do que o cabeçalho já mostra, e o jeito de inverter. */
  ordenacao?: { rotulo: string; desc: boolean } | null
  onInverterOrdenacao?: () => void
  onLimparOrdenacao?: () => void

  /** Menu de colunas (inclui a densidade). Ausente = a listagem não oferece. */
  colunas?: readonly ColunaDoMenu[]
  onAlternarColuna?: (id: string) => void
  onReordenarColunas?: (ids: string[]) => void
  colunasOpcionais?: readonly GrupoDeColunasOpcionais[]
  onAlternarColunaOpcional?: (id: string) => void

  /**
   * Densidade da linha — segmented na própria barra, como no mockup.
   *
   * Fica aqui e NÃO dentro do menu de colunas: a issue pedia os dois lugares, e
   * dois donos para a mesma escolha é a duplicação que o CLAUDE.md proíbe. Este
   * é o que se lê sem abrir nada.
   */
  densidades?: readonly OpcaoDeDensidade[]
  densidade?: string
  onDensidadeChange?: (id: string) => void
  /**
   * A DICA da densidade escolhida — hoje, as teclas do modo Planilha.
   *
   * Fica colada no segmented porque é a legenda dele: o modo Planilha muda o
   * que o teclado faz, e um modo que muda o teclado sem dizer quais teclas é um
   * modo secreto. Slot, e não uma prop `dicaDaPlanilha`: quem sabe o que cada
   * densidade significa é a grade, não a barra.
   */
  dica?: ReactNode

  /** Alternador de modo de visão (D12). */
  modos?: ReactNode
  /** Incluir · Alterar · Consultar · Excluir · Imprimir — a barra de ações da tela. */
  acoes?: ReactNode
}

export function BarraDeFiltros({
  busca = true,
  textoDaBusca,
  onBuscaChange,
  placeholderDaBusca,
  campos,
  filtros,
  juncao,
  onFiltrosChange,
  onJuncaoChange,
  filtrosSlot,
  agrupamentos,
  agruparPor,
  onAgruparPorChange,
  ordenacao,
  onInverterOrdenacao,
  onLimparOrdenacao,
  colunas,
  onAlternarColuna,
  onReordenarColunas,
  colunasOpcionais,
  onAlternarColunaOpcional,
  densidades,
  densidade,
  onDensidadeChange,
  dica,
  modos,
  acoes,
}: BarraDeFiltrosProps) {
  const [escolhendoGrupo, setEscolhendoGrupo] = useState(false)
  const temCampos = (campos?.length ?? 0) > 0
  const grupoAtivo = agrupamentos?.find((opcao) => opcao.id === agruparPor) ?? null

  return (
    <div
      data-slot="barra-de-filtros"
      className={cn(
        'flex flex-wrap items-center gap-[var(--s-2)] gap-y-[var(--s-2)]',
        'border-rule-hair border-b px-[var(--s-3)] py-2.5',
        '[&_button]:whitespace-nowrap',
      )}
    >
      {busca ? (
        <CaixaDeBusca
          valor={textoDaBusca}
          onChange={onBuscaChange}
          campos={campos ?? []}
          placeholder={placeholderDaBusca}
        />
      ) : null}

      {filtrosSlot ?? null}

      {temCampos && campos && !filtrosSlot ? (
        <PilulasDeFiltro
          campos={campos}
          filtros={filtros}
          juncao={juncao}
          onFiltrosChange={onFiltrosChange}
          onJuncaoChange={onJuncaoChange}
        />
      ) : null}

      {/* O chip de agrupamento é do MESMO material dos chips de filtro, e de
          propósito: agrupar é uma condição sobre a lista, como filtrar. Ele usa
          o primário porque muda o DESENHO da grade, não o conjunto — a única
          diferença que o operador precisa ler daqui. */}
      {agrupamentos && agrupamentos.length > 0 && onAgruparPorChange ? (
        <div
          className={cn(
            'inline-flex h-7 items-center rounded-[var(--r-pill)] border pr-[5px] pl-2.5',
            grupoAtivo
              ? 'border-foreground bg-[var(--primary-soft)]'
              : 'border-rule-hair border-dashed',
          )}
        >
          {/* O `PopoverTrigger` (o `DialogTrigger` do react-aria) envolve SÓ o
              botão: o primeiro filho dele tem de ser um pressable, e um `<div>`
              ali derruba a tela inteira em branco — foi o que aconteceu na
              primeira montagem deste chip. */}
          <PopoverTrigger isOpen={escolhendoGrupo} onOpenChange={setEscolhendoGrupo}>
            <ButtonAria
              aria-label={
                grupoAtivo ? `Agrupado por ${grupoAtivo.rotulo} — trocar` : 'Agrupar por um campo'
              }
              className="t-ui flex h-full items-center gap-1 outline-none focus-visible:focus-ring"
            >
              <Group aria-hidden="true" className="size-3.5" />
              <span style={{ color: 'var(--n-700)' }}>Agrupar</span>
              {grupoAtivo ? <span className="font-semibold">{grupoAtivo.rotulo}</span> : null}
            </ButtonAria>
            <Popover className="w-56 p-1" placement="bottom start">
              <ul className="flex flex-col">
                {agrupamentos.map((opcao) => (
                  <li key={opcao.id}>
                    <ButtonAria
                      className={cn(
                        't-ui w-full rounded-[var(--r-item)] px-2 py-1.5 text-left outline-none hover:bg-[var(--hover)] focus-visible:focus-ring',
                        opcao.id === agruparPor && 'bg-[var(--primary-soft)]',
                      )}
                      onPress={() => {
                        onAgruparPorChange(opcao.id)
                        setEscolhendoGrupo(false)
                      }}
                    >
                      {opcao.rotulo}
                    </ButtonAria>
                  </li>
                ))}
              </ul>
            </Popover>
          </PopoverTrigger>
          {grupoAtivo ? (
            <button
              type="button"
              aria-label={`Desagrupar — tirar ${grupoAtivo.rotulo}`}
              className="ml-1 grid size-5 shrink-0 place-content-center rounded-[var(--r-pill)] text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring"
              onClick={() => onAgruparPorChange('')}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Empurra o resto para a direita: à esquerda fica o que RESTRINGE a
          lista, à direita o que muda como ela é DESENHADA. */}
      <div className="flex-1" />

      {acoes}

      {ordenacao && onInverterOrdenacao ? (
        <div className="flex items-center">
          <ButtonAria
            aria-label={`Ordenado por ${ordenacao.rotulo}, ${ordenacao.desc ? 'decrescente' : 'crescente'} — inverter`}
            className="t-ui inline-flex h-7 items-center gap-1 rounded-[var(--r-ctrl)] px-2 outline-none hover:bg-[var(--hover)] focus-visible:focus-ring"
            onPress={onInverterOrdenacao}
          >
            <span style={{ color: 'var(--n-700)' }}>Ordenar:</span>
            <span className="font-semibold">{ordenacao.rotulo}</span>
            {ordenacao.desc ? (
              <ArrowDown aria-hidden="true" className="size-3.5" />
            ) : (
              <ArrowUp aria-hidden="true" className="size-3.5" />
            )}
          </ButtonAria>
          {onLimparOrdenacao ? (
            <button
              type="button"
              aria-label={`Tirar a ordenação por ${ordenacao.rotulo}`}
              className="grid size-5 place-content-center text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring"
              onClick={onLimparOrdenacao}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Segmented de densidade: duas opções, dois botões. Um menu para duas
          escolhas cobra um clique a mais para mostrar o que já cabia à vista. */}
      {densidades && densidades.length > 0 && onDensidadeChange ? (
        <fieldset
          aria-label="Altura da linha"
          className="inline-flex overflow-hidden rounded-[var(--r-ctrl)] border border-rule-hair"
        >
          {densidades.map((opcao) => {
            const ativa = opcao.id === densidade
            return (
              <ButtonAria
                key={opcao.id}
                aria-pressed={ativa}
                {...(opcao.altura ? { title: opcao.altura } : {})}
                className={cn(
                  't-ui h-7 px-2 outline-none focus-visible:focus-ring',
                  // `text-background!` — o `!` é medido, não defensivo: as
                  // classes `.t-*` da 2.0 declaram `color` FORA de camada e
                  // vencem a `@layer utilities` do Tailwind. Sem ele, o
                  // segmento ativo saía tinta sobre tinta: um retângulo preto
                  // sem rótulo nenhum, e só a captura mostrava (o teste
                  // continuava achando o botão pelo nome acessível).
                  ativa
                    ? 'bg-foreground text-background!'
                    : 'text-muted-foreground hover:bg-[var(--hover)]',
                )}
                onPress={() => onDensidadeChange(opcao.id)}
              >
                {opcao.rotulo}
              </ButtonAria>
            )
          })}
        </fieldset>
      ) : null}

      {/* Mono, porque é lista de TECLA — e tecla é dado, não prosa
          (§Hierarquia: "se está em mono, é algo que se copia, compara ou
          soma"). `<output>` porque o texto APARECE quando a densidade muda: é
          resposta a uma ação do operador, e quem não vê a tela precisa ouvi-la
          sem ir procurar. */}
      {dica ? (
        <output className="whitespace-nowrap t-dado-meta" data-slot="dica-da-densidade">
          {dica}
        </output>
      ) : null}

      {modos}

      {colunas && colunas.length > 0 && onAlternarColuna && onReordenarColunas ? (
        <MenuDeColunas
          colunas={colunas}
          onAlternar={onAlternarColuna}
          onReordenar={onReordenarColunas}
          opcionais={colunasOpcionais}
          onAlternarOpcional={onAlternarColunaOpcional}
        />
      ) : null}
    </div>
  )
}
