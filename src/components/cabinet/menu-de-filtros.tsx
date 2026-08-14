import { ControleDeValor, SeletorDeOperador } from '@/components/cabinet/filtro-controles'
import { Button } from '@/components/ui/button'
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
import { Filter, X } from 'lucide-react'
import { useState } from 'react'

export interface MenuDeFiltrosProps {
  campos: readonly CampoFiltravel[]
  filtros: FiltroDaTabela[]
  juncao: Juncao
  onFiltrosChange: (filtros: FiltroDaTabela[]) => void
  disabled?: boolean
}

/**
 * FILTRO EM PALETA DE COMANDOS — portado de sadmann7/shadcn-table (MIT,
 * `data-table-filter-menu.tsx`). Ver `NOTICE`.
 *
 * O modo enxuto: o `Filtro` abre uma lista de campos buscável, o campo escolhido
 * vira etiqueta na própria barra, e a etiqueta continua editável (operador e
 * valor) sem reabrir nada. Vale onde a listagem tem poucas condições ao mesmo
 * tempo e o espaço vertical é caro — a lista query-builder ocupa um painel; a
 * paleta ocupa uma linha.
 *
 * ## O que ficou diferente do original
 *
 * - **Um passo, não dois.** No original, escolher o campo mantém o popover
 *   aberto para digitar o valor ali dentro. Aqui a etiqueta nasce assim que o
 *   campo é escolhido, já com o operador padrão, e o valor se preenche NELA. O
 *   motivo é o mesmo do resto da barra: o controle onde o dado fica é o controle
 *   onde o dado se edita — digitar num lugar e conferir em outro é o que faz o
 *   operador reabrir o painel para ter certeza.
 * - **A junção não se edita aqui.** Ela aparece entre as etiquetas, em cinza,
 *   como leitura. Quem a troca é o modo lista, que tem onde mostrar a frase
 *   inteira. Dois lugares para mudar a mesma coisa, um deles sem contexto, é
 *   convite a mudar sem perceber.
 * - **Sem `Ctrl+Shift+F` e sem `Backspace` que apaga a última etiqueta** —
 *   interface por clique (CLAUDE.md). Cada etiqueta tem o seu `×`.
 */
export function MenuDeFiltros({
  campos,
  filtros,
  juncao,
  onFiltrosChange,
  disabled,
}: MenuDeFiltrosProps) {
  const [aberto, setAberto] = useState(false)

  function adicionar(campo: CampoFiltravel) {
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
    setAberto(false)
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
    <div className="flex flex-wrap items-center gap-2">
      {filtros.map((filtro, indice) => {
        const campo = campos.find((c) => c.id === filtro.id)
        if (!campo) return null
        const ordem = indice + 1
        return (
          <div key={filtro.filtroId} className="flex flex-wrap items-center gap-1">
            {indice > 0 ? (
              <span className="px-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {ROTULO_DA_JUNCAO[juncao]}
              </span>
            ) : null}
            {/* A etiqueta é UMA peça: caixa preta de 2px em volta, controles
                encostados por dentro. Cada controle com a sua borda daria a
                impressão de três filtros soltos onde há um. */}
            <div className="flex h-8 items-center gap-1 border-2 border-border bg-card px-1">
              <span className="flex items-center gap-1 pl-1 text-sm">
                {campo.icon ? (
                  <campo.icon aria-hidden="true" className="size-4 text-modulo" />
                ) : null}
                {campo.rotulo}
              </span>
              <SeletorDeOperador
                filtro={filtro}
                rotulo={`Operador do filtro ${ordem}`}
                className="h-6 border-0 bg-transparent px-1 text-muted-foreground"
                onChange={(operador) =>
                  atualizar(filtro.filtroId, {
                    operador,
                    ...(operador === 'isEmpty' || operador === 'isNotEmpty' ? { valor: '' } : {}),
                  })
                }
              />
              {dispensaValor(filtro.operador) ? null : (
                <ControleDeValor
                  filtro={filtro}
                  campo={campo}
                  rotulo={`Valor do filtro ${ordem}`}
                  className="h-6 w-32"
                  onChange={(valor) => atualizar(filtro.filtroId, { valor })}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover o filtro ${ordem}`}
                onClick={() => remover(filtro.filtroId)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        )
      })}

      <PopoverTrigger isOpen={aberto} onOpenChange={setAberto}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? false}
          aria-label={
            filtros.length > 0
              ? `Filtro — ${filtros.length} aplicado(s)`
              : 'Filtro — nenhum aplicado'
          }
        >
          <Filter aria-hidden="true" className="text-modulo" />
          Filtro
        </Button>
        <Popover className="w-56 p-0" placement="bottom start">
          <Command>
            <CommandInput placeholder="Buscar campo…" />
            <CommandList
              renderEmptyState={() => (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum campo encontrado.
                </div>
              )}
            >
              {campos.map((campo) => (
                <CommandItem
                  key={campo.id}
                  id={campo.id}
                  textValue={campo.rotulo}
                  onAction={() => adicionar(campo)}
                >
                  {campo.icon ? <campo.icon className="size-4 text-modulo" /> : null}
                  <span className="truncate">{campo.rotulo}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </Popover>
      </PopoverTrigger>

      {filtros.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Limpar filtros"
          onClick={() => onFiltrosChange([])}
        >
          Limpar
        </Button>
      ) : null}
    </div>
  )
}
