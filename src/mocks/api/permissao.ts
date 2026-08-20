import { type FamiliaDeCaminho, podeEscrever } from '@/data/papeis'
import { TIPO, problemaJson } from './problema'
import { store } from './store'

/**
 * Papel do vínculo ativo no mock.
 *
 * O papel mora no vínculo (`VinculoDeEmpresa.role`), não na sessão: a mesma
 * pessoa pode ser `viewer` numa empresa e `admin` em outra.
 */
export function papelDaSessao(): string | null {
  if (!store.activeTenantId) return null
  return store.empresas.find((e) => e.tenantId === store.activeTenantId)?.role ?? null
}

/**
 * 403 de papel insuficiente.
 *
 * O `type` vai no parâmetro de TIPO, não entre as extensões: `Extensoes` são os
 * dois membros que a RFC deixa a mais (`fields`, `existingPartnerId`), e a URN
 * é membro do próprio `ProblemDetails`. Escrita ali, ela chegaria por cima do
 * `type` montado por `problemaJson` e o título canônico sairia do tipo errado —
 * a tela imprimiria "Sem permissão" (o rótulo do `about:blank` em 403) no lugar
 * de "Papel insuficiente", que é o que o contrato fixa para esta URN.
 *
 * E a URN vem do `TIPO`, que é apelido do enum gerado — a mesma razão pela qual
 * `src/lib/erros.ts` deixou de escrevê-la: o mock que inventa vocabulário
 * mente com cara de servidor.
 */
export function SEM_PERMISSAO(familia: FamiliaDeCaminho) {
  return problemaJson(
    403,
    `O papel deste vínculo não permite alterar ${familia}.`,
    {},
    TIPO.papelInsuficiente,
  )
}

/**
 * Verifica se o papel ativo alcança a escrita na família.
 *
 * Devolve a resposta de erro quando não alcança; caso contrário, devolve
 * `undefined` para o handler seguir.
 */
export function verificarEscrita(
  familia: FamiliaDeCaminho,
): ReturnType<typeof problemaJson> | undefined {
  const papel = papelDaSessao()
  if (!papel || !podeEscrever(papel, familia)) {
    return SEM_PERMISSAO(familia)
  }
  return undefined
}
