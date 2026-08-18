import { http, type RequestHandler, passthrough } from 'msw'

/**
 * AS ROTAS QUE O `cabinet-erp-api` JÁ SERVE — passthrough POR ROTA, não modo global.
 *
 * Decisão do user (2026-08-18): o front NÃO vira `VITE_API_MODE=http` de uma vez.
 * O backend existe e implementa **por partes** — toda operação do contrato que
 * ele ainda não serve responde **501** (é o combinado do `CLAUDE.md`, e é o que
 * torna a diferença visível). Virar o modo inteiro trocaria vinte telas que
 * funcionam por vinte telas que tomam 501, de uma vez, para ganhar quatro que
 * falam com o servidor de verdade. Então a divisão é por operação: o que está
 * NESTA lista sai do MSW e atravessa o proxy; todo o resto continua respondido
 * pela camada em memória, e a tela não sabe a diferença.
 *
 * **Esta lista é DÍVIDA DELIBERADA, não configuração permanente.** Ela existe
 * enquanto o contrato for maior que o backend, e o que ela mede — o quanto o
 * mock ainda finge — encolhe a cada módulo entregue do outro lado. No dia em que
 * as duas metades se encontrarem, o certo não é manter este arquivo com o
 * contrato inteiro dentro: é apagá-lo junto com `browser.ts` e ligar o modo
 * http, que era o plano desde sempre.
 *
 * *(Nota de leitura, porque o enunciado da tarefa diz o contrário e alguém vai
 * conferir: a lista em si CRESCE a cada entrega — mais rotas reais. O que
 * encolhe é a superfície mockada. Escrevi as duas metades para ninguém
 * "consertar" a direção achando que passou batido.)*
 *
 * Ao acrescentar rota aqui, o par obrigatório é: (1) a operação existe no
 * `contracts/openapi-v1.json` — o teste desta lista falha se não existir; (2) o
 * backend responde algo diferente de 501 nela. Rota adiantada é pior que rota
 * ausente: o mock deixa de responder e a tela toma 501 sem ninguém ter pedido.
 *
 * Estado medido em `cabinet-erp-api` main `246bf6f`: 14 operações.
 */

type Verbo = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type RotaDoBackend = {
  /** Verbo HTTP. A divisão é por VERBO + caminho, nunca por caminho só. */
  readonly metodo: Verbo
  /**
   * Caminho como o contrato o escreve, com parâmetro em `{...}`. A tradução
   * para o padrão do MSW (`:id`) e o `*` de origem moram em `padraoDoMsw()` —
   * escrever o caminho na forma do contrato é o que deixa a guarda do teste
   * comparar os dois lados sem tabela de conversão à mão.
   */
  readonly caminho: string
}

export const ROTAS_DO_BACKEND: readonly RotaDoBackend[] = [
  // saúde — não exige sessão, e é por onde se confere que o par local está de pé
  { metodo: 'get', caminho: '/health' },
  { metodo: 'get', caminho: '/health/db' },

  // sessão inteira (6 operações). Ou TODAS as seis passam, ou nenhuma: login
  // pelo servidor e `/auth/me` pelo mock daria duas verdades sobre a mesma
  // sessão — o cookie `cabinet_sessao` numa metade, o store em memória na
  // outra, e a tela acreditando na que respondeu primeiro.
  { metodo: 'post', caminho: '/auth/login' },
  { metodo: 'post', caminho: '/auth/logout' },
  { metodo: 'post', caminho: '/auth/change-password' },
  { metodo: 'get', caminho: '/auth/me' },
  { metodo: 'get', caminho: '/auth/tenants' },
  { metodo: 'put', caminho: '/auth/active-tenant' },

  // produtos: SÓ a listagem. `POST /api/products`, o detalhe por id e as
  // variantes seguem no mock porque o backend responde 501 neles — e a tela de
  // produto grava. Passar o caminho todo aqui quebraria o cadastro para ganhar
  // a consulta.
  { metodo: 'get', caminho: '/api/products' },

  // parceiro (5 operações) — os três papéis (cliente, fornecedor, profissional)
  // são o mesmo recurso com filtro `role`, então servir a listagem e o detalhe
  // atende as três telas de uma vez.
  { metodo: 'get', caminho: '/api/partners' },
  { metodo: 'post', caminho: '/api/partners' },
  { metodo: 'get', caminho: '/api/partners/{id}' },
  { metodo: 'put', caminho: '/api/partners/{id}' },
  { metodo: 'post', caminho: '/api/partners/{id}/link' },
]

/**
 * Caminho do contrato → padrão do MSW.
 *
 * O `*` na frente casa QUALQUER origem, que é o que os testes exigem (eles
 * apontam o cliente para uma base absoluta) e o que o navegador precisa quando
 * `VITE_API_URL` existe. Sem ele, o padrão só valeria para a origem da página.
 */
function padraoDoMsw(caminho: string): string {
  return `*${caminho.replace(/\{(\w+)\}/g, ':$1')}`
}

/**
 * Handlers que mandam a requisição para a REDE em vez de responder.
 *
 * `passthrough()` é o "não sou eu quem responde" do MSW: o worker deixa a
 * requisição seguir, o proxy do Vite a entrega em `VITE_API_PROXY` e o cookie
 * de sessão viaja porque a origem é a mesma (ver o comentário do proxy em
 * `vite.config.ts`).
 *
 * A ORDEM importa e é responsabilidade de quem monta o worker: estes vêm ANTES
 * dos handlers do mock — o MSW resolve no primeiro que casa — e antes do atraso
 * artificial, porque rota real já tem a latência dela e somar 250ms de mentira
 * mediria o servidor errado.
 */
export function handlersDePassagem(): RequestHandler[] {
  return ROTAS_DO_BACKEND.map(({ metodo, caminho }) =>
    http[metodo](padraoDoMsw(caminho), () => passthrough()),
  )
}
