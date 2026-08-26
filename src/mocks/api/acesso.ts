import type {
  EmployeeDetailDto,
  EmployeeLinkRequest,
  EmployeeWriteRequest,
  PermissionCatalogDto,
  RoleDetailDto,
  RoleDto,
  RoleWriteRequest,
} from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { crm } from './crm'
import { verificarEscrita } from './permissao'
import { TIPO, camposInvalidos, conflito, naoEncontrado, problemaJson, semSessao } from './problema'
import { novoId, store } from './store'

/**
 * O "backend" de PAPÉIS E PERMISSÕES no modo mock (api#84, contrato na web#292).
 *
 * Arquivo próprio pela mesma razão do CRM e do orçamento: estado que não é do
 * store das telas antigas, e arquivo novo não disputa linha com quem edita o
 * vizinho.
 *
 * **Ainda não há tela.** A de checkboxes é trilho próprio, depois da fase 1 do
 * api#84 — o que existe aqui responde ao contrato para que o mock não fique
 * mudo em caminho publicado, e para que a tela, quando vier, seja escrita
 * contra o mesmo comportamento que o servidor promete.
 *
 * O que este mock reproduz de propósito, porque é onde o desenho pode estar
 * errado:
 *
 * - **o catálogo é FIXO e vem inteiro** — sem página, sem filtro. Meia lista de
 *   caixas faria o admin gravar papel sem as permissões que não viu;
 * - **papel de sistema recusa alteração com 409**, não 403: quem pede TEM a
 *   permissão, o que recusa é o recurso;
 * - **`permissions` do `PUT` é o conjunto FINAL** — desmarcar tem efeito;
 * - **template não é protegido**: `template` conta de onde o papel veio,
 *   `system` é que trava.
 */

/**
 * O catálogo — SEMENTE DE MOCK, não a lista do servidor.
 *
 * A lista de verdade nasce no código do `cabinet-erp-api` e chega por
 * `GET /api/permissions`; é justamente por isso que o contrato não a congela em
 * enum. O que está aqui é plausível e ancorado no que o repo já conhece: os
 * módulos saem das famílias de caminho de `src/data/papeis.ts`, mais
 * `depositos`, que a api#84 nomeia como o primeiro consumidor
 * (`depositos:gerenciar`, api#79 decisão 4).
 *
 * A granularidade é a da decisão: uma chave por AÇÃO, `modulo:acao`.
 */
