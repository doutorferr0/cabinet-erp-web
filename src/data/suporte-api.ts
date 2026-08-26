import type { SupportGrantDto, SupportGrantRequest } from '@/api/gerado'
import {
  getSupportGrant,
  listSupportGrantAudit,
  listSupportGrants,
  openSupportGrant,
  revokeSupportGrant,
} from '@/api/gerado'
import type { PagedResultOfSupportAuditEntryDto, PagedResultOfSupportGrantDto } from '@/api/gerado'
import { dadosOuErro, itemOuNulo } from '@/data/api-provider'

/**
 * FRONTEIRA DO SUPORTE-DA-PLATAFORMA — `/api/platform/support-grants`.
 *
 * O item 6 da fundação (`current-state.md` @pendencias): o `super-admin` que
 * não chegou a existir, quebrado em identidade (não concede nada) e concessão
 * (uma organização, com motivo e prazo).
 *
 * ## Por que a fronteira existe antes da tela
 *
 * Não há console de suporte ainda — é superfície administrativa separada
 * (`project-core.md` @arquitetura) e trilho próprio, como a web#292 decidiu
 * para a tela de checkboxes de papéis. Este arquivo existe assim mesmo porque a
 * REGRA DE ACESSO A DADO não abre exceção: tela nenhuma chama o cliente gerado
 * direto, e a tela que vier vai pedir daqui. Escrevê-lo junto do contrato custa
 * pouco; escrevê-lo depois convidaria a primeira tela a improvisar o caminho.
 *
 * ## O que este arquivo NÃO faz, de propósito
 *
 * **Não decide expiração.** `expiresAt` serve para a tela desenhar a contagem;
 * quem diz se a concessão ainda vale é o servidor, a cada requisição, e é por
 * isso que `status` vem pronto no corpo. Comparar `expiresAt` com o relógio do
 * navegador poria a decisão de acesso a dado de terceiro num relógio que o
 * operador ajusta — e o erro seria silencioso, porque a tela mostraria "ativo"
 * com a mesma cara de sempre.
 *
 * **Não guarda cache de concessão.** Concessão viva é estado de servidor com
 * prazo curto; guardá-la aqui faria a tela continuar exibindo acesso aberto
 * depois de o prazo ter passado do outro lado.
 *
 * ## Não é `ResourceProvider`, e não entra no `data` registry
 *
 * O registry serve às telas de CADASTRO, com listagem, detalhe e registro em
 * branco. Aqui não há "incluir em branco" — não existe concessão rascunho, e
 * `abrir()` é uma AÇÃO com efeito imediato e trilha, não um `create` de
 * formulário. Encaixá-la no molde de cadastro daria à tela um botão "Incluir"
 * que abriria acesso a dado de cliente com o corpo pela metade.
 */

export const URL_CONCESSOES = '/api/platform/support-grants'

/** Whitelist de `sortBy` — a MESMA da descrição do contrato. */
export const ORDENAVEIS_CONCESSAO = ['grantedAt', 'expiresAt', 'organizationName'] as const

export type EstadoDaConcessao = 'active' | 'expired' | 'revoked'

export interface ConsultaDeConcessoes {
  organizationId?: string
  status?: EstadoDaConcessao
  page?: number
  pageSize?: number
  sortBy?: (typeof ORDENAVEIS_CONCESSAO)[number]
  sortDir?: 'asc' | 'desc'
}

export const suporteApi = {
  /** As concessões — abertas, encerradas e vencidas. Trilha, não acesso. */
  async listar(consulta: ConsultaDeConcessoes = {}): Promise<PagedResultOfSupportGrantDto> {
    const resposta = await listSupportGrants(consulta)
    return dadosOuErro<PagedResultOfSupportGrantDto>(
      resposta,
      'Falha ao consultar os acessos de suporte.',
    )
  },

  async obter(id: string): Promise<SupportGrantDto | null> {
    return itemOuNulo<SupportGrantDto>(await getSupportGrant(id), 'o acesso de suporte')
  },

  /**
   * ABRE o acesso. O corpo vai INTEIRO e sem valor de conveniência: motivo e
   * prazo em branco são recusa do servidor (400 `campos-invalidos`), e é a
   * recusa que este trilho existe para garantir. Preencher qualquer um deles
   * aqui, "para facilitar", desfaria a garantia do lado que ninguém audita.
   */
  async abrir(pedido: SupportGrantRequest): Promise<SupportGrantDto> {
    const resposta = await openSupportGrant(pedido)
    return dadosOuErro<SupportGrantDto>(resposta, 'Falha ao abrir o acesso de suporte.')
  },

  /** ENCERRA antes do prazo. Sem corpo — ver a descrição da operação. */
  async encerrar(id: string): Promise<SupportGrantDto> {
    const resposta = await revokeSupportGrant(id)
    return dadosOuErro<SupportGrantDto>(resposta, 'Falha ao encerrar o acesso de suporte.')
  },

  /** A trilha da concessão. Só leitura — o front não escreve entrada nenhuma. */
  async trilha(
    id: string,
    consulta: { page?: number; pageSize?: number; sortDir?: 'asc' | 'desc' } = {},
  ): Promise<PagedResultOfSupportAuditEntryDto> {
    const resposta = await listSupportGrantAudit(id, consulta)
    return dadosOuErro<PagedResultOfSupportAuditEntryDto>(
      resposta,
      'Falha ao consultar a trilha do acesso.',
    )
  },
}
