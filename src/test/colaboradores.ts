import { json } from '@/test/servidor'
import { type FetchStub, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'

/**
 * Servidor falso da tela de Colaborador — o ÚLTIMO cadastro a sair do mock.
 *
 * Existe pelo mesmo motivo de `src/test/parceiros.ts`: a listagem e a ficha
 * consomem o mesmo `/api/employees`, e um stub por arquivo de teste faria
 * versões diferentes do mesmo shape — a divergência apareceria como teste verde
 * sobre resposta que o servidor não devolve.
 *
 * Os valores nascem dos MEDIDOS em 25/08 contra a main `2ee954b` do api, com par
 * local próprio.
 */

const ID_PADRAO = 'ac956183-c6b5-4adf-9b3b-457eff3e5b4f'

/** Linha no shape EXATO do `EmployeeDto` — só os 5 campos que a listagem serve. */
export function colaboradorDaLista(over: Record<string, unknown> = {}) {
  return {
    id: ID_PADRAO,
    name: 'CARLA SOUZA',
    sector: 'VENDAS',
    jobTitle: 'VENDEDOR',
    active: true,
    ...over,
  }
}

/**
 * Ficha no shape EXATO do `EmployeeDetailDto`.
 *
 * **`sectorId` e `sector` viajam os DOIS**, e é assim no servidor: o formulário
 * precisa do id para gravar e do rótulo para mostrar. Helper que trouxesse só o
 * rótulo ensinaria a suíte a não ver a troca que faz o combo abrir vazio.
 *
 * Os ids são os que `respostaLookups()` publica (`lk-<KIND>-<n>`), e não uuids
 * inventados: a ficha traduz id → rótulo por `useRotulosDeApoio`, e id que não
 * está no vocabulário sai CRU na tela — o teste passaria a medir a ausência do
 * lookup em vez do que ele existe para medir.
 */
export function fichaDeColaborador(over: Record<string, unknown> = {}) {
  return {
    id: ID_PADRAO,
    name: 'CARLA SOUZA',
    document: null,
    email: null,
    phone: null,
    photoUrl: null,
    active: true,
    roleId: null,
    roleName: null,
    sectorId: 'lk-SETOR-1',
    sector: 'VENDAS',
    jobTitleId: 'lk-CARGO-1',
    jobTitle: 'VENDEDOR',
    hiredAt: '2020-03-01',
    dismissedAt: null,
    customerFacing: true,
    linkActive: true,
    ...over,
  }
}

export const ID_DO_COLABORADOR = ID_PADRAO

/**
 * O stub das duas rotas, mais a sessão e as listas de apoio que TODA tela pede.
 *
 * A ficha sai da MESMA lista que a listagem, resolvida por id: um stub que
 * devolvesse ficha fixa responderia "encontrado" para id que a listagem não
 * mostrou, e o teste de "abrir a linha" passaria sobre um servidor impossível.
 */
export function stubDeColaboradores(
  linhas: readonly ReturnType<typeof colaboradorDaLista>[] = [colaboradorDaLista()],
  fichas: readonly ReturnType<typeof fichaDeColaborador>[] = [fichaDeColaborador()],
): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (caminho === '/api/catalog-lookups') return Promise.resolve(respostaLookups())
    if (caminho === '/api/employees') {
      return Promise.resolve(json({ rows: linhas, total: linhas.length }))
    }
    if (caminho.startsWith('/api/employees/')) {
      const id = caminho.slice('/api/employees/'.length)
      const achada = fichas.find((f) => f.id === id)
      return Promise.resolve(
        achada
          ? json(achada)
          : new Response(
              JSON.stringify({
                type: 'about:blank',
                title: 'Não encontrado',
                status: 404,
                detail: 'Colaborador não encontrado.',
              }),
              { status: 404, headers: { 'content-type': 'application/problem+json' } },
            ),
      )
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}
