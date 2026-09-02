import { ControleDeValor, SeletorDeOperador } from '@/components/cabinet/filtro-controles'
import { partesDoChip, resumoDoFiltro } from '@/components/cabinet/filtros/resumo-do-filtro'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import {
  type CampoFiltravel,
  type FiltroDaTabela,
  type Juncao,
  ROTULO_DA_JUNCAO,
  dispensaValor,
  novoFiltroId,
  operadorPadrao,
} from '@/lib/filtro-de-consulta'
import { cn } from '@/lib/utils'
import { Plus, X } from 'lucide-react'
import { Button as ButtonAria } from 'react-aria-components'
import { useRef, useState } from 'react'

/**
 * CHIPS DE FILTRO ATIVO (#199; redesenhados na Reface 2.0) — a pergunta em
 * frases, cada uma com o seu `×`.
 *
 * Portado em espírito de `polaris.shopify.com/components/…/filters`, sobre o
 * vocabulário de filtro que já existia aqui (`filtro-de-consulta.ts`, de
 * sadmann7/shadcn-table — ver `NOTICE`), e redesenhado sobre o mockup
 * `Listagem › fbar`: chip sólido de cantos redondos para o filtro APLICADO,
 * chip tracejado para o `+ Filtro` que ainda não é nada.
 *
 * ## O tracejado é o vazio, e o sólido é o aplicado
 *
 * As duas formas dividem a mesma barra e precisam se distinguir sem cor: o
 * tracejado diz "aqui cabe mais uma condição" e o sólido diz "esta condição
 * está valendo agora". É a única fronteira da barra que usa desenho de borda —
 * as outras usam espaço (§Hierarquia, separação 1).
 *
 * ## Por que substitui o painel em lista
 *
 * O painel (`ListaDeFiltros`) mostra as condições como um formulário: uma linha
 * por filtro, com campo, operador e valor abertos ao mesmo tempo. Ele é bom para
 * MONTAR uma pergunta longa e caro para MANTER uma curta — ocupa um bloco
 * vertical inteiro para dizer "Nome contém STELLA", e some quando o popover
 * fecha, de modo que a listagem filtrada não mostra por que está filtrada. O
 * chip inverte: o que fica na barra é a frase pronta, e o formulário só aparece
 * na condição que a pessoa foi editar.
 *
 * ## Um clique para remover — é o requisito, não um detalhe
 *
 * O `×` de cada chip age direto: sem abrir popover, sem confirmar. Remover
 * condição errada é barato de desfazer (basta remontar) e caríssimo de exigir
 * três cliques, porque é o gesto mais repetido de quem está garimpando uma
 * lista. Por isso ele é um botão PRÓPRIO, irmão do corpo do chip, e não uma
 * área dentro dele: um alvo só faria o clique de remover e o de editar
 * disputarem o mesmo pixel.
 *
 * ## A junção se troca entre os chips, e vale para todos
 *
 * `e`/`ou` é uma escolha só para a lista inteira (herdada do original, ver
 * `Juncao`), então a mesma palavra aparece entre cada par. Todas as ocorrências
 * são o MESMO controle mostrado de novo — clicar em qualquer uma vira a frase
 * inteira, e o rótulo assistivo diz isso em vez de deixar a pessoa descobrir
 * pelo resultado.
 */

export interface PilulasDeFiltroProps {
  campos: readonly CampoFiltravel[]
  filtros: FiltroDaTabela[]
  juncao: Juncao
  onFiltrosChange: (filtros: FiltroDaTabela[]) => void
  onJuncaoChange: (juncao: Juncao) => void
  disabled?: boolean
}

/** Altura e canto do chip — os mesmos do mockup, e os mesmos dos dois estados. */
const CHIP =
  'inline-flex h-7 items-center rounded-[var(--r-pill)] outline-none focus-visible:focus-ring'

