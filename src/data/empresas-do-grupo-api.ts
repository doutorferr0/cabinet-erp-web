import {
  type CompanyLetterheadDto,
  type CompanyLetterheadWriteRequest,
  type PagedResultOfTenantDto,
  type TenantDetailDto,
  type TenantWriteRequest,
  createTenant,
  getCompanyLetterhead,
  getTenant,
  listTenants,
  updateCompanyLetterhead,
  updateTenant,
} from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { CHAVE_VINCULOS } from '@/data/empresas-api'
import { SESSAO_KEY } from '@/data/sessao'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * EMPRESAS DO GRUPO — a fronteira da aba Empresas de `/config/usuarios`.
 *
 * **Não confundir com `empresas-api.ts`, e é por isso que são dois arquivos.**
 * Lá é `/auth/tenants`: as empresas em que o usuário logado ENTRA, com o papel
 * dele em cada uma, e é o que alimenta o seletor do rodapé. Aqui é
 * `/api/tenants`: as empresas que EXISTEM. As duas listas são diferentes de
 * propósito e a diferença aparece no primeiro uso — a empresa que esta tela
 * acabou de criar não tem vínculo com ninguém, então ela aparece aqui e não lá,
 * até alguém ser vinculado a ela.
 *
 * O recorte é a ORGANIZAÇÃO, como papéis e colaboradores: não há empresa ativa
 * na jogada, e é o que permite administrar o grupo de fora de qualquer uma das
 * empresas dele.
 */
const CHAVES_EMPRESA = {
  lista: ['empresas'] as const,
  uma: (id: string) => ['empresas', id] as const,
}

/**
 * O `sortBy` que esta fronteira manda — a whitelist que o contrato publica.
 *
 * A aba não desenha cabeçalho clicável (o grupo tem unidades, não milhares de
 * linhas), então na prática sai sempre `code`. A lista existe assim mesmo
 * porque é ela que `whitelist-do-contrato.test.ts` confere contra a descrição
 * da operação: coluna que um dia virar clicável fora daqui vira 400 no clique.
 */
export const ORDENAVEIS_EMPRESA: readonly string[] = ['code', 'name', 'active']

/** A ordem que a aba pede. É `code` porque é o número pelo qual se fala da empresa. */
const ORDEM_DA_ABA = 'code'

export function useEmpresasDoGrupo(q: string) {
  return useQuery({
    queryKey: [...CHAVES_EMPRESA.lista, q],
    queryFn: async () => {
      // `pageSize` no teto do contrato: um grupo tem dezenas de empresas, não
      // milhares, e paginar a aba esconderia metade delas atrás de um controle
      // que ninguém procuraria numa lista desse tamanho. Se um dia passar de
      // 100, o rodapé da tela DIZ que passou — cortar em silêncio faria o admin
      // concluir que só existem 100.
      const resposta: RespostaDaApi = await listTenants({
        ...(q ? { q } : {}),
        sortBy: ORDEM_DA_ABA,
        page: 1,
        pageSize: 100,
      })
      return dadosOuErro<PagedResultOfTenantDto>(resposta, 'Falha ao consultar as empresas.')
    },
  })
}

export function useEmpresa(id: string | null) {
  return useQuery({
    queryKey: CHAVES_EMPRESA.uma(id ?? ''),
    enabled: id !== null,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getTenant(id ?? '')
      return dadosOuErro<TenantDetailDto>(resposta, 'Falha ao consultar a empresa.')
    },
  })
}

/**
 * Invalida a lista de empresas E a sessão.
 *
 * Os vínculos entram porque `/auth/tenants` carrega o NOME e as `features` de
 * cada empresa em que o usuário entra: renomear a empresa ativa ou desligar um
 * recurso dela muda o rodapé e o menu que `useRecursosDaEmpresa` desenha, e sem
 * esta linha os dois só acompanhariam no próximo login.
 */
function useInvalidarEmpresas() {
  const cliente = useQueryClient()
  return () => {
    cliente.invalidateQueries({ queryKey: CHAVES_EMPRESA.lista })
    cliente.invalidateQueries({ queryKey: CHAVE_VINCULOS })
    cliente.invalidateQueries({ queryKey: SESSAO_KEY })
  }
}

export function useCriarEmpresa() {
  const invalidar = useInvalidarEmpresas()
  return useMutation({
    mutationFn: async (corpo: TenantWriteRequest) => {
      const resposta: RespostaDaApi = await createTenant(corpo)
      return dadosOuErro<TenantDetailDto>(resposta, 'Falha ao criar a empresa.')
    },
    onSuccess: invalidar,
  })
}

export function useAlterarEmpresa() {
  const invalidar = useInvalidarEmpresas()
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: TenantWriteRequest }) => {
      const resposta: RespostaDaApi = await updateTenant(id, corpo)
      return dadosOuErro<TenantDetailDto>(resposta, 'Falha ao gravar a empresa.')
    },
    onSuccess: invalidar,
  })
}

/**
 * O TIMBRE da empresa ATIVA — `/api/company-letterhead` (web#373).
 *
 * Fica neste arquivo, e não num `timbre-api.ts`, porque escreve a MESMA linha
 * de `tenants` que as rotas acima: quem edita empresa e quem edita cabeçalho
 * são a mesma tarefa do mesmo operador, e separá-los em dois arquivos era o
 * convite para as duas fronteiras divergirem sobre o que invalidar.
 *
 * **Singleton: o id não viaja.** É a empresa da SESSÃO, e não é conveniência —
 * `tenants` é tabela global, sem política de RLS, então quem recorta é a borda
 * ao escolher o id. Aceitar um id do cliente seria deixá-lo escolher o timbre de
 * qual empresa grava. A consequência para a tela é direta: para editar o timbre
 * de outra empresa, ative-a primeiro.
 */
const CHAVE_TIMBRE = ['company-letterhead'] as const

export function useTimbre(habilitado: boolean) {
  return useQuery({
    queryKey: CHAVE_TIMBRE,
    enabled: habilitado,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getCompanyLetterhead()
      return dadosOuErro<CompanyLetterheadDto>(resposta, 'Falha ao consultar o timbre.')
    },
  })
}

/**
 * Grava o timbre INTEIRO. O `PUT` é de singleton: campo ausente é 400 e campo
 * `null` APAGA — por isso o formulário monta o corpo com todos os campos, e
 * nunca só o que mudou.
 *
 * Invalida a listagem de empresas junto: o CNPJ é a mesma coluna, e a coluna da
 * aba Empresas exibiria o valor de antes.
 */
export function useAlterarTimbre() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async (corpo: CompanyLetterheadWriteRequest) => {
      const resposta: RespostaDaApi = await updateCompanyLetterhead(corpo)
      return dadosOuErro<CompanyLetterheadDto>(resposta, 'Falha ao gravar o timbre.')
    },
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: CHAVE_TIMBRE })
      cliente.invalidateQueries({ queryKey: CHAVES_EMPRESA.lista })
    },
  })
}
