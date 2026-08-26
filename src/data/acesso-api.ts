import {
  type EmployeeDetailDto,
  type EmployeeLinkRequest,
  type EmployeeTenantLinkDto,
  type EmployeeWriteRequest,
  type PagedResultOfEmployeeDto,
  type PagedResultOfRoleDto,
  type PermissionCatalogDto,
  type RoleDetailDto,
  type TemporaryPasswordDto,
  createEmployee,
  createRole,
  getRole,
  linkEmployee,
  listEmployeeLinks,
  listEmployees,
  listPermissions,
  listRoles,
  resetEmployeePassword,
  updateEmployeeLink,
  updateRole,
} from '@/api/gerado'
import type { RoleWriteRequest } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * ACESSO — papéis, permissões e usuários. A fronteira da tela `/config/usuarios`.
 *
 * Papel é da ORGANIZAÇÃO (a listagem não recorta por empresa ativa); a
 * ATRIBUIÇÃO é do vínculo, e por isso ela viaja em `/api/employees/{id}/link`
 * com `roleId` — o id e não o nome, porque o nome o CRUD renomeia.
 *
 * O catálogo de permissões vem INTEIRO e com `version` opaca: meia lista de
 * caixas faria o admin gravar papel sem as permissões que não viu. `staleTime`
 * longo de propósito — o catálogo só muda em deploy do servidor.
 */
const CHAVES_ACESSO = {
  catalogo: ['acesso', 'permissions'] as const,
  papeis: ['acesso', 'roles'] as const,
  papel: (id: string) => ['acesso', 'roles', id] as const,
  usuarios: ['acesso', 'employees'] as const,
  vinculos: (id: string) => ['acesso', 'employees', id, 'links'] as const,
}

export function useCatalogoDePermissoes() {
  return useQuery({
    queryKey: CHAVES_ACESSO.catalogo,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listPermissions()
      return dadosOuErro<PermissionCatalogDto>(resposta, 'Falha ao consultar as permissões.')
    },
  })
}

export function usePapeis() {
  return useQuery({
    queryKey: CHAVES_ACESSO.papeis,
    queryFn: async () => {
      // `pageSize` no teto do contrato: a tela de checkboxes precisa de TODOS
      // os papéis no combo — papel fora da primeira página sumiria da escolha.
      const resposta: RespostaDaApi = await listRoles({ page: 1, pageSize: 100 })
      return dadosOuErro<PagedResultOfRoleDto>(resposta, 'Falha ao consultar os papéis.')
    },
  })
}

export function usePapel(id: string | null) {
  return useQuery({
    queryKey: CHAVES_ACESSO.papel(id ?? ''),
    enabled: id !== null,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getRole(id ?? '')
      return dadosOuErro<RoleDetailDto>(resposta, 'Falha ao consultar o papel.')
    },
  })
}

function useInvalidarAcesso() {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: ['acesso'] })
}

export function useCriarPapel() {
  const invalidar = useInvalidarAcesso()
  return useMutation({
    mutationFn: async (corpo: RoleWriteRequest) => {
      const resposta: RespostaDaApi = await createRole(corpo)
      return dadosOuErro<RoleDetailDto>(resposta, 'Falha ao criar o papel.')
    },
    onSuccess: invalidar,
  })
}

export function useAlterarPapel() {
  const invalidar = useInvalidarAcesso()
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: RoleWriteRequest }) => {
      const resposta: RespostaDaApi = await updateRole(id, corpo)
      return dadosOuErro<RoleDetailDto>(resposta, 'Falha ao gravar o papel.')
    },
    onSuccess: invalidar,
  })
}

export function useUsuariosDeAcesso(q: string) {
  return useQuery({
    queryKey: [...CHAVES_ACESSO.usuarios, q],
    queryFn: async () => {
      const resposta: RespostaDaApi = await listEmployees({
        ...(q ? { q } : {}),
        page: 1,
        pageSize: 100,
      })
      return dadosOuErro<PagedResultOfEmployeeDto>(resposta, 'Falha ao consultar os colaboradores.')
    },
  })
}

/**
 * Criar usuário = TRÊS passos do contrato numa mutação: a pessoa
 * (`CreateEmployee`), o vínculo com papel (`LinkEmployee`) e a senha
 * provisória (`ResetEmployeePassword`). A tela pede os três juntos porque é
 * assim que um usuário passa a EXISTIR de verdade — pessoa sem vínculo não
 * entra em empresa nenhuma, e sem senha não entra em lugar nenhum: o servidor
 * grava credencial inutilizável de propósito no `POST /api/employees`.
 *
 * Se o vínculo ou a senha falharem DEPOIS da pessoa criada, a mutação erra com
 * a pessoa já gravada — o operador resolve pela própria tela (a linha está na
 * lista; vincular e gerar senha são ações dela), em vez de um rollback de
 * mentira que o contrato não oferece.
 */
