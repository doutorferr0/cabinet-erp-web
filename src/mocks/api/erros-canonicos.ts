import type { ProblemDetails, ProblemType } from '@/api/gerado'
import { type Extensoes, problemaJson, tituloDoProblema } from './problema'

/**
 * O CORPO canônico de cada URN do vocabulário — a fixture única de erro do MSW.
 *
 * `problema.ts` já dava o `type` e o `title` certos. O que ele NÃO dava é o
 * resto do corpo: o `status` e o `detail` continuavam digitados em cada ponto de
 * chamada, e por isso a mesma recusa saía com status diferente conforme o
 * handler — o PUT de produto recusava campo obrigatório com `about:blank` e uma
 * frase solta enquanto o POST, três dedos acima, mandava `campos-invalidos` com
 * `fields[]`. A tela não tem como tratar duas formas do mesmo erro, e o Spring,
 * que vai reimplementar isto, leria as duas como se fossem duas regras.
 *
 * ## O que mora aqui e o que NÃO mora
 *
 * `status` e `detail` de exemplo, e os MEMBROS DE EXTENSÃO que a URN carrega.
 * Nada mais: o `title` continua vindo de `tituloDoProblema`, e o "quando" de
 * cada URN continua sendo a tabela do `ProblemType` no contrato. Copiar
 * qualquer um dos dois para cá daria uma segunda fonte, e a que ninguém confere
 * é a que envelhece — o `status` daqui só sobrevive porque
 * `erros-canonicos.test.ts` o compara com o do contrato, linha a linha.
 *
 * ## O `satisfies` é a guarda
 *
 * `Record<Exclude<ProblemType, 'about:blank'>, …>` e não `Partial`: URN nova no
 * contrato sem entrada aqui **não compila**, do mesmo jeito que já acontece com
 * `TITULO_POR_TIPO`. `about:blank` fica de fora porque nele não há corpo
 * canônico — o status é o do caso e o `detail` é a frase de quem recusou.
 *
 * ## `origem` — quem emite isto HOJE, e é declaração com sonda
 *
 * `mock` diz que algum handler de `src/mocks/` emite a URN; `so-contrato` diz
 * que o vocabulário a declara e ninguém a emite ainda; `cliente` é a única que
 * nenhum servidor manda — `resposta-nao-json` é sintetizada por
 * `src/api/http.ts`. A declaração não fica solta: o teste varre o fonte do mock
 * e reprova quem declarar `so-contrato` numa URN que passou a ser emitida (ou o
 * contrário). É o mesmo regime de `rotas-do-backend.ts` — declarar a ausência é
 * barato, e o que a torna confiável é ter quem a invalide.
 */

type MembroDeExtensao = keyof Extensoes

/** O tipo com corpo canônico. `about:blank` não tem um — ver o cabeçalho. */
export type TipoCanonico = Exclude<ProblemType, 'about:blank'>

export type ErroCanonico = {
  status: number
  /** `detail` de exemplo: o que o mock emite hoje, ou a frase que ele emitiria. */
  detail: string
  extensoes: readonly MembroDeExtensao[]
  origem: 'mock' | 'so-contrato' | 'cliente'
}