export function PilulasDeFiltro({
  campos,
  filtros,
  juncao,
  onFiltrosChange,
  onJuncaoChange,
  disabled,
}: PilulasDeFiltroProps) {
  const [escolhendoCampo, setEscolhendoCampo] = useState(false)
  // O chip recém-nascido abre sozinho: escolher o campo e não ter onde digitar
  // faria a pessoa clicar de novo na coisa que acabou de criar.
  const [emEdicao, setEmEdicao] = useState<string | null>(null)
  const adicionar = useRef<HTMLButtonElement>(null)

  function acrescentar(campo: CampoFiltravel) {
    const filtroId = novoFiltroId()
    onFiltrosChange([
      ...filtros,
      {
        filtroId,
        id: campo.id,
        variante: campo.variante,
        operador: operadorPadrao(campo.variante),
        valor: campo.variante === 'multiSelect' ? [] : '',
      },
    ])
    setEscolhendoCampo(false)
    setEmEdicao(filtroId)
  }

  function atualizar(filtroId: string, mudanca: Partial<Omit<FiltroDaTabela, 'filtroId'>>) {
    onFiltrosChange(
      filtros.map((filtro) => (filtro.filtroId === filtroId ? { ...filtro, ...mudanca } : filtro)),
    )
  }

  function remover(filtroId: string) {
    onFiltrosChange(filtros.filter((filtro) => filtro.filtroId !== filtroId))
    // O `×` clicado sai do documento junto com o chip, e o foco cairia no
    // `<body>` — quem usa teclado perderia o lugar na barra. `+ Filtro` é o
    // vizinho que sempre existe.
    adicionar.current?.focus()
  }

  return (
    <>
      {filtros.map((filtro, indice) => {
        const campo = campos.find((c) => c.id === filtro.id)
        if (!campo) return null
        const ordem = indice + 1
        const partes = partesDoChip(filtro, campo)
        return (
          <div key={filtro.filtroId} className="flex items-center gap-[var(--s-2)]">
            {indice > 0 ? (
              <button
                type="button"
                aria-label={`Junção entre os filtros: ${ROTULO_DA_JUNCAO[juncao]} — trocar para ${ROTULO_DA_JUNCAO[juncao === 'and' ? 'or' : 'and']} em todos`}
                className="t-dado-meta uppercase underline decoration-dotted underline-offset-4 outline-none hover:text-foreground focus-visible:focus-ring"
                onClick={() => onJuncaoChange(juncao === 'and' ? 'or' : 'and')}
              >
                {ROTULO_DA_JUNCAO[juncao]}
              </button>
            ) : null}

            {/* O chip é UMA peça de dois alvos: a frase abre a edição, o `×`
                remove. A borda sólida em volta é o que os junta; bordas
                próprias dariam a impressão de dois filtros soltos. */}
            <div
              className={cn(
                CHIP,
                'border border-rule-hair bg-surface-sunken pr-[5px] pl-2.5',
              )}
            >
              <PopoverTrigger
                isOpen={emEdicao === filtro.filtroId}
                onOpenChange={(aberto) => setEmEdicao(aberto ? filtro.filtroId : null)}
              >
                <ButtonAria
                  aria-label={`Editar o filtro ${ordem}: ${resumoDoFiltro(filtro, campo)}`}
                  className="t-ui flex h-full max-w-[22rem] items-center gap-1 truncate outline-none focus-visible:focus-ring"
                >
                  {/* Rótulo em n-700 e valor em 600: dentro do Inter a
                      hierarquia é peso e cor, nunca tamanho (§Hierarquia). */}
                  <span className="shrink-0" style={{ color: 'var(--n-700)' }}>
                    {partes.rotulo}
                    {partes.operador ? ` ${partes.operador}` : ':'}
                  </span>
                  <span className="truncate font-semibold">{partes.valor || '…'}</span>
                </ButtonAria>
                <Popover className="w-72 p-3" placement="bottom start">
                  <div className="flex flex-col gap-[var(--s-2)]">
                    <p className="t-rotulo">{campo.rotulo}</p>
                    <SeletorDeOperador
                      filtro={filtro}
                      rotulo={`Operador do filtro ${ordem}`}
                      className="h-8 w-full"
                      onChange={(operador) =>
                        atualizar(filtro.filtroId, {
                          operador,
                          // Trocar para "está vazio" mantendo o valor antigo
                          // guardaria um texto que a frase não mostra mais — e
                          // ele voltaria sozinho ao trocar o operador de volta.
                          ...(dispensaValor(operador) ? { valor: '' } : {}),
                        })
                      }
                    />
                    <ControleDeValor
                      filtro={filtro}
                      campo={campo}
                      rotulo={`Valor do filtro ${ordem}`}
                      className="w-full"
                      onChange={(valor) => atualizar(filtro.filtroId, { valor })}
                    />
                  </div>
                </Popover>
              </PopoverTrigger>

              <button
                type="button"
                aria-label={`Remover o filtro ${ordem}: ${resumoDoFiltro(filtro, campo)}`}
                className="ml-1 grid size-5 shrink-0 place-content-center rounded-[var(--r-pill)] text-muted-foreground outline-none hover:bg-[var(--hover)] hover:text-foreground focus-visible:focus-ring"
                onClick={() => remover(filtro.filtroId)}
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
        )
      })}

      <PopoverTrigger isOpen={escolhendoCampo} onOpenChange={setEscolhendoCampo}>
        {/* Tracejado: a única borda da barra que promete algo em vez de
            afirmar. Disabled some do fluxo visual sem sumir do DOM — a barra
            não pode encolher e crescer conforme a tela responde. */}
        <ButtonAria
          ref={adicionar}
          isDisabled={disabled ?? false}
          aria-label={
            filtros.length > 0
              ? `Adicionar filtro — ${filtros.length} aplicado(s)`
              : 'Adicionar filtro — nenhum aplicado'
          }
          className={cn(
            CHIP,
            't-ui gap-1 border border-rule-hair border-dashed px-2.5 disabled:text-rule-disabled',
          )}
          style={{ color: 'var(--n-700)' }}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Filtro
        </ButtonAria>
        <Popover className="w-56 p-0" placement="bottom start">
          <Command>
            <CommandInput placeholder="Buscar campo…" />
            <CommandList
              renderEmptyState={() => (
                <div className="t-meta py-6 text-center">Nenhum campo encontrado.</div>
              )}
            >
              {campos.map((campo) => (
                <CommandItem
                  key={campo.id}
                  id={campo.id}
                  textValue={campo.rotulo}
                  onAction={() => acrescentar(campo)}
                >
                  {campo.icon ? <campo.icon className="size-4" /> : null}
                  <span className="truncate">{campo.rotulo}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </Popover>
      </PopoverTrigger>

      {/* `Limpar` só a partir do segundo chip: com um filtro, o `×` dele já é o
          limpar, e um segundo controle para o mesmo gesto seria ruído fixo na
          barra. Com três, apagar um a um são três cliques e três consultas. */}
      {filtros.length > 1 ? (
        <button
          type="button"
          aria-label="Limpar filtros"
          className="t-meta px-1 underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
          onClick={() => {
            onFiltrosChange([])
            adicionar.current?.focus()
          }}
        >
          Limpar
        </button>
      ) : null}
    </>
  )
}
