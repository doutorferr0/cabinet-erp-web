import {
  type CatalogLookupDto,
  type PagedResultOfCatalogLookupDto,
  createCatalogLookup,
  listCatalogLookups,
  updateCatalogLookup,
} from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { type LookupKind, kindDoBackend } from '@/data/lookups-api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * GESTÃO DAS LISTAS DE APOIO — a fronteira da tela `/config/listas`.
 *
 * `lookups-api.ts` serve o COMBO: só item ativo, sem paginação à vista, e a
 * escrita que existe lá é o `+...` (criar na hora, sem sair do formulário).
 * Aqui é a outra pergunta — **administrar a lista inteira**: ver o que está
 * aposentado, renomear o que foi digitado errado e desativar o que a empresa
 * não usa mais.
 *
 * As duas leem a MESMA `GET /api/catalog-lookups`, e a diferença é um filtro:
 * o combo joga fora o inativo, esta tela precisa dele — é justamente o item
 * inativo que alguém vem aqui reativar. Ler no mesmo hook obrigaria o combo a
 * filtrar depois de receber, e o teto de 100 do contrato passaria a contar
 * itens que ele nunca mostraria.
 *
 * **Não há exclusão, e não é omissão** (§9 padrão 8): `active: false` aposenta.
 * Apagar um item deixaria todo cadastro que aponta para ele exibindo a chave
 * crua, e o contrato não publica `DELETE` nesta rota.
 */
const CHAVE_LISTAS = ['catalog-lookups'] as const

/**
 * Os itens de UM kind, ATIVOS E INATIVOS, para a tela de gestão.
 *
 * `sortBy: 'name'` fixo — a tela não desenha cabeçalho clicável, e a ordem
 * alfabética é a que se procura numa lista de apoio. `pageSize` no teto do
 * contrato, com `total` devolvido: quem passar de 100 vê no rodapé que passou,
 * porque cortar em silêncio faria o admin concluir que a lista acabou ali.
 */
export function useItensDaLista(kind: LookupKind) {
  const backend = kindDoBackend(kind)
  return useQuery({
    queryKey: [...CHAVE_LISTAS, 'gestao', backend],
    queryFn: async () => {
      const resposta: RespostaDaApi = await listCatalogLookups({
        kind: backend,
        sortBy: 'name',
        page: 1,
        pageSize: 100,
      })
      return dadosOuErro<PagedResultOfCatalogLookupDto>(
        resposta,
        `Falha ao carregar a lista ${backend}.`,
      )
    },
  })
}

/**
 * Invalida `catalog-lookups` INTEIRA — a chave da gestão e a do combo.
 *
 * Renomear "EVOLED" aqui muda o que o combo do produto oferece e o que a ficha
 * imprime (`useRotulosDeApoio`). Invalidar só a chave desta tela deixaria as
 * outras duas exibindo o nome antigo até o `staleTime` vencer, e o operador
 * concluiria que a alteração não pegou.
 */
function useInvalidarListas() {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: CHAVE_LISTAS })
}

export function useCriarItemDaLista(kind: LookupKind) {
  const invalidar = useInvalidarListas()
  const backend = kindDoBackend(kind)
  return useMutation({
    mutationFn: async (nome: string) => {
      const resposta: RespostaDaApi = await createCatalogLookup({
        kind: backend,
        name: nome,
        active: true,
      })
      return dadosOuErro<CatalogLookupDto>(resposta, 'Falha ao incluir o item.')
    },
    onSuccess: invalidar,
  })
}

/**
 * Altera o item — nome e `active` juntos, porque o `PUT` do contrato substitui
 * o registro INTEIRO. Mandar só o nome apagaria o `active` que estava lá.
 *
 * `kind` NÃO viaja: mudar o kind de um item o mudaria de lista, e o cadastro
 * que aponta para ele passaria a exibir um valor de outra natureza. Quem errou
 * de lista desativa aqui e inclui na certa.
 */
export function useAlterarItemDaLista() {
  const invalidar = useInvalidarListas()
  return useMutation({
    mutationFn: async ({ id, nome, ativo }: { id: string; nome: string; ativo: boolean }) => {
      const resposta: RespostaDaApi = await updateCatalogLookup(id, { name: nome, active: ativo })
      return dadosOuErro<CatalogLookupDto>(resposta, 'Falha ao gravar o item.')
    },
    onSuccess: invalidar,
  })
}
