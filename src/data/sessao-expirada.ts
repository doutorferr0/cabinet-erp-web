import { ErroDaApi } from '@/data/api-provider'
import type { UseMutationResult } from '@tanstack/react-query'

/**
 * Sessão que venceu NO MEIO de um envio — o pior caso do trilho Auth-Mock
 * (#124, ponto 3): o operador preencheu cinquenta campos, clicou em Gravar, e o
 * cookie já não valia.
 *
 * ## O que faz a digitação se perder, e o que não faz
 *
 * O payload não se perde por si: o React Query guarda em `mutation.variables` o
 * que foi enviado na última tentativa, e o formulário continua montado com os
 * valores. **O que perde tudo é a TELA sair** — se a guarda de sessão desmontar
 * o formulário para mandar ao login, o que estava digitado vai junto, e voltar
 * depois traz a tela em branco.
 *
 * Por isso o tratamento é local, e não um redirecionamento: a tela **fica**, diz
 * o que houve e oferece entrar de novo ali mesmo. Reautenticado, o mesmo
 * payload é reenviado — sem redigitar nada.
 */

/** `true` quando o servidor recusou por sessão vencida (401). */
export function ehSessaoExpirada(erro: unknown): boolean {
  return erro instanceof ErroDaApi && erro.status === 401
}

/** O mínimo de uma mutação que este módulo precisa — não amarra tipo de retorno. */
export type MutacaoObservavel<TVars> = Pick<
  UseMutationResult<unknown, Error, TVars>,
  'error' | 'variables' | 'isPending'
> & { mutate: (variaveis: TVars) => void }

export interface EnvioInterrompido<TVars> {
  /** A sessão venceu durante o envio e há payload guardado para reenviar. */
  expirou: boolean
  /** O que foi enviado e o servidor recusou — o que seria redigitado à mão. */
  payload: TVars | undefined
  /** Reenvia o MESMO payload. Sem sessão nova, cai em 401 outra vez. */
  reenviar: () => void
}

/**
 * Lê uma mutação e diz se ela parou por sessão vencida, com o payload em mãos.
 *
 * Não é hook: é função pura sobre o estado que o React Query já mantém. Guardar
 * o payload numa cópia própria criaria uma segunda verdade — e ela ficaria
 * velha justamente no caso que importa, quando o operador corrige um campo e
 * tenta de novo antes de reautenticar.
 */
export function envioInterrompido<TVars>(
  mutacao: MutacaoObservavel<TVars>,
): EnvioInterrompido<TVars> {
  const expirou = ehSessaoExpirada(mutacao.error)
  return {
    expirou,
    payload: expirou ? mutacao.variables : undefined,
    reenviar: () => {
      // `variables` é `undefined` antes do primeiro envio; reenviar aí não tem
      // sentido e mandaria `undefined` como corpo.
      if (mutacao.variables !== undefined) mutacao.mutate(mutacao.variables)
    },
  }
}
