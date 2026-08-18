import { ControleDeValor, SeletorDeOperador } from '@/components/cabinet/filtro-controles'
import { resumoDoFiltro } from '@/components/cabinet/filtros/resumo-do-filtro'
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
import { useRef, useState } from 'react'

/**
 * PÍLULAS DE FILTRO (#199) — a pergunta em frases, cada uma com o seu `×`.
 *
 * Portado em espírito de `polaris.shopify.com/components/…/filters`, sobre o
 * vocabulário de filtro que já existia aqui (`filtro-de-consulta.ts`, de
 * sadmann7/shadcn-table — ver `NOTICE`).
 *
 * ## Por que substitui o painel em lista
 *
 * O painel (`ListaDeFiltros`) mostra as condições como um formulário: uma linha
 * por filtro, com campo, operador e valor abertos ao mesmo tempo. Ele é bom para
 * MONTAR uma pergunta longa e caro para MANTER uma curta — ocupa um bloco
 * vertical inteiro para dizer "Nome contém STELLA", e some quando o popover
 * fecha, de modo que a listagem filtrada não mostra por que está filtrada. A
 * pílula inverte: o que fica na barra é a frase pronta, e o formulário só
 * aparece na condição que a pessoa foi editar.
 *
 * ## Um clique para remover — é o requisito, não um detalhe
 *
 * O `×` de cada pílula age direto: sem abrir popover, sem confirmar. Remover
 * condição errada é barato de desfazer (basta remontar) e caríssimo de exigir
 * três cliques, porque é o gesto mais repetido de quem está garimpando uma
 * lista. Por isso ele é um botão PRÓPRIO, irmão do corpo da pílula, e não uma
 * área dentro dele: um alvo só faria o clique de remover e o de editar
 * disputarem o mesmo pixel.
 *
 * ## A junção se troca entre as pílulas, e vale para todas
 *
 * `e`/`ou` é uma escolha só para a lista inteira (herdada do original, ver
 * `Juncao`), então a mesma palavra aparece entre cada par. Todas as ocorrências
 * são o MESMO controle mostrado de novo — clicar em qualquer uma vira a frase
 * inteira, e o rótulo assistivo diz isso em vez de deixar a pessoa descobrir
 * pelo resultado. A alternativa (um seletor único, longe das pílulas) já existiu
 * no painel em lista e é a que faz a pessoa procurar onde se muda o "e".
 */

export interface PilulasDeFiltroProps {
  campos: readonly CampoFiltravel[]
  filtros: FiltroDaTabela[]
  juncao: Juncao
  onFiltrosChange: (filtros: FiltroDaTabela[]) => void
  onJuncaoChange: (juncao: Juncao) => void
  disabled?: boolean
}

export function PilulasDeFiltro({
  campos,
  filtros,
  juncao,
  onFiltrosChange,
  onJuncaoChange,
  disabled,
}: PilulasDeFiltroProps) {
  const [escolhendoCampo, setEscolhendoCampo] = useState(false)
  // A pílula recém-nascida abre sozinha: escolher o campo e não ter onde digitar
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
    // O `×` clicado sai do documento junto com a pílula, e o foco cairia no
    // `<body>` — quem usa teclado perderia o lugar na barra. `Adicionar filtro`
    // é o vizinho que sempre existe.
    adicionar.current?.focus()
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filtros.map((filtro, indice) => {
        const campo = campos.find((c) => c.id === filtro.id)
        if (!campo) return null
        const ordem = indice + 1
        return (
          <div key={filtro.filtroId} className="flex flex-wrap items-center gap-1.5">
            {indice > 0 ? (
              <button
                type="button"
                aria-label={`Junção entre os filtros: ${ROTULO_DA_JUNCAO[juncao]} — trocar para ${ROTULO_DA_JUNCAO[juncao === 'and' ? 'or' : 'and']} em todos`}
                className="px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
                onClick={() => onJuncaoChange(juncao === 'and' ? 'or' : 'and')}
              >
                {ROTULO_DA_JUNCAO[juncao]}
              </button>
            ) : null}

            {/* A pílula é UMA peça de dois alvos: a frase abre a edição, o `×`
                remove. A caixa de 2px em volta é o que os junta; bordas
                próprias dariam a impressão de dois filtros soltos. */}
            <div className="flex h-8 items-center border-2 border-border bg-card">
              <PopoverTrigger
                isOpen={emEdicao === filtro.filtroId}
                onOpenChange={(aberto) => setEmEdicao(aberto ? filtro.filtroId : null)}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-full rounded-none px-2 font-normal"
                  aria-label={`Editar o filtro ${ordem}: ${resumoDoFiltro(filtro, campo)}`}
                >
                  {campo.icon ? (
                    <campo.icon aria-hidden="true" className="size-4 text-modulo" />
                  ) : null}
                  <span className="max-w-56 truncate">{resumoDoFiltro(filtro, campo)}</span>
                </Button>
                <Popover className="w-72 p-3" placement="bottom start">
                  <div className="flex flex-col gap-2">
                    <p className="font-mono text-xs uppercase tracking-[0.12em]">{campo.rotulo}</p>
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

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-none"
                aria-label={`Remover o filtro ${ordem}: ${resumoDoFiltro(filtro, campo)}`}
                onClick={() => remover(filtro.filtroId)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        )
      })}

      <PopoverTrigger isOpen={escolhendoCampo} onOpenChange={setEscolhendoCampo}>
        <Button
          ref={adicionar}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? false}
          aria-label={
            filtros.length > 0
              ? `Adicionar filtro — ${filtros.length} aplicado(s)`
              : 'Adicionar filtro — nenhum aplicado'
          }
        >
          <Filter aria-hidden="true" className="text-modulo" />
          Adicionar filtro
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
                  onAction={() => acrescentar(campo)}
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
          variant="ghost"
          size="sm"
          aria-label="Limpar filtros"
          onClick={() => {
            onFiltrosChange([])
            adicionar.current?.focus()
          }}
        >
          Limpar
        </Button>
      ) : null}
    </div>
  )
}
