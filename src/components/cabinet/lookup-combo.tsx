import { Campo } from '@/components/cabinet/campo'
import { Monograma } from '@/components/cabinet/monograma'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import {
  type CadastroDeApoio,
  type LookupKind,
  lookupLabel,
  useCadastrarItemDeApoio,
  useLookupOptions,
} from '@/data/lookups-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useEspecificadorOptions } from '@/data/parceiros-api'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * A MOLDURA do combo — botão, popover, lista e o aviso de lista cortada.
 *
 * Existe porque o especificador deixou de ser lista de apoio (#265) e passou a
 * sair de `GET /api/partners`. Sem esta peça, o campo novo nasceria como
 * segunda cópia do popover, e o dia em que o aviso de `truncada` mudasse num
 * lado e não no outro apareceria como dois combos que mentem diferente sobre a
 * mesma coisa. O que varia entre os dois é a FONTE e o cadastro rápido, não o
 * desenho.
 */
export interface ComboDeEscolhaProps {
  /** Nome do que se escolhe, para os textos ("Selecione categoria…"). */
  label: string
  options: readonly OpcaoDeCombo[]
  truncada: boolean
  carregando: boolean
  erro: boolean
  value: string | null
  onChange: (value: string | null) => void
  rotulo?: string | null | undefined
  disabled?: boolean | undefined
  /** Resolvido pelo chamador (`useId`): o `<label>` do campo aponta para ele. */
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Cadastro rápido INLINE (2.0): "Cadastrar marca" como último item da lista,
   * não como um botão `...` ao lado do campo.
   *
   * O `...` era um segundo alvo, fora do popover, para uma ação que só faz
   * sentido depois de o operador procurar e não achar — ele aparecia antes da
   * busca e ficava longe do lugar onde a falta é descoberta. Inline, a saída
   * está onde a procura terminou. Ausente = a lista não aceita item novo (papel
   * sem escrita, ou `hideQuickAdd`).
   */
  aoCriar?: (() => void) | undefined
}

export interface OpcaoDeCombo {
  id: string
  nome: string
  /**
   * Linha de baixo do resultado (documento, cidade, código). Opcional porque a
   * maior parte das listas de apoio é só nome — e quando não há segunda linha, a
   * primeira não pode ficar pendurada num espaço reservado que ninguém preenche.
   */
  subtitulo?: string
}

/** Nome de um id entre as opções carregadas — `undefined` quando não está lá. */
function nomeNasOpcoes(options: readonly OpcaoDeCombo[], id: string | null): string | undefined {
  if (!id) return undefined
  return options.find((o) => o.id === id)?.nome
}

export function ComboDeEscolha({
  label,
  options,
  truncada,
  carregando,
  erro,
  value,
  onChange,
  rotulo,
  disabled,
  id,
  open,
  onOpenChange,
  aoCriar,
}: ComboDeEscolhaProps) {
  // O que aparece no botão: o nome do id escolhido; se o id não está na lista,
  // o rótulo que o registro trouxe. Ver `rotulo` nas props do chamador.
  const escolhido = nomeNasOpcoes(options, value) ?? (value ? (rotulo ?? undefined) : undefined)

  return (
    <PopoverTrigger isOpen={open} onOpenChange={onOpenChange}>
      <Button
        id={id}
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
      {/* Popover 2.0: folha, borda `n-300`, `--hard-soft`. A régua dá UMA sombra
          dura de tinta por tela, e ela não é gasta aqui — peça que aparece leva a
          sombra macia. */}
      <Popover className="w-(--trigger-width) rounded-[var(--r-panel)] border p-0 [background:var(--n-0)] [border-color:var(--n-300)] shadow-[var(--hard-soft)]">
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
                  onOpenChange(false)
                }}
              >
                {/* Resultado 2.0 (Attio): monograma + nome + subtítulo. O
                    monograma é âncora para o olho percorrer a coluna; o
                    subtítulo é o que desempata dois nomes parecidos, e é onde o
                    operador confere que escolheu o cadastro certo. */}
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    option.id === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Monograma nome={option.nome} tamanho={22} />
                <span className="min-w-0 flex-1">
                  <span className="t-ui block truncate">{option.nome}</span>
                  {option.subtitulo ? (
                    <span className="t-meta block truncate">{option.subtitulo}</span>
                  ) : null}
                </span>
              </CommandItem>
            ))}
            {/* Nada de "+ Novo" enquanto a lista CARREGA ou FALHOU: nos dois
                casos a coleção está vazia por acidente, e um item de criação
                ali seria a única coisa na lista — engolindo o
                `renderEmptyState`, que é quem distingue "ainda não chegou" de
                "não foi possível carregar" de "está vazia mesmo". O operador
                cadastraria duplicata porque a busca não respondeu. */}
            {aoCriar && !carregando && !erro ? (
              <CommandItem
                id="criar"
                textValue={`Cadastrar ${label.toLowerCase()}`}
                onAction={() => {
                  onOpenChange(false)
                  aoCriar()
                }}
              >
                <Plus className="size-4 shrink-0" />
                {/* "Cadastrar marca", não "Novo marca": o mockup escreve
                    "+ Novo fornecedor" porque ali o substantivo é masculino, e o
                    `label` aqui vem do `kind` — marca, condição, forma de
                    pagamento são femininos. Um verbo resolve os dois gêneros sem
                    tabela de artigos. */}
                <span className="t-ui [color:var(--primary-text)]">
                  Cadastrar {label.toLowerCase()}
                </span>
              </CommandItem>
            ) : null}
          </CommandList>
          {/* A lista veio CORTADA no teto de 100 do contrato, e a busca deste
              campo filtra só o que chegou: o item procurado pode nem estar
              aqui. Sem este aviso, "não encontrei" e "não existe" viram a
              mesma coisa — e o operador cadastraria duplicado pelo "...".
              Fora do Menu: a coleção da RAC só aceita itens. */}
          {truncada && (
            <p className="t-meta border-t px-2 py-1.5 [border-color:var(--n-200)]">
              Mostrando os primeiros {options.length}. A lista é maior — se não achar aqui, o item
              pode existir fora deste trecho.
            </p>
          )}
        </Command>
      </Popover>
    </PopoverTrigger>
  )
}

