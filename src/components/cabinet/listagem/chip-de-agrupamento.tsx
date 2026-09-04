import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Layers, X } from 'lucide-react'
import { useRef, useState } from 'react'

/** Campo oferecido no `Agrupar`, na forma que o chip precisa para desenhar. */
export interface CampoDeAgrupamento {
  id: string
  rotulo: string
}

export interface ChipDeAgrupamentoProps {
  campos: readonly CampoDeAgrupamento[]
  /** Campo agrupado AGORA. Vazio = a listagem não está agrupada. */
  valor: string
  onChange: (campo: string) => void
  disabled?: boolean
}

/**
 * CHIP `Agrupar: Situação ×` — o agrupamento visível na barra (D10).
 *
 * Mesmo idioma da pílula de filtro (`filtros/pilulas-de-filtro.tsx`, #199), e
 * pelo mesmo motivo: agrupamento é ESTADO DA CONSULTA, não preferência
 * escondida num menu. Uma grade partida em faixas com subtotal é uma tela
 * diferente da lista corrida, e quem chega nela depois do café precisa ler na
 * barra por que ela está assim — um `<select>` mostraria o campo escolhido do
 * mesmo jeito que mostra o não escolhido, e o estado "sem agrupamento"
 * precisaria de uma opção `— Nenhum —` que é justamente a que ninguém procura.
 *
 * Duas metades, como a pílula: o CORPO abre a lista para trocar de campo, o `×`
 * desliga. São botões irmãos dentro da mesma caixa de 2px — um alvo só faria
 * "trocar" e "desligar" disputarem o mesmo pixel, e desligar é o gesto que se
 * repete (agrupa, confere o subtotal, volta à lista corrida).
 *
 * O DESENHO é o do mockup 2.0 (`.chip.grpby`): pílula de 28px, borda de tinta
 * e fundo `--main-soft`, contra o convite em traço sobre transparente. Não é
 * enfeite — é a mesma gramática do `+ Filtro` ao lado, e é o que faz a barra
 * dizer de longe quantas condições estão LIGADAS.
 *
 * Sem campo escolhido não há chip: há o botão `Agrupar`, que é o convite. O
 * componente não sabe agrupar nada — quem soma e desenha a faixa é a
 * `VitraDataTable`; aqui só se escolhe por qual campo.
 */
export function ChipDeAgrupamento({ campos, valor, onChange, disabled }: ChipDeAgrupamentoProps) {
  const [escolhendo, setEscolhendo] = useState(false)
  // Vizinho que sempre existe: o `×` sai do documento junto com o chip, e o
  // foco cairia no `<body>` — quem usa teclado perderia o lugar na barra.
  const ligar = useRef<HTMLButtonElement>(null)
  const campoAtivo = campos.find((campo) => campo.id === valor) ?? null

  // Escolher FECHA a lista: o popover é modal (RAC) e, aberto, tira o resto da
  // barra da árvore acessível — a grade se parte em faixas atrás de um painel
  // que ninguém mandou continuar aberto.
  function escolher(campo: string) {
    setEscolhendo(false)
    onChange(campo)
  }

  if (campoAtivo === null) {
    return (
      <PopoverTrigger isOpen={escolhendo} onOpenChange={setEscolhendo}>
        <Button
          ref={ligar}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled ?? false}
          // CONVITE = chip TRACEJADO (mockup §Ordens, o mesmo desenho do
          // `+ Filtro`): o traço diz "aqui cabe uma condição que ainda não
          // existe". Sólido é o estado APLICADO — dar ao convite a mesma caixa
          // do aplicado faria a barra parecer sempre agrupada.
          className="t-ui h-7 gap-[var(--s-2)] rounded-[var(--r-pill)] border border-[var(--hairline-2)] border-dashed bg-transparent px-2.5 font-normal"
          aria-label="Agrupar a listagem por um campo — nenhum agrupamento aplicado"
        >
          <Layers aria-hidden="true" className="size-3.5" />
          Agrupar
        </Button>
        <ListaDeCampos campos={campos} aoEscolher={escolher} />
      </PopoverTrigger>
    )
  }

  return (
    // APLICADO = chip SÓLIDO em `--main-soft` com borda de tinta (mockup
    // `.chip.grpby`). Chartreuse aqui é FUNDO, nunca texto — o rótulo fica em
    // n-900 e é o único jeito de o acento passar em contraste.
    <div className="flex h-7 items-center overflow-hidden rounded-[var(--r-pill)] border border-[var(--n-900)] bg-[var(--main-soft)]">
      <PopoverTrigger isOpen={escolhendo} onOpenChange={setEscolhendo}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="t-ui h-full gap-[var(--s-2)] rounded-none bg-transparent pr-2 pl-2.5 font-normal"
          aria-label={`Trocar o agrupamento — agrupado por ${campoAtivo.rotulo}`}
        >
          <Layers aria-hidden="true" className="size-3.5" />
          {/* O CAMPO em 600 e o verbo em 400: dentro do Inter a hierarquia é
              peso e cor, nunca tamanho (§Hierarquia) — quem varre a barra
              procura por qual campo, não pela palavra `Agrupar`. */}
          <span className="max-w-56 truncate">
            Agrupar <b className="font-semibold">{campoAtivo.rotulo}</b>
          </span>
        </Button>
        <ListaDeCampos campos={campos} aoEscolher={escolher} />
      </PopoverTrigger>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-full rounded-none bg-transparent pr-2.5 pl-0 text-muted-foreground"
        aria-label={`Desagrupar — remover o agrupamento por ${campoAtivo.rotulo}`}
        onClick={() => {
          onChange('')
          ligar.current?.focus()
        }}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

function ListaDeCampos({
  campos,
  aoEscolher,
}: {
  campos: readonly CampoDeAgrupamento[]
  aoEscolher: (campo: string) => void
}) {
  return (
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
              onAction={() => aoEscolher(campo.id)}
            >
              <span className="truncate">{campo.rotulo}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </Popover>
  )
}
