import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import {
  type CadastroDeApoio,
  type LookupKind,
  lookupLabel,
  nomeDoLookup,
  useCadastrarItemDeApoio,
  useLookupOptions,
} from '@/data/lookups-api'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, MoreHorizontal } from 'lucide-react'
import { useId, useState } from 'react'

export interface LookupComboProps {
  kind: LookupKind
  /** O ID do item escolhido — não o nome (issue #94). */
  value: string | null
  onChange: (value: string | null) => void
  /**
   * Nome que o REGISTRO trouxe, para quando o id não está na lista carregada:
   * item desativado depois de gravado, ou lista cortada no teto de 100.
   *
   * Sem ele o campo mostraria o id cru ou, pior, ficaria em branco — e gravar
   * de novo apagaria um valor que ninguém pediu para apagar. É o mesmo cuidado
   * que o `LookupSelectField` já tomava pondo o valor corrente na lista.
   */
  rotulo?: string | null | undefined
  disabled?: boolean
  id?: string
  /** Esconde o botão "..." (usado onde a transcrição tem `[combo]` puro, sem cadastro rápido). */
  hideQuickAdd?: boolean | undefined
}

/**
 * Padrão `[combo +...]` da transcrição (§9 padrão 2): escolher da lista ou
 * cadastrar item novo sem sair da tela (botão "..." → Dialog de cadastro rápido).
 * Base RAC: PopoverTrigger envolve botão E popover; a lista é Autocomplete+Menu.
 */
