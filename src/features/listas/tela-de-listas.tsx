import type { CatalogLookupDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { PageHeader } from '@/components/cabinet/page-header'
import { TabelaEditavel } from '@/components/cabinet/tabela-editavel'
import { Label } from '@/components/ui/label'
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
 *
 * ## O diálogo saiu, e é a mudança da D27
 *
 * O registro tem DOIS campos. Enquanto a edição passava por um formulário
 * modal, corrigir um `STELA` custava seis gestos e uma espera — cerimônia que
 * fazia o erro de digitação ficar onde estava. Agora a célula é o campo
 * (`TabelaEditavel`) e a linha nova mora no rodapé tracejado. O que se perdeu
 * junto foi a edição SIMULTÂNEA de nome e `Ativo`: cada um é uma escrita
 * agora. Não é perda de verdade — o `PUT` do contrato substitui o registro
 * inteiro nos dois casos, e trocar as duas coisas ao mesmo tempo nunca foi um
 * pedido, era só o que o formulário obrigava.
 */
export function TelaDeListas() {
  const [kind, setKind] = useState<LookupKind>(LOOKUP_KINDS[0] as LookupKind)

  const itens = useItensDaLista(kind)
  const linhas = itens.data?.rows ?? []

  const criar = useCriarItemDaLista(kind)
  const alterar = useAlterarItemDaLista()

  return (
    <div className="flex flex-col gap-[var(--s-5)]">
      <PageHeader
        titulo="Listas de apoio"
        subtitulo="O que os combos oferecem — marca, setor, cargo, motivo"
      />

      {/* A ORDEM não é do contrato, e a tela diz isso em vez de oferecer um
          arrastar que não sobrevive ao recarregamento. `CatalogLookupDto`
          publica `id`, `kind`, `name` e `active` — não há campo de posição, e
          `CatalogLookupUpdateRequest` aceita só `name` e `active`. Enquanto for
          assim, a ordem é a alfabética que a consulta pede (`sortBy: 'name'`).
          Ver o blocker registrado na issue #495. */}
      {/* Um `<p>` só, e não texto solto com `<strong>` no meio: o
          `AvisoDeCobertura` empilha os children num `flex-col`, então cada nó
          inline virava uma LINHA — o aviso saía em cinco, com o ponto final
          órfão na última. O componente espera parágrafos, não fragmentos. */}
      <AvisoDeCobertura>
        <p className="t-corpo">
          A ordem dos itens é alfabética e não se arrasta: <strong>catalog-lookups</strong> não
          guarda posição no contrato. O combo que lê esta lista mostra a mesma ordem.
        </p>
      </AvisoDeCobertura>

      <div className="flex w-72 flex-col gap-[var(--s-1)]">
        <Label htmlFor="listas-kind" className="t-rotulo">
          Lista
        </Label>
        <select
          id="listas-kind"
          className="t-ui flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 outline-none focus-visible:focus-ring"
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

      <TabelaEditavel<CatalogLookupDto>
        linhas={linhas}
        colunas={[{ id: 'name', rotulo: 'Nome', valor: (item) => item.name, editavel: true }]}
        chave={(item) => item.id}
        nome={(item) => item.name}
        ativo={(item) => item.active}
        entidade="item da lista"
        rotuloDaInclusao={`Novo item em ${lookupLabel(kind)}`}
        pendente={criar.isPending || alterar.isPending}
        // O `PUT` substitui o registro INTEIRO: nome e `active` viajam sempre
        // juntos, e o que não mudou vai como está. Mandar só o campo tocado
        // apagaria o outro.
        aoGravarCelula={(item, _coluna, valor) =>
          alterar.mutate({ id: item.id, nome: valor, ativo: item.active })
        }
        aoAlternarAtivo={(item, ativo) => alterar.mutate({ id: item.id, nome: item.name, ativo })}
        aoIncluir={(nome) => criar.mutate(nome)}
        vazio={itens.isPending ? 'Carregando os itens…' : 'Esta lista ainda não tem itens.'}
        erro={
          // O 409 desta rota é nome repetido ENTRE OS ATIVOS do kind — a
          // mensagem do servidor já diz isso, e a tela não a reescreve.
          <ErroDeGravacao erro={criar.error ?? alterar.error} mensagem="Falha ao gravar o item." />
        }
      />

      {/* O teto de 100 do contrato DITO em voz alta: lista de apoio que passa
          disso deixou de ser lista de apoio, e cortar em silêncio faria o
          operador concluir que ela acaba aqui. */}
      {(itens.data?.total ?? 0) > linhas.length ? (
        <p className="t-meta">
          Mostrando {linhas.length} de {itens.data?.total} itens — esta lista passou do teto de 100
          do contrato.
        </p>
      ) : null}
    </div>
  )
}
