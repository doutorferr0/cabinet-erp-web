import {
  ControleDeValor,
  SelectBrut,
  SeletorDeCampo,
  SeletorDeOperador,
} from '@/components/cabinet/filtro-controles'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import {
  type CampoFiltravel,
  type FiltroDaTabela,
  JUNCOES,
  type Juncao,
  ROTULO_DA_JUNCAO,
  novoFiltroId,
  operadorPadrao,
} from '@/lib/filtro-de-consulta'
import { Filter, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'

export interface ListaDeFiltrosProps {
  campos: readonly CampoFiltravel[]
  filtros: FiltroDaTabela[]
  juncao: Juncao
  onFiltrosChange: (filtros: FiltroDaTabela[]) => void
  onJuncaoChange: (juncao: Juncao) => void
  disabled?: boolean
}

/**
 * FILTRO EM LISTA — o query-builder estilo Notion, portado de
 * sadmann7/shadcn-table (MIT, `data-table-filter-list.tsx`). Ver `NOTICE`.
 *
 * Cada linha é uma frase completa — `Onde` · campo · operador · valor —, e a
 * segunda linha traz o `e`/`ou` que vale para a lista inteira. É o modo denso:
 * mostra todas as condições de uma vez, e é onde se monta consulta de três
 * cláusulas sem perder de vista o que já foi escrito.
 *
 * ## O que ficou diferente do original
 *
 * - **A junção é uma só, e aparece uma vez.** Como no original: escolhida na
 *   segunda linha, ecoada em cinza nas seguintes. Junção por linha permitiria
 *   `A e B ou C`, cuja precedência ninguém lê corretamente numa lista sem
 *   parênteses.
 * - **Sem alça de arrastar.** Com junção única a ordem não muda o resultado —
 *   reordenar custaria uma dependência de drag-and-drop por um ganho estético.
 * - **Sem `Ctrl+Shift+F` e sem `Backspace` para apagar filtro.** Interface por
 *   clique (CLAUDE.md): toda ação daqui tem botão, e o teclado é o nativo do
 *   controle focado.
 * - **O gatilho É o botão `Filtro` da barra padrão** (§9, padrão 4), não um botão
 *   a mais. A barra tem posição fixa em oito telas; acrescentar um segundo botão
 *   de filtro ao lado do primeiro faria o operador escolher entre dois caminhos
 *   para a mesma coisa.
 */
export function ListaDeFiltros({
  campos,
  filtros,
  juncao,
  onFiltrosChange,
  onJuncaoChange,
  disabled,
}: ListaDeFiltrosProps) {
  const [aberto, setAberto] = useState(false)
  const tituloId = useId()

  function adicionar() {
    const campo = campos[0]
    if (!campo) return
    onFiltrosChange([
      ...filtros,
      {
        filtroId: novoFiltroId(),
        id: campo.id,
        variante: campo.variante,
        operador: operadorPadrao(campo.variante),
        valor: campo.variante === 'multiSelect' ? [] : '',
      },
    ])
  }

  function atualizar(filtroId: string, mudanca: Partial<Omit<FiltroDaTabela, 'filtroId'>>) {
    onFiltrosChange(
      filtros.map((filtro) => (filtro.filtroId === filtroId ? { ...filtro, ...mudanca } : filtro)),
    )
  }

  function remover(filtroId: string) {
    onFiltrosChange(filtros.filter((filtro) => filtro.filtroId !== filtroId))
  }

  return (
    <PopoverTrigger isOpen={aberto} onOpenChange={setAberto}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled ?? false}
        aria-label={
          filtros.length > 0 ? `Filtro — ${filtros.length} aplicado(s)` : 'Filtro — nenhum aplicado'
        }
      >
        <Filter aria-hidden="true" className="text-modulo" />
        Filtro
        {/* A contagem fica em Meta tabular, como toda cifra pequena da listagem:
            o operador precisa saber que há filtro ativo mesmo com o painel
            fechado — senão "sumiu registro" vira chamado de suporte. */}
        {filtros.length > 0 ? (
          <span className="ml-1 border-2 border-border bg-primary px-1 font-mono text-[10px] tabular-nums text-primary-foreground">
            {filtros.length}
          </span>
        ) : null}
      </Button>

      <Popover className="w-auto max-w-[min(46rem,calc(100vw-2rem))] p-4" placement="bottom start">
        <div className="flex flex-col gap-3">
          <h4 id={tituloId} className="font-mono text-xs uppercase tracking-[0.12em]">
            {filtros.length > 0 ? 'Filtros' : 'Nenhum filtro aplicado'}
          </h4>

          {filtros.length > 0 ? (
            <ul className="flex max-h-[19rem] flex-col gap-2 overflow-y-auto p-1">
              {filtros.map((filtro, indice) => {
                const campo = campos.find((c) => c.id === filtro.id) ?? campos[0]
                if (!campo) return null
                const ordem = indice + 1
                return (
                  <li key={filtro.filtroId} className="flex items-center gap-2">
                    <div className="w-16 shrink-0 text-sm text-muted-foreground">
                      {indice === 0 ? (
                        'Onde'
                      ) : indice === 1 ? (
                        <SelectBrut
                          aria-label="Junção entre os filtros"
                          className="w-full"
                          value={juncao}
                          onChange={(e) => onJuncaoChange(e.target.value as Juncao)}
                        >
                          {JUNCOES.map((opcao) => (
                            <option key={opcao} value={opcao}>
                              {ROTULO_DA_JUNCAO[opcao]}
                            </option>
                          ))}
                        </SelectBrut>
                      ) : (
                        ROTULO_DA_JUNCAO[juncao]
                      )}
                    </div>

                    <SeletorDeCampo
                      campos={campos}
                      valor={filtro.id}
                      rotulo={`Campo do filtro ${ordem}`}
                      className="w-36 shrink-0"
                      onChange={(novo) =>
                        atualizar(filtro.filtroId, {
                          id: novo.id,
                          variante: novo.variante,
                          operador: operadorPadrao(novo.variante),
                          valor: novo.variante === 'multiSelect' ? [] : '',
                        })
                      }
                    />

                    <SeletorDeOperador
                      filtro={filtro}
                      rotulo={`Operador do filtro ${ordem}`}
                      className="w-36 shrink-0"
                      onChange={(operador) =>
                        atualizar(filtro.filtroId, {
                          operador,
                          // Trocar para "está vazio" descarta o que estava
                          // digitado: o valor não some da tela por acaso, ele
                          // deixou de fazer parte da frase.
                          ...(operador === 'isEmpty' || operador === 'isNotEmpty'
                            ? { valor: '' }
                            : {}),
                        })
                      }
                    />

                    <div className="min-w-36 flex-1">
                      <ControleDeValor
                        filtro={filtro}
                        campo={campo}
                        rotulo={`Valor do filtro ${ordem}`}
                        className="w-full"
                        onChange={(valor) => atualizar(filtro.filtroId, { valor })}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Remover o filtro ${ordem}`}
                      onClick={() => remover(filtro.filtroId)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Adicione condições para estreitar a consulta.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={adicionar}>
              Adicionar filtro
            </Button>
            {filtros.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onFiltrosChange([])
                  onJuncaoChange('and')
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>
      </Popover>
    </PopoverTrigger>
  )
}