export function LookupCombo({
  kind,
  value,
  onChange,
  rotulo,
  disabled,
  id,
  hideQuickAdd,
}: LookupComboProps) {
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newItem, setNewItem] = useState('')
  /**
   * O nome que o servidor recusou por 409 E que esta lista não tem — o único
   * caso que o combo não resolve sozinho, e por isso o único que vira aviso.
   */
  const [duplicadoForaDaLista, setDuplicadoForaDaLista] = useState<string | null>(null)
  const fallbackId = useId()
  const listId = id ?? fallbackId

  const label = lookupLabel(kind)

  // As opções vêm do servidor (ADR-011). O rótulo continua local: rótulo é UI, não dado.
  const { options, truncada, carregando, erro } = useLookupOptions(kind)
  const { cadastrar, gravando, erro: erroDoCadastro, limparErro } = useCadastrarItemDeApoio(kind)

  // O que aparece no botão: o nome do id escolhido; se o id não está na lista,
  // o rótulo que o registro trouxe. Ver `rotulo` nas props.
  const escolhido = nomeDoLookup(options, value) ?? (value ? (rotulo ?? undefined) : undefined)

  /**
   * O cadastro rápido é `POST /api/catalog-lookups` — não mais um item de
   * mentira em estado local.
   *
   * Caixa alta porque o vocabulário de apoio é caixa alta no legado inteiro, e
   * um `arquiteto` minúsculo no meio de uma lista maiúscula parece outro item.
   *
   * **409 não é erro, é a resposta.** O item que o operador quer já existe, e o
   * combo escolhe o existente em vez de dizer "falhou": cadastrar de novo é o
   * par duplicado que o contrato recusa. Quando o nome não está entre as opções
   * carregadas (item desativado, ou lista cortada no teto de 100), o campo NÃO
   * escolhe nada — id chutado gravaria a referência errada — e diz por quê.
   */
  async function confirmAdd() {
    const nome = newItem.trim().toLocaleUpperCase()
    if (!nome) return

    let resultado: CadastroDeApoio
    try {
      resultado = await cadastrar({ nome, opcoesCarregadas: options })
    } catch {
      // Falha de verdade (400/500/rede) fica em `erroDoCadastro` e aparece no
      // diálogo — o campo não fecha, e nada é escolhido no lugar.
      return
    }

    if (resultado.estado === 'duplicado') {
      if (resultado.existente) {
        onChange(resultado.existente.id)
        fecharCadastro()
        return
      }
      setDuplicadoForaDaLista(resultado.nome)
      return
    }

    onChange(resultado.item.id)
    fecharCadastro()
  }

  function fecharCadastro() {
    setNewItem('')
    setDuplicadoForaDaLista(null)
    limparErro()
    setAddOpen(false)
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-1">
      <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
        <Button
          id={listId}
          type="button"
          variant="outline"
          disabled={disabled ?? false}
          className={cn(
            'w-full min-w-0 shrink justify-between font-normal',
            !escolhido && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{escolhido ?? `Selecione ${label.toLowerCase()}…`}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-foreground" />
        </Button>
        <Popover className="w-(--trigger-width) p-0">
          <Command>
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}…`} />
            <CommandList
              renderEmptyState={() => (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {/* Estados distintos DE PROPÓSITO: "carregando" e "falhou" não podem
                      parecer "lista vazia" — o operador precisa saber se deve esperar,
                      avisar alguém, ou é a lista que está mesmo vazia. */}
                  {carregando
                    ? 'Carregando…'
                    : erro
                      ? 'Não foi possível carregar a lista.'
                      : 'Nenhum item encontrado.'}
                </div>
              )}
            >
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  id={option.id}
                  textValue={option.nome}
                  onAction={() => {
                    onChange(option.id === value ? null : option.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('size-4', option.id === value ? 'opacity-100' : 'opacity-0')}
                  />
                  {option.nome}
                </CommandItem>
              ))}
            </CommandList>
            {/* A lista veio CORTADA no teto de 100 do contrato, e a busca deste
                campo filtra só o que chegou: o item procurado pode nem estar
                aqui. Sem este aviso, "não encontrei" e "não existe" viram a
                mesma coisa — e o operador cadastraria duplicado pelo "...".
                Fora do Menu: a coleção da RAC só aceita itens. */}
            {truncada && (
              <p className="border-rule-hair border-t px-2 py-1.5 text-[0.75rem] text-muted-foreground">
                Mostrando os primeiros {options.length}. A lista é maior — se não achar aqui, o item
                pode existir fora deste trecho.
              </p>
            )}
          </Command>
        </Popover>
      </PopoverTrigger>

      {!hideQuickAdd && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Cadastrar ${label}`}
            disabled={disabled ?? false}
            onClick={() => setAddOpen(true)}
          >
            <MoreHorizontal className="size-4" />
          </Button>
          <Dialog
            isOpen={addOpen}
            onOpenChange={(aberto) => (aberto ? setAddOpen(true) : fecharCadastro())}
            className="max-w-sm"
          >
            <DialogHeader>
              <DialogTitle>Cadastrar {label}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1">
              <Label htmlFor="lookup-quick-add-nome">Nome</Label>
              <Input
                id="lookup-quick-add-nome"
                value={newItem}
                autoFocus
                onChange={(e) => {
                  setNewItem(e.target.value)
                  setDuplicadoForaDaLista(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void confirmAdd()
                  }
                }}
              />
              {/* O 409 que o combo NÃO conseguiu resolver sozinho: o nome existe
                  no kind, mas fora do que esta lista carregou. Dizer só "já
                  existe" mandaria o operador procurar onde ele não vai achar. */}
              {duplicadoForaDaLista && (
                <p role="alert" className="text-[0.8rem] text-foreground">
                  Já existe “{duplicadoForaDaLista}” em {label}, fora das opções carregadas aqui —
                  item desativado, ou lista maior que o trecho exibido. Cadastrar de novo criaria a
                  duplicata que o servidor recusou.
                </p>
              )}
              {erroDoCadastro && (
                <p role="alert" className="text-[0.8rem] text-foreground">
                  Não foi possível cadastrar agora. O item não foi criado.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharCadastro}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void confirmAdd()}
                disabled={!newItem.trim() || gravando}
              >
                {gravando ? 'Gravando…' : 'Gravar'}
              </Button>
            </DialogFooter>
          </Dialog>
        </>
      )}
    </div>
  )
}
