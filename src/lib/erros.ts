import { ProblemType } from '@/api/gerado'
import { ErroDaApi } from '@/data/api-provider'
import { ehModuloEmConstrucao, mensagemDeConstrucao } from '@/data/modulos-em-construcao'

/** `detail` do problem+json, quando o erro veio da API — `undefined` fora disso. */
export function detalheDoErro(erro: unknown): string | undefined {
  return erro instanceof ErroDaApi ? erro.detail : undefined
}

/**
 * `true` quando o servidor recusou por PERMISSÃO (403), não por falha.
 *
 * A distinção existe porque muda o que a tela oferece: falha pede "tentar de
 * novo", e recusa por permissão não — repetir a mesma requisição com a mesma
 * sessão dá 403 de novo, e o botão vira uma promessa que a tela não cumpre.
 *
 * O status ainda é o guarda. O `type` do problem+json ganhou vocabulário
 * fechado no contrato (#269) e é lido por `tipoDoErro`, mas `ehSemPermissao`
 * continua sendo o teste de permissão genérico.
 */
export function ehSemPermissao(erro: unknown): boolean {
  return erro instanceof ErroDaApi && erro.status === 403
}

/**
 * Os três 403 do servidor, pelos APELIDOS que esta camada usa.
 *
 * Antes não líamos `type` porque o vocabulário não existia. Ele existe desde a
 * #269: é o enum fechado `ProblemType`, declarado no contrato e trazido pelo
 * codegen — e por isso **as URNs não são escritas aqui**. Copiá-las como texto
 * daria uma segunda cópia do vocabulário, e cópia envelhece calada: URN que o
 * contrato renomeasse continuaria compilando e nunca mais casaria, e o defeito
 * apareceria como 403 sem tratamento, que é exatamente o que a #245 veio
 * corrigir. Vindo do gerado, URN inventada não compila.
 *
 * Só os três aparecem porque só eles são 403 — o vocabulário inteiro tem 22
 * termos e o resto não é assunto desta função.
 */
export const TIPOS_DE_PROBLEMA = {
  senhaPrecisaTrocar: ProblemType['urn:cabinet:erro:senha-precisa-trocar'],
  semVinculoComEmpresa: ProblemType['urn:cabinet:erro:sem-vinculo-com-empresa'],
  papelInsuficiente: ProblemType['urn:cabinet:erro:papel-insuficiente'],
} as const satisfies Record<string, ProblemType>

export type TipoDeProblema = keyof typeof TIPOS_DE_PROBLEMA

/**
 * O `type` como veio no corpo.
 *
 * Tipado como `ProblemType | undefined` e não `string`: o contrato declara o
 * membro obrigatório e o vocabulário fechado, então o que não está nele não é
 * tipo — é resposta que não é da API, e para essa o `undefined` já é a resposta
 * certa. A checagem continua sendo de execução porque o corpo chega `unknown`:
 * o contrato governa o servidor, não o que trafega.
 */
function typeDoErro(erro: unknown): ProblemType | undefined {
  if (!(erro instanceof ErroDaApi)) return undefined
  const corpo = erro.corpo as { type?: unknown } | null | undefined
  const type = corpo?.type
  if (typeof type !== 'string') return undefined
  return (Object.values(ProblemType) as string[]).includes(type) ? (type as ProblemType) : undefined
}

/** Classifica o 403 do servidor; devolve `undefined` para outros erros. */
export function tipoDoErro(erro: unknown): TipoDeProblema | undefined {
  if (!ehSemPermissao(erro)) return undefined
  const type = typeDoErro(erro)
  if (!type) return undefined
  for (const [chave, urn] of Object.entries(TIPOS_DE_PROBLEMA)) {
    if (type === urn) return chave as TipoDeProblema
  }
  return undefined
}

export function ehErroDePapelInsuficiente(erro: unknown): boolean {
  return tipoDoErro(erro) === 'papelInsuficiente'
}

export function ehErroDeSenhaPrecisaTrocar(erro: unknown): boolean {
  return tipoDoErro(erro) === 'senhaPrecisaTrocar'
}

export function ehErroDeSemVinculoComEmpresa(erro: unknown): boolean {
  return tipoDoErro(erro) === 'semVinculoComEmpresa'
}

/**
 * Mensagem para exibir ao operador: `detail` do servidor, ou o fallback da tela.
 *
 * **O 501 não usa o fallback de quem chamou**, e essa é a exceção que faz este
 * caminho valer a pena. Os fallbacks do repo terminam todos em "tente de novo"
 * — é a frase certa para rede fora e a errada para módulo que o servidor ainda
 * não serve, onde tentar de novo dá exatamente o mesmo 501. Quem chega aqui com
 * um 501 recebe a frase de construção, com o `detail` do servidor por cima
 * quando ele veio.
 */
export function mensagemDoErro(erro: unknown, fallback: string): string | null {
  if (ehModuloEmConstrucao(erro)) return mensagemDeConstrucao(erro)

  // `detail` truthy, não só não-`null` — problem+json com `"detail": ""` (backend
  // que sempre emite o membro) tem que cair no fallback, senão a tela mostra
  // título de erro com descrição em branco.
  if (erro instanceof ErroDaApi) return erro.detail ? erro.detail : fallback
  return erro ? fallback : null
}