const CATALOGO: PermissionCatalogDto = {
  version: 'mock-2026-08-22',
  modules: [
    {
      key: 'produtos',
      label: 'Produtos',
      permissions: [
        { key: 'produtos:ver', label: 'Ver produtos', description: null },
        {
          key: 'produtos:editar',
          label: 'Cadastrar e alterar produtos',
          description: 'Inclui variantes. O cadastro vale para o grupo inteiro.',
        },
      ],
    },
    {
      key: 'estoque',
      label: 'Estoque',
      permissions: [
        { key: 'estoque:ver', label: 'Ver saldos e kardex', description: null },
        {
          key: 'estoque:movimentar',
          label: 'Movimentar estoque',
          description: 'Entrada, saída e ajuste. Estoque não se escreve: movimenta-se.',
        },
      ],
    },
    {
      key: 'depositos',
      label: 'Depósitos',
      permissions: [
        { key: 'depositos:ver', label: 'Ver depósitos', description: null },
        {
          key: 'depositos:gerenciar',
          label: 'Criar e alterar depósitos',
          description: 'O primeiro consumidor da permissão por ação (api#79).',
        },
      ],
    },
    {
      key: 'parceiros',
      label: 'Parceiros',
      permissions: [
        {
          key: 'parceiros:ver',
          label: 'Ver clientes, fornecedores e profissionais',
          description: null,
        },
        { key: 'parceiros:editar', label: 'Cadastrar e alterar parceiros', description: null },
      ],
    },
    {
      key: 'orcamento',
      label: 'Orçamento',
      permissions: [
        { key: 'orcamento:ver', label: 'Ver orçamentos', description: null },
        { key: 'orcamento:editar', label: 'Criar e alterar orçamentos', description: null },
        {
          key: 'orcamento:imprimir',
          label: 'Imprimir orçamento',
          description: 'Separada da edição: quem atende o cliente imprime sem poder mudar o preço.',
        },
        { key: 'orcamento:cancelar', label: 'Cancelar orçamento', description: null },
      ],
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      permissions: [
        { key: 'pedidos:ver', label: 'Ver pedidos', description: null },
        { key: 'pedidos:editar', label: 'Gerar e alterar pedidos', description: null },
        { key: 'pedidos:cancelar', label: 'Cancelar pedido', description: null },
      ],
    },
    {
      key: 'crm',
      label: 'CRM',
      permissions: [
        { key: 'crm:ver', label: 'Ver funis e oportunidades', description: null },
        { key: 'crm:editar', label: 'Mover cartões e editar oportunidades', description: null },
        {
          key: 'crm:gerenciar',
          label: 'Configurar funis, estágios e motivos de perda',
          description: 'Mexe no desenho do processo, não num negócio.',
        },
      ],
    },
    {
      key: 'atividades',
      label: 'Atividades e tarefas',
      permissions: [
        { key: 'atividades:ver', label: 'Ver atividades e tarefas', description: null },
        { key: 'atividades:editar', label: 'Registrar e concluir atividades', description: null },
      ],
    },
    {
      key: 'colaboradores',
      label: 'Colaboradores',
      permissions: [
        { key: 'colaboradores:ver', label: 'Ver colaboradores', description: null },
        {
          key: 'colaboradores:editar',
          label: 'Cadastrar colaboradores e vínculos',
          description: 'O e-mail do colaborador é a credencial de acesso.',
        },
      ],
    },
    {
      key: 'listas',
      label: 'Listas de apoio',
      permissions: [
        {
          key: 'listas:editar',
          label: 'Cadastrar itens de lista',
          description: 'A tabela é GLOBAL: o nome errado aparece no combo das outras empresas.',
        },
      ],
    },
    {
      key: 'papeis',
      label: 'Papéis e permissões',
      permissions: [
        {
          key: 'papeis:gerenciar',
          label: 'Criar e alterar papéis',
          description: 'Distribui permissão para os outros — é o que define o administrador.',
        },
      ],
    },
    {
      key: 'dashboard',
      label: 'Painel',
      permissions: [
        {
          key: 'dashboard:ver',
          label: 'Ver indicadores da empresa',
          description: 'Fatura, margem e agenda do grupo aparecem aqui.',
        },
      ],
    },
  ],
}

/** Toda chave que o catálogo publica — o que o `PUT` aceita e nada além. */
const CHAVES = new Set(CATALOGO.modules.flatMap((m) => m.permissions.map((p) => p.key)))

/** O papel GUARDADO — a linha da tabela, com o conjunto junto. */
interface PapelGuardado {
  id: string
  name: string
  description: string | null
  system: boolean
  template: boolean
  active: boolean
  permissions: string[]
}

const TODAS = [...CHAVES]

/**
 * A semente ANTECIPA a fase 3 do api#84, e é de propósito.
 *
 * `owner` e `admin` são os dois papéis de sistema; os outros três são
 * exatamente os papéis antigos que sobram da escala (`operator-full`,
 * `operator-sales`, `viewer`), já com o rótulo PT-BR que `src/data/papeis.ts`
 * lhes dá, agora na forma de template de fábrica. É o que a migração vai
 * produzir — semear outra coisa treinaria a tela contra um mundo que não vai
 * existir.
 */
function semear(): PapelGuardado[] {
  return [
    {
      id: novoId('papel'),
      name: 'Proprietário',
      description: 'Dono da organização. Não se remove e não se edita.',
      system: true,
      template: false,
      active: true,
      permissions: TODAS,
    },
    {
      id: novoId('papel'),
      name: 'Administrador',
      description: 'Acesso completo; cria usuários e papéis.',
      system: true,
      template: false,
      active: true,
      permissions: TODAS,
    },
    {
      id: novoId('papel'),
      name: 'Operador',
      description: 'O antigo `operator-full`, virado template.',
      system: false,
      template: true,
      active: true,
      permissions: TODAS.filter((k) => !k.startsWith('papeis:') && !k.startsWith('colaboradores:')),
    },
    {
      id: novoId('papel'),
      name: 'Operador de Vendas',
      description: 'O antigo `operator-sales`, virado template.',
      system: false,
      template: true,
      active: true,
      permissions: [
        'parceiros:ver',
        'parceiros:editar',
        'orcamento:ver',
        'orcamento:editar',
        'orcamento:imprimir',
        'pedidos:ver',
        'pedidos:editar',
        'crm:ver',
        'crm:editar',
        'atividades:ver',
        'atividades:editar',
        'produtos:ver',
        'estoque:ver',
      ],
    },
    {
      id: novoId('papel'),
      name: 'Consulta',
      description: 'O antigo `viewer`, virado template.',
      system: false,
      template: true,
      active: true,
      permissions: TODAS.filter((k) => k.endsWith(':ver')),
    },
  ]
}

