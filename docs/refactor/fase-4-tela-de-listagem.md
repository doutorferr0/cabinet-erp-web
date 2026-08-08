# Fase 4 — `<TelaDeListagem>`

## Problema

8 listagens (`clientes`, `fornecedores`, `profissionais`, `colaboradores`, `produtos`,
`orcamentos`, `ordens`, `pedidos`) repetem o mesmo esqueleto: `BandaDeIdentidade` + barra de ações
(`cadastroActions` já é fábrica, não muda) + `VitraDataTable` + (nos 4 cadastros com
desativação) `ConfirmarDesativacao` com o erro da Fase 1.

## O que NÃO muda

`cadastroActions` (`src/components/cabinet/cadastro-actions.ts`) e `VitraDataTable`
(`src/components/cabinet/data-table.tsx`) já são as peças certas — fábrica configurável e tabela
genérica. Esta fase não mexe nelas, só embrulha a composição que hoje cada rota repete. A
navegação (`abrir`, `abrirParceiro` com semente de cache) continua na rota, porque é ali que o
`useNavigate` tipado do TanStack Router faz sentido — a rota monta `actions` e entrega pronto.

## Implementação

Componente novo em `src/components/cabinet/tela-de-listagem.tsx`:

```tsx
import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import { VitraDataTable, type DataTableAction, type TableFetcher } from '@/components/cabinet/data-table'
import { mensagemDoErro } from '@/lib/erros'
import type { ColumnDef } from '@tanstack/react-table'
import type { ReactNode } from 'react'

export interface DesativacaoProps<T> {
  entidade: string
  registro: T | null
  nome: (row: T) => string
  ativo: (row: T) => boolean
  pendente: boolean
  erro: unknown
  onFechar: () => void
  onConfirmar: () => void
}

export interface TelaDeListagemProps<T> {
  titulo: string
  /** Texto pequeno ao lado do título (ex.: "BANCO PRINCIPAL" em Produtos). */
  contexto?: ReactNode
  columns: ColumnDef<T>[]
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  actions: DataTableAction<T>[]
  desativacao?: DesativacaoProps<T>
  /** Conteúdo extra abaixo da tabela (os 5 botões de rodapé do Orçamento). */
  rodape?: ReactNode
}

export function TelaDeListagem<T>({
  titulo,
  contexto,
  columns,
  queryKey,
  fetcher,
  actions,
  desativacao,
  rodape,
}: TelaDeListagemProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      <BandaDeIdentidade titulo={titulo} {...(contexto ? { contexto } : {})} />
      <VitraDataTable columns={columns} queryKey={queryKey} fetcher={fetcher} actions={actions} />
      {rodape}
      {desativacao?.registro ? (
        <ConfirmarDesativacao
          entidade={desativacao.entidade}
          nome={desativacao.nome(desativacao.registro)}
          ativo={desativacao.ativo(desativacao.registro)}
          aberto
          pendente={desativacao.pendente}
          erro={mensagemDoErro(desativacao.erro, 'Não foi possível desativar. Tente de novo.')}
          onFechar={desativacao.onFechar}
          onConfirmar={desativacao.onConfirmar}
        />
      ) : null}
    </div>
  )
}
```

(usa `mensagemDoErro` da Fase 1 — se a Fase 1 ainda não tiver sido feita, inline o ternário aqui e
trocar depois; a ordem recomendada evita isso.)

Exemplo de rota depois (Fornecedores, o caso com desativação):

```tsx
function FornecedoresPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [aDesativar, setADesativar] = useState<PartnerDto | null>(null)
  const desativar = useDesativarParceiro(['fornecedores'])

  function abrirParceiro(p: PartnerDto, modo?: 'consulta') {
    queryClient.setQueryData(['parceiro', p.id], p)
    void navigate({ to: '/cadastros/fornecedores/$fornecedorId', params: { fornecedorId: p.id }, search: modo ? { modo } : {} })
  }

  const actions = cadastroActions<PartnerDto>({
    entidade: 'fornecedor',
    onIncluir: () => void navigate({ to: '/cadastros/fornecedores/$fornecedorId', params: { fornecedorId: 'novo' } }),
    onAbrir: (p) => abrirParceiro(p),
    onConsultar: (p) => abrirParceiro(p, 'consulta'),
    onExcluir: (p) => { desativar.reset(); setADesativar(p) },
  })

  return (
    <TelaDeListagem
      titulo="Cadastro de Fornecedores"
      columns={columns}
      queryKey={['fornecedores']}
      fetcher={data.fornecedores.list}
      actions={actions}
      desativacao={{
        entidade: 'fornecedor',
        registro: aDesativar,
        nome: (p) => p.legalName,
        ativo: (p) => p.active,
        pendente: desativar.isPending,
        erro: desativar.error,
        onFechar: () => setADesativar(null),
        onConfirmar: () => desativar.mutate(aDesativar!, { onSuccess: () => setADesativar(null) }),
      }}
    />
  )
}
```

Orçamento (o caso com rodapé de botões e `actions` trocando `Excluir` por `Cancelar`) passa
`rodape={<div className="flex flex-wrap gap-2">…</div>}` com os mesmos 5 botões que já existem —
não remover os `console.info('[mock] …')`, isso é o bug/dívida separado, não desta fase.

## Verificação

- As 8 rotas já têm teste `renderRoute`. Rodar cada suíte relevante
  (`cliente-form.test.tsx`, `fornecedor-form.test.tsx`, `profissional-form.test.tsx`,
  `produto-form.test.tsx`, `orcamento-form.test.tsx`, `ordem-compra-form.test.tsx`,
  `pedido-compra-form.test.tsx`, e o teste de colaborador se existir) e confirmar que continuam
  verdes sem alteração no próprio teste.
- Visual: comparar as 8 listagens com os screenshots da Fase 0.
- Conferir que o botão `Excluir`/`Cancelar` do Orçamento continua com o rótulo trocado — isso é
  responsabilidade de quem monta `actions` (a rota), não do componente novo.

## Critério de saída

8 rotas de listagem caem de ~100–120 linhas para ~40–60 (o que sobra é columns + actions,
que são de fato específicos de cada tela). Commit: `refactor: extrai TelaDeListagem`.
