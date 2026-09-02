import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Nome } from '@/components/cabinet/nome'
import { PageHeader } from '@/components/cabinet/page-header'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useAlterarItemDaLista,
  useCriarItemDaLista,
  useItensDaLista,
} from '@/data/listas-de-apoio-api'
import { LOOKUP_KINDS, type LookupKind, lookupLabel } from '@/data/lookups-api'
import { useState } from 'react'

/**
 * AS LISTAS DE APOIO — a tela de gestão que o endpoint genérico não tinha.
 *
 * `GET/POST/PUT /api/catalog-lookups` existem desde a #38, e desde então o
 * único jeito de mexer numa lista era o `+...` de dentro de um formulário: para
 * cadastrar uma marca era preciso abrir um produto, e não havia caminho NENHUM
 * para renomear a que foi digitada errada ou aposentar a que a empresa deixou
 * de usar. Uma tabela só, discriminada por `kind` (ADR-011), com 22 listas
 * dentro e nenhuma porta de manutenção.
 *
 * **A lista de kinds é derivada, não escrita aqui.** O vocabulário não viaja
 * pelo contrato de propósito — `kind` é `string` livre, sem enum, porque
 * enumerá-lo faria cadastrar uma lista nova virar PR de contrato —, então a
 * fonte é o mapa de `lookups-api.ts`, que é o mesmo que os combos consomem.
 * Uma segunda lista aqui envelheceria calada: kind desconhecido na LEITURA
 * devolve 200 vazio, não erro, e a lista nova simplesmente não apareceria.
 *
 * **Item INATIVO aparece, e é meio ponto da tela.** O combo esconde o
 * aposentado (§9 padrão 8) e é justamente ele que alguém vem aqui reativar.
 * Não há exclusão: apagar deixaria todo cadastro que aponta para o item
 * exibindo a chave crua, e o contrato não publica `DELETE` nesta rota.
 */
export function TelaDeListas() {
  const [kind, setKind] = useState<LookupKind>(LOOKUP_KINDS[0] as LookupKind)
  const [emEdicao, setEmEdicao] = useState<{
    id: string | null
    nome: string
    ativo: boolean
  } | null>(null)

  const itens = useItensDaLista(kind)
  const linhas = itens.data?.rows ?? []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        titulo="Listas de apoio"
        contexto="O que os combos oferecem — marca, setor, cargo, motivo"
      />

      <div className="flex items-end justify-between gap-2">
        <div className="flex w-72 flex-col gap-1">
          <Label htmlFor="listas-kind">Lista</Label>
          <select
            id="listas-kind"
            className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
            value={kind}
            onChange={(e) => setKind(e.target.value as LookupKind)}
          >
            {LOOKUP_KINDS.map((k) => (
              <option key={k} value={k}>
                {lookupLabel(k)}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={() => setEmEdicao({ id: null, nome: '', ativo: true })}>
          Incluir item
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="w-32">Ativo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              onClick={() => setEmEdicao({ id: item.id, nome: item.name, ativo: item.active })}
            >
              <TableCell>
                <Nome>{item.name}</Nome>
              </TableCell>
              <TableCell>
                <CelulaAtivo ativo={item.active} />
              </TableCell>
            </TableRow>
          ))}
          {linhas.length === 0 && !itens.isPending ? (
            <TableRow>
              {/* Lista vazia é ESTADO, não falha — é o de um kind que a
                  instalação ainda não povoou, e o combo que a lê mostra o
                  mesmo vazio. */}
              <TableCell colSpan={2} className="text-muted-foreground">
                Esta lista ainda não tem itens.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {/* O teto de 100 do contrato DITO em voz alta: lista de apoio que passa
          disso deixou de ser lista de apoio, e cortar em silêncio faria o
          operador concluir que ela acaba aqui. */}
      {(itens.data?.total ?? 0) > linhas.length ? (
        <p className="text-muted-foreground text-sm">
          Mostrando {linhas.length} de {itens.data?.total} itens — esta lista passou do teto de 100
          do contrato.
        </p>
      ) : null}

      <ItemFormDialog kind={kind} item={emEdicao} onFechar={() => setEmEdicao(null)} />
    </div>
  )
}

/**
 * Incluir e alterar um item — as duas únicas edições que a lista aceita.
 *
 * `kind` NÃO é editável: mudar o kind de um item o mudaria de lista, e todo
 * cadastro que aponta para ele passaria a exibir um valor de outra natureza. O
 * contrato o deixa fora do `CatalogLookupUpdateRequest` pela mesma razão. Quem
 * errou de lista desativa aqui e inclui na certa.
 */
function ItemFormDialog({
  kind,
  item,
  onFechar,
}: {
  kind: LookupKind
  item: { id: string | null; nome: string; ativo: boolean } | null
  onFechar: () => void
}) {
  const criar = useCriarItemDaLista(kind)
  const alterar = useAlterarItemDaLista()

  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  // O id do item que já preencheu o formulário. Comparar com o item atual é o
  // que carrega o campo UMA vez por abertura, sem efeito: um `useEffect` aqui
  // reescreveria o que o operador está digitando a cada render do pai.
  const [carregado, setCarregado] = useState<string | null>(null)

  const chave = item ? (item.id ?? 'novo') : null
  if (chave !== null && chave !== carregado) {
    setCarregado(chave)
    setNome(item ? item.nome : '')
    setAtivo(item ? item.ativo : true)
    criar.reset()
    alterar.reset()
  }
  if (chave === null && carregado !== null) setCarregado(null)

  function gravar() {
    if (!item || !nome.trim()) return
    const fechar = { onSuccess: () => onFechar() }
    if (item.id) alterar.mutate({ id: item.id, nome: nome.trim(), ativo }, fechar)
    else criar.mutate(nome.trim(), fechar)
  }

  const gravando = criar.isPending || alterar.isPending

  return (
    <Dialog isOpen={item !== null} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>
          {item?.id ? 'Alterar item' : 'Novo item'} — {lookupLabel(kind)}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-nome">Nome</Label>
          <Input id="item-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <Checkbox isSelected={ativo} onChange={setAtivo}>
          <span className="flex flex-col">
            <span>Ativo</span>
            <span className="text-muted-foreground text-xs leading-snug">
              Desmarcar tira o item dos combos. O que já apontava para ele continua legível.
            </span>
          </span>
        </Checkbox>
        {/* O 409 desta rota é nome repetido ENTRE OS ATIVOS do kind — a
            mensagem do servidor já diz isso, e a tela não a reescreve. */}
        <ErroDeGravacao erro={criar.error ?? alterar.error} mensagem="Falha ao gravar o item." />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="button" onClick={gravar} disabled={!nome.trim() || gravando}>
          Gravar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