let papeis: PapelGuardado[] = semear()

/**
 * USUÁRIOS DE ACESSO — o estado que a tela `/config/usuarios` escreve.
 *
 * Separado da semente de colaboradores do CRM de propósito: aquela vem da
 * transcrição (RH, sem e-mail) e é SÓ LEITURA; este arquivo guarda o que a
 * tela cria — a pessoa, a credencial (e-mail) e o vínculo (papel). A linha
 * criada aqui também entra em `crm.colaboradores` para que `GET /api/employees`
 * a liste — a listagem é uma só, e usuário criado que não aparecesse nela
 * pareceria não ter sido gravado.
 *
 * O que este mock reproduz de propósito, porque é o comportamento que o
 * contrato promete e o servidor implementa:
 *
 * - **colaborador nasce SEM credencial utilizável** (o api grava sentinela) —
 *   a senha só existe depois de `reset-password`;
 * - **a senha provisória aparece UMA vez** na resposta e em nenhuma leitura;
 * - **colaborador sem e-mail é 409 no reset** — e-mail É a credencial;
 * - **`roleId` é o único caminho do papel** (400 `papel-invalido` para papel
 *   inexistente ou inativo) e o vínculo repetido no `POST` é 409.
 */
type UsuarioDeAcesso = {
  id: string
  name: string
  email: string | null
  active: boolean
  /** Vínculo com a empresa ativa do mock; `null` = sem vínculo. */
  roleId: string | null
}

let usuarios: UsuarioDeAcesso[] = []

/** Devolve papéis E usuários à semente — irmão de `resetQuotes`, para o teste isolar. */
export function resetAcesso(): void {
  papeis = semear()
  // As linhas que a tela empurrou para a listagem compartilhada saem junto —
  // senão o segundo teste herda o usuário do primeiro.
  const criados = new Set(usuarios.map((u) => u.id))
  usuarios = []
  for (let i = crm.colaboradores.length - 1; i >= 0; i--) {
    const linha = crm.colaboradores[i]
    if (linha && criados.has(linha.id)) crm.colaboradores.splice(i, 1)
  }
  // Os tokens vão junto: link emitido por um teste que sobrevivesse ao reset
  // continuaria valendo no próximo, e "uso único" deixaria de ser mensurável.
  tokensDeCredencial.length = 0
}

function linha(papel: PapelGuardado): RoleDto {
  return {
    id: papel.id,
    name: papel.name,
    description: papel.description,
    system: papel.system,
    template: papel.template,
    active: papel.active,
    permissionCount: papel.permissions.length,
  }
}

function detalhe(papel: PapelGuardado): RoleDetailDto {
  return { ...linha(papel), permissions: [...papel.permissions] }
}

/** `sortBy` desta listagem — a whitelist que o contrato publica. */
export const ORDENAVEIS_PAPEL = ['name', 'active'] as const

/**
 * Valida o corpo de escrita. Devolve a resposta de erro, ou `undefined`.
 *
 * A permissão fora do catálogo é `campos-invalidos` com `fields[]` apontando
 * `permissions`, e não um 400 genérico: a tela precisa levar o erro à caixa, e
 * uma frase solta mandaria o admin conferir sessenta delas.
 */