/**
 * O ESPECIFICADOR — o profissional que indicou o cliente.
 *
 * `[combo]` puro, sem cadastro rápido: o "..." do `LookupCombo` é
 * `POST /api/catalog-lookups`, e o especificador não é item de lista de apoio
 * desde a #265 — é um PARCEIRO. Cadastrar profissional aqui seria criar um
 * cadastro inteiro (documento, papéis, vínculo) por um campo de texto, e o
 * lugar disso é a tela de Profissionais.
 */
export function EspecificadorCombo({
  value,
  onChange,
  rotulo,
  disabled,
  id,
  excluir,
}: {
  value: string | null
  onChange: (value: string | null) => void
  /** `specifierName` que o registro trouxe, para id fora da lista carregada. */
  rotulo?: string | null | undefined
  disabled?: boolean | undefined
  id?: string | undefined
  /** O id do próprio registro — não se indica sozinho. */
  excluir?: string | undefined
}) {
  const [open, setOpen] = useState(false)
  const fallbackId = useId()
  const { options, truncada, carregando, erro } = useEspecificadorOptions(excluir)

  return (
    <div className="flex items-center gap-1">
      <ComboDeEscolha
        label="Profissional"
        options={options}
        truncada={truncada}
        carregando={carregando}
        erro={erro}
        value={value}
        onChange={onChange}
        rotulo={rotulo}
        disabled={disabled}
        id={id ?? fallbackId}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}

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
  /**
   * Esconde o botão "..." (usado onde a transcrição tem `[combo]` puro, sem
   * cadastro rápido).
   *
   * É a decisão da TELA. O papel do vínculo esconde por conta própria, sem
   * passar por aqui — ver o corpo do componente.
   */
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

  /**
   * O `+...` some quando o papel do vínculo não alcança a escrita de lista de
   * apoio.
   *
   * O componente pergunta sozinho, em vez de receber por prop, porque o padrão
   * 2 o usa em **19 telas**: por prop, esconder passaria a depender de 19 call
   * sites lembrarem, e o que se esquece uma vez fica visível para sempre.
   *
   * **Esconder não é autorizar** — o servidor continua sendo a autoridade e o
   * 403 segue tratado (`ehErroDePapelInsuficiente`). Isto existe para não
   * deixar a pessoa abrir um diálogo, digitar um nome e só então descobrir que
   * a recusa era certa desde antes do clique.
   *
   * `useReadOnlyPorPapel` só responde `true` quando o vínculo JÁ chegou e o
   * papel não alcança. Enquanto não sabe, o botão continua visível — que é o
   * comportamento de hoje, e some ao saber. O contrário (esconder enquanto
   * carrega) piscaria o controle em toda montagem e negaria antes de saber.
   */
  const { readOnly: papelNaoAlcanca } = useReadOnlyPorPapel('catalog-lookups')
  const mostrarCadastroRapido = !hideQuickAdd && !papelNaoAlcanca

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
    <div className="flex min-w-0 items-center gap-1">
      <ComboDeEscolha
        label={label}
        options={options}
        truncada={truncada}
        carregando={carregando}
        erro={erro}
        value={value}
        onChange={onChange}
        rotulo={rotulo}
        disabled={disabled}
        id={listId}
        open={open}
        onOpenChange={setOpen}
        {...(mostrarCadastroRapido && disabled !== true ? { aoCriar: () => setAddOpen(true) } : {})}
      />

      {mostrarCadastroRapido && (
        <Dialog
          isOpen={addOpen}
          onOpenChange={(aberto) => (aberto ? setAddOpen(true) : fecharCadastro())}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>Cadastrar {label}</DialogTitle>
          </DialogHeader>
          <Campo label="Nome" obrigatorio htmlFor="lookup-quick-add-nome">
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
              <p role="alert" className="t-meta [color:var(--bad)]">
                Já existe “{duplicadoForaDaLista}” em {label}, fora das opções carregadas aqui —
                item desativado, ou lista maior que o trecho exibido. Cadastrar de novo criaria a
                duplicata que o servidor recusou.
              </p>
            )}
            {erroDoCadastro && (
              <p role="alert" className="t-meta [color:var(--bad)]">
                Não foi possível cadastrar agora. O item não foi criado.
              </p>
            )}
          </Campo>
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
      )}
    </div>
  )
}