export const ERROS_CANONICOS = {
  // ---------------- sessão e permissão ----------------
  'urn:cabinet:erro:sem-sessao': {
    status: 401,
    detail: 'Não autenticado.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:senha-precisa-trocar': {
    status: 403,
    detail: 'Troque a senha antes de continuar.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:sem-vinculo-com-empresa': {
    status: 403,
    detail: 'Usuário não tem vínculo com a empresa informada.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:papel-insuficiente': {
    status: 403,
    detail: 'O papel deste vínculo não permite alterar partners.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- consulta e validação ----------------
  'urn:cabinet:erro:campos-invalidos': {
    status: 400,
    detail: 'Confira os campos destacados.',
    extensoes: ['fields'],
    origem: 'mock',
  },
  'urn:cabinet:erro:ordenacao-invalida': {
    status: 400,
    detail: 'sortBy inválido: nome.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:paginacao-invalida': {
    status: 400,
    detail: 'Paginação inválida: page é 1-based e pageSize vai até 100.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:filtro-invalido': {
    status: 400,
    detail: 'Este recurso não publica o parâmetro filters.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:papel-invalido': {
    status: 400,
    detail: 'Papel inexistente ou inativo.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:hierarquia-em-laco': {
    status: 400,
    detail: 'O depósito não pode descer de si mesmo.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- credencial ----------------
  'urn:cabinet:erro:senha-atual-invalida': {
    status: 400,
    detail: 'A senha atual não confere.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:senha-fraca': {
    status: 400,
    detail: 'A senha precisa de pelo menos 8 caracteres.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:token-invalido': {
    status: 400,
    detail: 'Este link não vale mais.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:token-expirado': {
    status: 400,
    detail: 'Este link expirou. Peça outro.',
    extensoes: [],
    origem: 'mock',
  },
  // 502 e não 500: quem falhou é um terceiro — ver a tabela do contrato.
  'urn:cabinet:erro:email-nao-enviado': {
    status: 502,
    detail: 'O servidor de e-mail não respondeu. Tente de novo.',
    extensoes: [],
    origem: 'so-contrato',
  },

  // ---------------- a escada física da venda (G4) ----------------
  'urn:cabinet:erro:liberacao-acima-do-vendido': {
    status: 409,
    detail: 'Falta liberar 3 de 10. Liberar 5 passaria do vendido.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:separacao-sem-liberacao': {
    status: 409,
    detail: 'Liberado para separação: 2. Libere antes de separar 5.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:entrega-sem-separacao': {
    status: 409,
    detail: 'Separado e ainda não entregue: 1. Não se entrega o que ninguém tirou da prateleira.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:entrega-fechada': {
    status: 409,
    detail: 'Romaneio fechado ou cancelado não recebe item. Abra outro.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:entrega-vazia': {
    status: 409,
    detail: 'Romaneio sem item não fecha. Cancele-o, se nada saiu.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:entrega-de-outro-pedido': {
    status: 409,
    detail: 'A linha não é deste pedido — o romaneio pertence a outro documento.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- cadastro ----------------
  'urn:cabinet:erro:nao-encontrado': {
    status: 404,
    detail: 'Parceiro não encontrado.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:sem-empresa-ativa': {
    status: 409,
    detail: 'Nenhuma empresa ativa na sessão.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:documento-ja-cadastrado': {
    status: 409,
    detail: 'Documento já cadastrado no grupo.',
    extensoes: ['existingPartnerId'],
    origem: 'mock',
  },
  'urn:cabinet:erro:email-ja-cadastrado': {
    status: 409,
    detail: 'Já existe um colaborador com este e-mail.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:codigo-ja-cadastrado': {
    status: 409,
    detail: 'Já existe produto com o código LUM-001.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:vinculo-ja-existe': {
    status: 409,
    detail: 'Vínculo já existe — use o Alterar.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:papel-de-sistema': {
    status: 409,
    detail: 'Papel de sistema não é editável.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- suporte da plataforma ----------------
  'urn:cabinet:erro:sem-concessao-de-suporte': {
    status: 403,
    detail: 'Esta operação é da superfície de suporte da plataforma.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:suporte-ja-em-organizacao': {
    status: 409,
    detail: 'Já há acesso aberto em Vertz Iluminação. Encerre antes de abrir outro.',
    extensoes: ['openGrantId'],
    origem: 'mock',
  },
  'urn:cabinet:erro:concessao-encerrada': {
    status: 409,
    detail: 'Este acesso já foi encerrado.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- ciclo do documento ----------------
  'urn:cabinet:erro:pedido-ja-convertido': {
    status: 409,
    detail: 'Este orçamento já virou pedido.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:transicao-invalida': {
    status: 409,
    detail: 'Documento já está cancelado.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:demonstracao-em-aberto': {
    status: 409,
    detail: 'A peça da demonstração ainda não voltou.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:orcamento-ja-revisado': {
    status: 409,
    detail: 'Este orçamento já tem revisão. Revise a mais recente.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- pagamento ----------------
  'urn:cabinet:erro:valor-nao-parcelavel': {
    status: 400,
    detail: 'O total do documento não alcança o mínimo para parcelar.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:parcelas-acima-do-teto': {
    status: 400,
    detail: 'A condição tem 12 parcelas e o limite da empresa é 6.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:parcela-abaixo-do-minimo': {
    status: 400,
    detail: 'Alguma parcela ficaria abaixo do valor mínimo da empresa.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- compras ----------------
  'urn:cabinet:erro:faturamento-minimo-nao-atingido': {
    status: 409,
    detail: 'O grupo Luminárias não atinge o faturamento mínimo do fornecedor.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:item-ja-em-ordem': {
    status: 409,
    detail: 'Pedido com linha já levada por uma ordem não se reescreve.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:ordem-ja-enviada': {
    status: 409,
    detail: 'Ordem já enviada.',
    extensoes: [],
    origem: 'mock',
  },
  'urn:cabinet:erro:fornecedor-divergente': {
    status: 409,
    detail: 'A linha 2 do pedido PC-0007 é de outro fornecedor.',
    extensoes: [],
    origem: 'mock',
  },

  // ---------------- comissão (G13) ----------------
  'urn:cabinet:erro:periodo-ja-fechado': {
    status: 409,
    detail: 'Este período já foi fechado em 31/07/2026.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:origem-ja-paga': {
    status: 409,
    detail: 'Alguma origem do período já foi paga em outro fechamento.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:participante-ja-apurado': {
    status: 409,
    detail: 'Esta participação já virou linha de fechamento.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:profissional-exige-transferencia': {
    status: 409,
    detail: 'Trocar o profissional principal exige transferência, com data e justificativa.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:reserva-ja-lancada': {
    status: 409,
    detail: 'Este pedido já tem reserva técnica ativa para o profissional.',
    extensoes: [],
    origem: 'so-contrato',
  },

  // ---------------- tesouraria (G7) ----------------
  'urn:cabinet:erro:periodo-fechado': {
    status: 409,
    detail: 'A data cai dentro de um período já fechado para esta conta.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:titulo-com-baixa': {
    status: 409,
    detail: 'Este título já tem pagamento lançado.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:parcela-ja-quitada': {
    status: 409,
    detail: 'Esta parcela já está quitada.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:valor-acima-do-saldo': {
    status: 409,
    detail: 'A baixa abate mais do que a parcela deve.',
    extensoes: [],
    origem: 'so-contrato',
  },
  'urn:cabinet:erro:movimento-ja-conciliado': {
    status: 409,
    detail: 'Este movimento já foi conciliado.',
    extensoes: [],
    origem: 'so-contrato',
  },

  // ---------------- fase ----------------
  'urn:cabinet:erro:nao-implementado': {
    status: 501,
    detail:
      'A apuração de custo e margem é feita pelo servidor, e este ambiente não o tem. O preço de tabela e o preço de venda sugerido continuam disponíveis.',
    extensoes: [],
    origem: 'mock',
  },
  // `status: 0` é o do contrato, e é o ponto: não houve resposta HTTP do
  // contrato para atribuir status. Quem o sintetiza preenche o status REAL da
  // resposta que não era JSON — ver `respostaQueNaoEDaApi` em `src/api/http.ts`.
  'urn:cabinet:erro:resposta-nao-json': {
    status: 0,
    detail: '`/api/partners` respondeu 200 com `text/html`, e o contrato só devolve JSON.',
    extensoes: [],
    origem: 'cliente',
  },
} as const satisfies Record<TipoCanonico, ErroCanonico>

/**
 * A resposta de erro do MSW montada pela fixture — status e `detail` vêm daqui.
 *
 * `detail` é opcional e a maioria dos handlers não o passa: a frase canônica já
 * é a certa, e repeti-la no ponto de chamada é como as versões divergiam. Quem
 * passa é quem tem CONTEXTO a acrescentar — o código do produto que colidiu, a
 * linha da ordem —, porque aí a frase específica é melhor que a genérica.
 *
 * `extras` é tipado pelos membros que AQUELA URN declara: mandar
 * `existingPartnerId` num erro que não o publica não compila, em vez de virar
 * membro que o `ProblemDetails` do contrato apaga na serialização.
 */
export function erroCanonico<T extends TipoCanonico>(
  tipo: T,
  extras?: Pick<Extensoes, (typeof ERROS_CANONICOS)[T]['extensoes'][number]>,
  detail?: string,
) {
  const canonico = ERROS_CANONICOS[tipo]
  return problemaJson(canonico.status, detail ?? canonico.detail, extras ?? {}, tipo)
}

/** O corpo canônico como objeto — o que a doc do Spring publica como exemplo. */
export function corpoCanonico(tipo: TipoCanonico): ProblemDetails {
  const canonico = ERROS_CANONICOS[tipo]
  return {
    type: tipo,
    title: tituloDoProblema(tipo, canonico.status),
    status: canonico.status,
    detail: canonico.detail,
  }
}