function recusarCorpo(corpo: RoleWriteRequest, id: string | null) {
  if (!corpo.name?.trim()) {
    return camposInvalidos([{ path: 'name', message: 'Nome do papel é obrigatório.' }])
  }
  const desconhecidas = (corpo.permissions ?? []).filter((k) => !CHAVES.has(k))
  if (desconhecidas.length > 0) {
    return camposInvalidos([
      { path: 'permissions', message: `Fora do catálogo: ${desconhecidas.join(', ')}.` },
    ])
  }
  const repetido = papeis.some(
    (p) => p.id !== id && p.name.toLowerCase() === corpo.name.trim().toLowerCase(),
  )
  if (repetido) return conflito('Já existe um papel com este nome.')
  return undefined
}

/**
 * O detalhe que as escritas devolvem — `EmployeeDetailDto` com o papel
 * resolvido. Campo que a tela de acesso não gerencia sai `null`, e não
 * inventado: cargo, setor e datas são do cadastro de RH, outro trilho.
 */
function detalheDeUsuario(u: UsuarioDeAcesso): EmployeeDetailDto {
  const papel = u.roleId ? (papeis.find((p) => p.id === u.roleId) ?? null) : null
  return {
    id: u.id,
    name: u.name,
    document: null,
    email: u.email,
    phone: null,
    photoUrl: null,
    active: u.active,
    roleId: papel?.id ?? null,
    roleName: papel?.name ?? null,
    sectorId: null,
    sector: null,
    jobTitleId: null,
    jobTitle: null,
    hiredAt: null,
    dismissedAt: null,
    customerFacing: null,
    linkActive: u.roleId ? true : null,
  }
}

/**
 * Acha o usuário pelo id — inclusive um colaborador da SEMENTE do CRM, que
 * ganha registro de acesso na primeira vez que a tela mexe nele. A semente não
 * tem e-mail (a transcrição não traz), então o reset nela responde o 409 de
 * credencial ausente — que é verdade, e é o mesmo que o servidor diria.
 */
function acharUsuario(id: string): UsuarioDeAcesso | undefined {
  const meu = usuarios.find((u) => u.id === id)
  if (meu) return meu
  const daSemente = crm.colaboradores.find((c) => c.id === id)
  if (!daSemente) return undefined
  const novo: UsuarioDeAcesso = {
    id: daSemente.id,
    name: daSemente.name,
    email: null,
    active: daSemente.active,
    roleId: null,
  }
  usuarios.push(novo)
  return novo
}

/**
 * A senha provisória do mock — aleatória DE VERDADE, para a tela não poder
 * decorar um valor. Alfabeto sem ambíguos (0/O, 1/l/I): quem vai digitá-la é
 * um humano lendo por cima do ombro do admin.
 */
function gerarSenhaProvisoria(): string {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let senha = ''
  for (let i = 0; i < 12; i++) {
    senha += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  }
  return senha
}

/**
 * O TOKEN DE CREDENCIAL do mock — convite e recuperação.
 *
 * Um registro por emissão, e não um campo no usuário, porque é isso que torna
 * o "uso único" observável: gasto e substituído são estados diferentes de um
 * token que existiu, e apagá-los faria os dois responderem como link que nunca
 * existiu. A tela precisa distinguir para saber se oferece pedir outro.
 *
 * Vive em memória do módulo, como todo o resto do mock: recarregar a página
 * zera, e é honesto — o mock não é banco.
 */
type TokenDeCredencial = {
  token: string
  usuarioId: string
  purpose: 'invite' | 'reset'
  expiraEm: number
  usadoEm: number | null
  substituidoEm: number | null
}

const tokensDeCredencial: TokenDeCredencial[] = []

/**
 * Convite dura mais que recuperação, e a diferença é de quem os recebe: quem é
 * convidado pode estar de férias na semana em que foi cadastrado; quem pediu
 * uma recuperação está na frente da tela agora.
 */
const VALIDADE_MS: Record<TokenDeCredencial['purpose'], number> = {
  invite: 7 * 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
}

/**
 * Emite e MATA os anteriores do mesmo propósito. Dois links vivos dobram a
 * janela de quem interceptou um deles, e o segundo pedido é quase sempre "não
 * chegou" — não "quero mais um".
 */
