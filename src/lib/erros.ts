import { ErroDaApi } from '@/data/api-provider'

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
 * Só o STATUS decide. O `type` do problem+json diria mais (qual permissão
 * falta), mas ler o membro exigiria fixar vocabulário de `type` com o backend,
 * e isso é assunto do contrato — aqui basta o código HTTP, que já é dado.
 */
export function ehSemPermissao(erro: unknown): boolean {
  return erro instanceof ErroDaApi && erro.status === 403
}

/** Mensagem para exibir ao operador: `detail` do servidor, ou o fallback da tela. */
export function mensagemDoErro(erro: unknown, fallback: string): string | null {
  // `detail` truthy, não só não-`null` — problem+json com `"detail": ""` (backend
  // que sempre emite o membro) tem que cair no fallback, senão a tela mostra
  // título de erro com descrição em branco.
  if (erro instanceof ErroDaApi) return erro.detail ? erro.detail : fallback
  return erro ? fallback : null
}