export function useCriarUsuario() {
  const invalidar = useInvalidarAcesso()
  return useMutation({
    mutationFn: async ({
      nome,
      email,
      roleId,
    }: { nome: string; email: string; roleId: string }) => {
      const pessoa: EmployeeWriteRequest = {
        name: nome,
        document: null,
        email,
        phone: null,
        active: true,
      }
      const criada: RespostaDaApi = await createEmployee(pessoa)
      const detalhe = dadosOuErro<EmployeeDetailDto>(criada, 'Falha ao criar o colaborador.')

      // PUT, não POST: o servidor cria o vínculo JUNTO com a pessoa, no papel
      // inicial `viewer` (decisão do CreateEmployee — cadastrar alguém sem
      // empresa é estado que a tela não sabe mostrar). O que a tela escolheu é
      // a SUBSTITUIÇÃO desse papel inicial; um POST aqui tomaria 409 sempre.
      const vinculo: EmployeeLinkRequest = { roleId, active: true }
      const vinculada: RespostaDaApi = await updateEmployeeLink(detalhe.id, vinculo)
      dadosOuErro<EmployeeDetailDto>(vinculada, 'Colaborador criado, mas o vínculo falhou.')

      const senha: RespostaDaApi = await resetEmployeePassword(detalhe.id)
      const provisoria = dadosOuErro<TemporaryPasswordDto>(
        senha,
        'Colaborador criado e vinculado, mas a senha provisória falhou.',
      )
      return { detalhe, temporaryPassword: provisoria.temporaryPassword }
    },
    onSuccess: invalidar,
  })
}

export function useAlterarVinculo() {
  const invalidar = useInvalidarAcesso()
  return useMutation({
    mutationFn: async ({ id, roleId }: { id: string; roleId: string }) => {
      const corpo: EmployeeLinkRequest = { roleId, active: true }
      // PUT primeiro (vínculo existente é o caso comum); 404 = ainda sem
      // vínculo nesta empresa, aí o POST cria. A ordem contrária custaria um
      // 409 no caso comum.
      const alterada: RespostaDaApi = await updateEmployeeLink(id, corpo)
      if (alterada.status === 404) {
        const criada: RespostaDaApi = await linkEmployee(id, corpo)
        return dadosOuErro<EmployeeDetailDto>(criada, 'Falha ao vincular o colaborador.')
      }
      return dadosOuErro<EmployeeDetailDto>(alterada, 'Falha ao alterar o vínculo.')
    },
    onSuccess: invalidar,
  })
}

/**
 * Em quais empresas do grupo esta pessoa entra, e com que papel.
 *
 * A pergunta que `EmployeeDetailDto` não responde: ele publica o vínculo da
 * empresa ATIVA, que é o recorte da escrita, e por isso a linha da listagem
 * mostra o papel de agora. Quem administra o grupo precisa das outras — "o João
 * é Financeiro na Matriz e nada na Filial" — e descobrir isso pelo detalhe
 * exigiria trocar de empresa ativa uma vez por empresa.
 *
 * **A ESCRITA continua sendo por empresa, e a tela diz isso.** O vínculo é a
 * linha que define o poder da pessoa NAQUELA empresa; gravá-lo de fora dela
 * seria decidir o poder de uma empresa com a autorização obtida em outra. Quem
 * quer mexer no vínculo da empresa B ativa a empresa B — e o diálogo oferece o
 * gesto na própria linha.
 *
 * `enabled` só com id: o diálogo monta fechado, e uma consulta com id vazio
 * gastaria um 404 por abertura da tela.
 */
export function useVinculosDoUsuario(id: string | null) {
  return useQuery({
    queryKey: CHAVES_ACESSO.vinculos(id ?? ''),
    enabled: id !== null,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listEmployeeLinks(id ?? '')
      return dadosOuErro<EmployeeTenantLinkDto[]>(resposta, 'Falha ao consultar os vínculos.')
    },
  })
}

export function useGerarSenhaProvisoria() {
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await resetEmployeePassword(id)
      return dadosOuErro<TemporaryPasswordDto>(resposta, 'Falha ao gerar a senha provisória.')
    },
  })
}