function emitirToken(usuario: UsuarioDeAcesso, purpose: TokenDeCredencial['purpose']) {
  const agora = Date.now()
  for (const anterior of tokensDeCredencial) {
    const mesmo = anterior.usuarioId === usuario.id && anterior.purpose === purpose
    if (mesmo && !anterior.usadoEm && !anterior.substituidoEm) anterior.substituidoEm = agora
  }
  const registro: TokenDeCredencial = {
    // `randomUUID` e não o `novoId` sequencial do store: token previsível é
    // token adivinhável, e o site público demo serve este mock a quem quiser.
    token: crypto.randomUUID(),
    usuarioId: usuario.id,
    purpose,
    expiraEm: agora + VALIDADE_MS[purpose],
    usadoEm: null,
    substituidoEm: null,
  }
  tokensDeCredencial.push(registro)
  // O driver de log do servidor faz o mesmo em dev: sem e-mail de verdade, o
  // link precisa aparecer em ALGUM lugar, ou o fluxo não se demonstra.
  // `globalThis.location` e não `location`: o mesmo handler roda no navegador e
  // sob `msw/node` na suíte, e lá não existe `location` nenhum.
  const origem = globalThis.location?.origin ?? ''
  console.info(
    `[mock] link de ${purpose} para ${usuario.email}: ${origem}/definir-senha?token=${registro.token}`,
  )
  return { token: registro.token, expiresAt: new Date(registro.expiraEm).toISOString() }
}

/** A resposta de recusa, do mesmo formato que todo erro do contrato. */
type RecusaDeToken = ReturnType<typeof problemaJson>

/**
 * Confere sem gastar. Devolve a recusa PRONTA em vez de um booleano porque os
 * dois modos de falha têm URNs diferentes e a distinção é o que a tela usa:
 * expirado oferece pedir outro link, inválido não tem o que oferecer.
 */
function conferirToken(
  token: string,
): { registro: TokenDeCredencial; usuario: UsuarioDeAcesso } | { recusa: RecusaDeToken } {
  const registro = tokensDeCredencial.find((t) => t.token === token)
  if (!registro || registro.usadoEm || registro.substituidoEm) {
    return {
      recusa: problemaJson(400, 'Este link não vale mais.', {}, TIPO.tokenInvalido),
    }
  }
  if (registro.expiraEm <= Date.now()) {
    return {
      recusa: problemaJson(400, 'Este link expirou. Peça outro.', {}, TIPO.tokenExpirado),
    }
  }
  const usuario = acharUsuario(registro.usuarioId)
  // Usuário que sumiu do store depois da emissão: link sem dono é link morto.
  if (!usuario || !usuario.active) {
    return {
      recusa: problemaJson(400, 'Este link não vale mais.', {}, TIPO.tokenInvalido),
    }
  }
  return { registro, usuario }
}

function validarPapelDoVinculo(corpo: EmployeeLinkRequest) {
  if (!corpo.roleId) {
    return camposInvalidos([{ path: 'roleId', message: 'O vínculo não existe sem papel.' }])
  }
  const papel = papeis.find((p) => p.id === corpo.roleId)
  if (!papel || !papel.active) {
    return problemaJson(400, 'Papel inexistente ou inativo.', {}, TIPO.papelInvalido)
  }
  return undefined
}

