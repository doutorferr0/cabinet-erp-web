import { ErroDaApi } from '@/data/api-provider'

/** `detail` do problem+json, quando o erro veio da API — `undefined` fora disso. */
export function detalheDoErro(erro: unknown): string | undefined {
  return erro instanceof ErroDaApi ? erro.detail : undefined
}

/** Mensagem para exibir ao operador: `detail` do servidor, ou o fallback da tela. */
export function mensagemDoErro(erro: unknown, fallback: string): string | null {
  // `detail` truthy, não só não-`null` — problem+json com `"detail": ""` (backend
  // que sempre emite o membro) tem que cair no fallback, senão a tela mostra
  // título de erro com descrição em branco.
  if (erro instanceof ErroDaApi) return erro.detail ? erro.detail : fallback
  return erro ? fallback : null
}
