import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import {
  type CampoFiltravel,
  type FiltroDaTabela,
  type OperadorDeFiltro,
  dispensaValor,
  operadoresDaVariante,
} from '@/lib/filtro-de-consulta'
import { cn } from '@/lib/utils'
import { ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'

/**
 * Peças de UMA linha de filtro: campo, operador e valor.
 *
 * Existem separadas porque os dois modos de filtro da listagem — a lista
 * query-builder (`ListaDeFiltros`) e a paleta de comandos (`MenuDeFiltros`) —
 * montam a MESMA frase com a mesma gramática, mudando só o arranjo. Duplicar
 * daria duas gramáticas divergindo em silêncio: a variante `multiSelect` ganha
 * um operador num modo e não no outro, e ninguém percebe até a tela responder
 * diferente conforme onde o operador clicou.
 *
 * Portado de sadmann7/shadcn-table (MIT) — ver `src/lib/filtro-de-consulta.ts`
 * e o `NOTICE` da raiz. Os controles do original que dependem de componente
 * ausente aqui (Calendar, Slider, Faceted) foram refeitos sobre o que o repo
 * tem: `<select>` nativo com a caixa preta de 2px e o Command sobre RAC.
 */

/** Caixa preta 2px, radius 0 — a mesma dos selects do formulário e do rodapé da tabela. */
const CAIXA_DE_SELECT =
  'h-8 border-2 border-input bg-card px-2 text-sm outline-none focus-visible:focus-ring disabled:opacity-50'

export function SelectBrut({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(CAIXA_DE_SELECT, className)} {...props} />
}

interface SeletorDeCampoProps {
  campos: readonly CampoFiltravel[]
  valor: string
  onChange: (campo: CampoFiltravel) => void
  /** Rótulo acessível — muda conforme o modo ("Campo do filtro 2"). */
  rotulo: string
  className?: string
}

/**
 * Escolha do campo por Combobox de busca (Command dentro de Popover), não por
 * `<select>`: listagem de documento chega a ter dezenas de campos filtráveis, e
 * um select nativo com trinta linhas obriga a percorrer tudo com o olho. É o
 * mesmo padrão do `LookupCombo` (§9 padrão 2), sem o botão de cadastro rápido —
 * campo filtrável não se cadastra.
 */
export function SeletorDeCampo({
  campos,
  valor,
  onChange,
  rotulo,
  className,
}: SeletorDeCampoProps) {
  const [aberto, setAberto] = useState(false)
  const atual = campos.find((campo) => campo.id === valor)

  return (
    <PopoverTrigger isOpen={aberto} onOpenChange={setAberto}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={rotulo}
        className={cn('justify-between font-normal', className)}
      >
        <span className="truncate">{atual?.rotulo ?? 'Escolha o campo'}</span>
        <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
      </Button>
      <Popover className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Buscar campo…" />
          <CommandList
            renderEmptyState={() => (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum campo encontrado.
              </div>
            )}
            selectionMode="single"
            selectedKeys={[valor]}
          >
            {campos.map((campo) => (
              <CommandItem
                key={campo.id}
                id={campo.id}
                textValue={campo.rotulo}
                onAction={() => {
                  onChange(campo)
                  setAberto(false)
                }}
              >
                {campo.icon ? <campo.icon className="size-4 text-modulo" /> : null}
                <span className="truncate">{campo.rotulo}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </Popover>
    </PopoverTrigger>
  )
}

interface SeletorDeOperadorProps {
  filtro: FiltroDaTabela
  onChange: (operador: OperadorDeFiltro) => void
  rotulo: string
  className?: string
}

export function SeletorDeOperador({ filtro, onChange, rotulo, className }: SeletorDeOperadorProps) {
  return (
    <SelectBrut
      aria-label={rotulo}
      value={filtro.operador}
      className={className}
      onChange={(e) => onChange(e.target.value as OperadorDeFiltro)}
    >
      {operadoresDaVariante(filtro.variante).map((operador) => (
        <option key={operador.valor} value={operador.valor}>
          {operador.rotulo}
        </option>
      ))}
    </SelectBrut>
  )
}

interface ControleDeValorProps {
  filtro: FiltroDaTabela
  campo: CampoFiltravel
  onChange: (valor: string | string[]) => void
  rotulo: string
  className?: string
}

function primeiro(valor: string | string[]): string {
  return Array.isArray(valor) ? (valor[0] ?? '') : valor
}

/**
 * O campo de valor, conforme a variante — e NADA quando o operador dispensa
 * valor.
 *
 * "está vazio" não tem o que digitar. O original deixa no lugar uma caixa cinza
 * inerte; aqui ela some. Controle desabilitado sem explicação é o convite a
 * clicar de novo achando que travou — e a frase "Setor está vazio" já se lê
 * inteira sem ele.
 */
export function ControleDeValor({
  filtro,
  campo,
  onChange,
  rotulo,
  className,
}: ControleDeValorProps) {
  const [aberto, setAberto] = useState(false)

  if (dispensaValor(filtro.operador)) return null

  if (filtro.variante === 'boolean') {
    return (
      <SelectBrut
        aria-label={rotulo}
        className={className}
        value={primeiro(filtro.valor)}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </SelectBrut>
    )
  }

  if (filtro.variante === 'select') {
    return (
      <SelectBrut
        aria-label={rotulo}
        className={className}
        value={primeiro(filtro.valor)}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        {campo.opcoes?.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </SelectBrut>
    )
  }

  if (filtro.variante === 'multiSelect') {
    const marcados = Array.isArray(filtro.valor) ? filtro.valor : [filtro.valor].filter(Boolean)
    const resumo =
      marcados.length === 0
        ? 'Selecione…'
        : marcados.length === 1
          ? (campo.opcoes?.find((o) => o.valor === marcados[0])?.rotulo ?? marcados[0])
          : `${marcados.length} selecionados`

    return (
      <PopoverTrigger isOpen={aberto} onOpenChange={setAberto}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={rotulo}
          className={cn('justify-between font-normal', className)}
        >
          <span className="truncate">{resumo}</span>
          <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
        </Button>
        <Popover className="w-56 p-0">
          <Command>
            <CommandInput placeholder="Buscar opção…" />
            {/* Múltipla escolha é a seleção do próprio Menu (RAC): o Check do
                `CommandItem` já acende por `data-selected`, e o popover fica
                aberto entre um clique e outro — marcar cinco opções não deveria
                custar cinco reaberturas. */}
            <CommandList
              selectionMode="multiple"
              selectedKeys={marcados}
              renderEmptyState={() => (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma opção encontrada.
                </div>
              )}
              onSelectionChange={(chaves) => {
                if (chaves === 'all') {
                  onChange((campo.opcoes ?? []).map((o) => o.valor))
                  return
                }
                onChange([...chaves].map(String))
              }}
            >
              {campo.opcoes?.map((opcao) => (
                <CommandItem key={opcao.valor} id={opcao.valor} textValue={opcao.rotulo}>
                  <span className="truncate">{opcao.rotulo}</span>
                </CommandItem>
              )) ?? []}
            </CommandList>
          </Command>
        </Popover>
      </PopoverTrigger>
    )
  }

  const numerico = filtro.variante === 'number'

  if (numerico && filtro.operador === 'isBetween') {
    const [de = '', ate = ''] = Array.isArray(filtro.valor) ? filtro.valor : [filtro.valor, '']
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Input
          aria-label={`${rotulo} — de`}
          className="h-8 min-w-0"
          inputMode="numeric"
          value={de}
          onChange={(e) => onChange([e.target.value, ate])}
        />
        <span className="text-sm text-muted-foreground">a</span>
        <Input
          aria-label={`${rotulo} — até`}
          className="h-8 min-w-0"
          inputMode="numeric"
          value={ate}
          onChange={(e) => onChange([de, e.target.value])}
        />
      </div>
    )
  }

  return (
    <Input
      aria-label={rotulo}
      className={cn('h-8', className)}
      inputMode={numerico ? 'numeric' : undefined}
      placeholder={campo.placeholder ?? 'Digite um valor…'}
      value={primeiro(filtro.valor)}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