export const handlersDeAcesso = [
  http.get('*/api/permissions', () => {
    if (!store.logado) return semSessao()
    return HttpResponse.json(CATALOGO)
  }),

  http.get('*/api/roles', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sem recorte por empresa ativa: papel é da ORGANIZAÇÃO, e quem é por
    // empresa é a ATRIBUIÇÃO, no vínculo.
    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const sortBy = url.searchParams.get('sortBy')
    const sortDesc = url.searchParams.get('sortDesc') === 'true'
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')

    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return problemaJson(
        400,
        'Paginação inválida: page é 1-based e pageSize vai até 100.',
        {},
        TIPO.paginacaoInvalida,
      )
    }
    if (sortBy && !ORDENAVEIS_PAPEL.some((o) => o === sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let rows = papeis.map(linha)
    if (q) {
      const alvo = q.toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(alvo))
    }
    if (sortBy) {
      const chave = sortBy as 'name' | 'active'
      rows.sort((a, b) => {
        const va = String(a[chave] ?? '')
        const vb = String(b[chave] ?? '')
        return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }
    const total = rows.length
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({ rows: rows.slice(inicio, inicio + pageSize), total })
  }),

  http.post('*/api/roles', async ({ request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('roles')
    if (semPermissao) return semPermissao
    const corpo = (await request.json()) as RoleWriteRequest
    const recusa = recusarCorpo(corpo, null)
    if (recusa) return recusa
    // `system` e `template` são do servidor: papel que se declarasse de sistema
    // pelo corpo passaria por cima da recusa de edição.
    const novo: PapelGuardado = {
      id: novoId('papel'),
      name: corpo.name.trim(),
      description: corpo.description ?? null,
      system: false,
      template: false,
      active: corpo.active ?? true,
      permissions: [...(corpo.permissions ?? [])],
    }
    papeis.push(novo)
    return HttpResponse.json(detalhe(novo), { status: 201 })
  }),

  http.get('*/api/roles/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    const achado = papeis.find((p) => p.id === String(params.id))
    if (!achado) return naoEncontrado('Papel não encontrado.')
    return HttpResponse.json(detalhe(achado))
  }),

  http.put('*/api/roles/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('roles')
    if (semPermissao) return semPermissao
    const achado = papeis.find((p) => p.id === String(params.id))
    if (!achado) return naoEncontrado('Papel não encontrado.')
    if (achado.system) {
      return conflito('Papel de sistema não é editável.', TIPO.papelDeSistema)
    }
    const corpo = (await request.json()) as RoleWriteRequest
    const recusa = recusarCorpo(corpo, achado.id)
    if (recusa) return recusa
    achado.name = corpo.name.trim()
    achado.description = corpo.description ?? null
    achado.active = corpo.active ?? true
    // Conjunto FINAL, não acréscimo — desmarcar caixa precisa ter efeito.
    achado.permissions = [...(corpo.permissions ?? [])]
    return HttpResponse.json(detalhe(achado))
  }),

  // ---------------- usuários de acesso (tela /config/usuarios) ----------------

  http.post('*/api/employees', async ({ request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('employees')
    if (semPermissao) return semPermissao
    const corpo = (await request.json()) as EmployeeWriteRequest
    if (!corpo.name?.trim()) {
      return camposInvalidos([{ path: 'name', message: 'Nome é obrigatório.' }])
    }
    // O schema declara `email` anulável, mas o SERVIDOR o exige no cadastro:
    // `employees.email` é NOT NULL e é por ele que a pessoa entra. O mock
    // espelha a recusa — sem isto a tela passaria aqui e quebraria lá.
    if (!corpo.email?.trim()) {
      return camposInvalidos([
        { path: 'email', message: 'Informe o e-mail — é por ele que a pessoa entra.' },
      ])
    }
    const email = corpo.email.trim().toLowerCase()
    // 409 e não 400: o pedido está bem formado — o e-mail é a credencial e ela
    // é única no produto inteiro, sem diferença de caixa (regra do contrato).
    if (email && usuarios.some((u) => u.email === email)) {
      return conflito('Já existe um colaborador com este e-mail.')
    }
    // O vínculo NASCE JUNTO, no papel de menor poder — igual ao servidor, que
    // vincula ao `viewer` no próprio CreateEmployee. É por isso que a tela usa
    // PUT para atribuir o papel escolhido: substituição, não criação.
    const papelInicial = papeis.find((p) => p.name === 'Consulta' && p.active) ?? null
    const novo: UsuarioDeAcesso = {
      id: novoId('usuario'),
      name: corpo.name.trim(),
      email,
      active: corpo.active ?? true,
      roleId: papelInicial?.id ?? null,
    }
    usuarios.push(novo)
    crm.colaboradores.push({
      id: novo.id,
      name: novo.name,
      sector: null,
      jobTitle: null,
      active: novo.active,
    })
    return HttpResponse.json(detalheDeUsuario(novo), { status: 201 })
  }),

  http.post('*/api/employees/:id/link', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('employees')
    if (semPermissao) return semPermissao
    const usuario = acharUsuario(String(params.id))
    if (!usuario) return naoEncontrado('Colaborador não encontrado.')
    const corpo = (await request.json()) as EmployeeLinkRequest
    const recusa = validarPapelDoVinculo(corpo)
    if (recusa) return recusa
    // POST cria; repetir é 409 (o contrato manda o PUT para substituir).
    if (usuario.roleId) return conflito('Vínculo já existe — use o Alterar.')
    usuario.roleId = corpo.roleId ?? null
    return HttpResponse.json(detalheDeUsuario(usuario), { status: 201 })
  }),

  http.put('*/api/employees/:id/link', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('employees')
    if (semPermissao) return semPermissao
    const usuario = acharUsuario(String(params.id))
    if (!usuario) return naoEncontrado('Colaborador não encontrado.')
    // PUT substitui o que existe; sem vínculo é 404, não criação disfarçada.
    if (!usuario.roleId) return naoEncontrado('Este colaborador não tem vínculo aqui.')
    const corpo = (await request.json()) as EmployeeLinkRequest
    const recusa = validarPapelDoVinculo(corpo)
    if (recusa) return recusa
    usuario.roleId = corpo.roleId ?? null
    return HttpResponse.json(detalheDeUsuario(usuario))
  }),

  http.post('*/api/employees/:id/reset-password', ({ params }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('employees')
    if (semPermissao) return semPermissao
    const usuario = acharUsuario(String(params.id))
    if (!usuario) return naoEncontrado('Colaborador não encontrado.')
    // E-mail É a credencial: sem ele não há o que resetar. 409 e não 400 — o
    // pedido está bem formado, é o ESTADO do recurso que recusa.
    if (!usuario.email) {
      return conflito('Colaborador sem e-mail não tem credencial para resetar.')
    }
    // A senha sai daqui e de NENHUMA leitura — igual ao servidor.
    return HttpResponse.json({ temporaryPassword: gerarSenhaProvisoria() })
  }),

  http.post('*/api/employees/:id/invite', ({ params }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('employees')
    if (semPermissao) return semPermissao
    const usuario = acharUsuario(String(params.id))
    if (!usuario) return naoEncontrado('Colaborador não encontrado.')
    if (!usuario.email)
      return conflito('Colaborador sem e-mail não tem para onde receber o convite.')
    if (!usuario.active) return conflito('Colaborador desativado não recebe convite.')
    const emitido = emitirToken(usuario, 'invite')
    return HttpResponse.json({ sentTo: usuario.email, expiresAt: emitido.expiresAt })
  }),

  // As TRÊS públicas. Sem `store.logado`, e é o ponto: quem chega aqui é quem
  // ainda não tem senha nenhuma. O mock reproduz isso para que a tela não seja
  // escrita assumindo uma sessão que no servidor não existiria.
  http.post('*/auth/forgot-password', async ({ request }) => {
    const { email } = (await request.json()) as { email?: string }
    const alvo = (email ?? '').trim().toLowerCase()
    const usuario = usuarios.find((u) => (u.email ?? '').toLowerCase() === alvo && u.active)
    // Só emite se achou — mas responde igual nos dois casos. A resposta é a
    // MESMA a ponto de não haver ramo depois deste `if`: qualquer diferença
    // observável (status, corpo, atraso) devolveria a enumeração de contas que
    // o 202 fixo existe para fechar.
    if (usuario) emitirToken(usuario, 'reset')
    return new HttpResponse(null, { status: 202 })
  }),

  http.post('*/auth/credential-token', async ({ request }) => {
    const { token } = (await request.json()) as { token?: string }
    const achado = conferirToken(token ?? '')
    if ('recusa' in achado) return achado.recusa
    const { registro, usuario } = achado
    return HttpResponse.json({
      purpose: registro.purpose,
      email: usuario.email,
      name: usuario.name,
      expiresAt: new Date(registro.expiraEm).toISOString(),
    })
  }),

  http.post('*/auth/set-password', async ({ request }) => {
    const { token, password } = (await request.json()) as { token?: string; password?: string }
    const achado = conferirToken(token ?? '')
    // Token ANTES da senha: recusar por senha curta num link que já não vale
    // faria a pessoa melhorar a senha e tomar o erro do link em seguida.
    if ('recusa' in achado) return achado.recusa
    if ((password ?? '').length < 8) {
      return problemaJson(400, 'A senha precisa de pelo menos 8 caracteres.', {}, TIPO.senhaFraca)
    }
    // Uso único: o token morre aqui, e é a marca — não a remoção — que deixa a
    // segunda tentativa distinguível de um link que nunca existiu.
    achado.registro.usadoEm = Date.now()
    return new HttpResponse(null, { status: 204 })
  }),
]
