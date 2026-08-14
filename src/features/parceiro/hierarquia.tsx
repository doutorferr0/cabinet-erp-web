import type { PartnerDto } from '@/api/gerado'
import { FormBlock } from '@/components/cabinet/form-block'
import { Nome } from '@/components/cabinet/nome'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Button } from '@/components/ui/button'
import {
  LISTA_DE_PARCEIROS,
  filhosDoParceiro,
  motivoDeRecusaDoVinculo,
  useVincularPai,
} from '@/data/parceiros-api'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Link2, Link2Off, Search } from 'lucide-react'
import { useState } from 'react'

/**
 * HIERARQUIA PAI/FILHO DO PARCEIRO (issue #91).
 *
 * `partners.parent_id` já existia no schema do banco e não no contrato; entrou
 * como `parentId`/`parentName` `Proposto`. O caso real: **escritório de
 * arquitetura ↔ profissionais dele** — o escritório é o pai, cada arquiteto é
 * um filho, e o orçamento indicado por qualquer um deles é do escritório.
 *
 * ## Por que o vínculo NÃO é campo do formulário
 *
 * As três telas de parceiro (Cliente, Fornecedor, Profissional) gravam por
 * `Gravar`, e a tentação era pôr "vinculado a" no meio dos outros campos. Não
 * é o que ele é: **hierarquia é RELAÇÃO, não atributo**. Duas consequências
 * práticas decidiram:
 *
 * 1. O repo já trata relação assim — `vincularParceiro` (o 409 de documento
 *    repetido) é mutation própria, fora do formulário, pela mesma razão.
 * 2. O `PUT` substitui o registro inteiro. Se o vínculo fosse campo de
 *    formulário, cada tela precisaria carregá-lo no schema Zod, no `dtoParaForm`
 *    e no `paraEscrita` — três lugares por tela, nove ao todo — e esquecer um
 *    deles **desvincularia em silêncio** ao gravar por aquela tela. Fora do
 *    formulário, `corpoDeEscrita` devolve `parentId` como veio e nenhuma tela
 *    pode apagá-lo por omissão.
 *
 * ## O ciclo, e o que esta tela consegue provar
 *
 * Recusa aqui: apontar para si mesmo e apontar para um dos próprios filhos —
 * o A→B→A que a issue nomeia, e é visível ANTES de gravar. Ciclo mais fundo
 * (A→B→C→A) é 400 do servidor: a tela conhece um nível para baixo e nenhum
 * para cima, e varrer a árvore daqui seria N consultas para uma resposta que o
 * servidor dá em uma — e ainda envelheceria entre a checagem e o Gravar.
 */

const COLUNAS_DE_BUSCA: ColumnDef<PartnerDto>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'legalName',
    header: 'Nome',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'document',
    header: 'CNPJ / CPF',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
]

export interface HierarquiaParceiroProps {
  /** A linha do servidor. `null` enquanto carrega ou em registro novo. */
  parceiro: PartnerDto | null
  /** Modo consulta: mostra o vínculo, não deixa mexer. */
  readOnly?: boolean
}

export function HierarquiaParceiro({ parceiro, readOnly = false }: HierarquiaParceiroProps) {
  const [buscando, setBuscando] = useState(false)
  const [recusa, setRecusa] = useState<string | null>(null)
  const vincular = useVincularPai(parceiro?.id ?? '')

  const filhos = useQuery({
    queryKey: ['parceiro-filhos', parceiro?.id],
    queryFn: () => filhosDoParceiro(parceiro?.id as string),
    enabled: !!parceiro?.id,
  })

  // Registro NOVO não tem hierarquia: sem id, não há a que vincular nem quem
  // vincular. Mostrar o bloco vazio prometeria uma ação que só existe depois de
  // gravar.
  if (!parceiro) return null

  const vinculados = filhos.data ?? []

  function escolher(escolhido: PartnerDto) {
    if (!parceiro) return
    const motivo = motivoDeRecusaDoVinculo(parceiro.id, escolhido.id, vinculados)
    if (motivo) {
      setRecusa(motivo)
      return
    }
    setRecusa(null)
    vincular.mutate({ linha: parceiro, paiId: escolhido.id })
  }

  return (
    <FormBlock legend="Vínculo">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.75rem] text-muted-foreground uppercase tracking-[0.06em]">
            Vinculado a
          </span>
          {parceiro.parentId ? (
            // O nome vem do DTO (`parentName`), não de uma segunda consulta —
            // mesmo par id+nome de `productTypeId`/`productTypeName`.
            <Nome>{parceiro.parentName ?? parceiro.parentId}</Nome>
          ) : (
            <span className="text-muted-foreground text-sm">Não vinculado a ninguém.</span>
          )}
          {readOnly ? null : (
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBuscando(true)}
                disabled={vincular.isPending}
              >
                <Search />
                {parceiro.parentId ? 'Trocar' : 'Vincular'}
              </Button>
              {parceiro.parentId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => vincular.mutate({ linha: parceiro, paiId: null })}
                  disabled={vincular.isPending}
                >
                  <Link2Off />
                  Desvincular
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {recusa ? (
          <p role="alert" className="border-2 bg-zone-danger px-2 py-1 text-sm">
            {recusa}
          </p>
        ) : null}
        {vincular.isError ? (
          <p role="alert" className="border-2 bg-zone-danger px-2 py-1 text-sm">
            Não foi possível gravar o vínculo. O servidor recusa laço na hierarquia.
          </p>
        ) : null}

        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.75rem] text-muted-foreground uppercase tracking-[0.06em]">
            Vinculados ({vinculados.length})
          </span>
          {filhos.isPending ? (
            <span className="text-muted-foreground text-sm">Consultando…</span>
          ) : vinculados.length === 0 ? (
            // "Ninguém" e "não consultei" são coisas diferentes, e a lista vazia
            // do estado de erro mentiria — por isso o erro tem frase própria.
            <span className="text-muted-foreground text-sm">
              {filhos.isError
                ? 'Não foi possível consultar os vinculados.'
                : 'Nenhum cadastro pende deste.'}
            </span>
          ) : (
            <ul className="flex flex-col gap-1">
              {vinculados.map((filho) => (
                <li key={filho.id} className="flex items-center gap-2 text-sm">
                  <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <Nome>{filho.legalName}</Nome>
                  {filho.active ? null : (
                    <span className="text-muted-foreground text-xs">(inativo)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <SearchDialog<PartnerDto>
        open={buscando}
        onOpenChange={setBuscando}
        title="Vincular a qual cadastro?"
        columns={COLUNAS_DE_BUSCA}
        queryKey={['parceiro-busca-pai']}
        // SEM recorte de papel, e é decisão de negócio: o escritório de
        // arquitetura costuma estar cadastrado como Cliente e os arquitetos
        // dele como Profissional. Filtrar pelo papel da tela em que se está
        // esconderia justamente o cadastro que se procura.
        fetcher={(state) => LISTA_DE_PARCEIROS.list(state)}
        onSelect={escolher}
      />
    </FormBlock>
  )
}
