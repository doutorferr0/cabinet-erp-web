import { RotaInexistente } from '@/app/rota-inexistente'
import { routeTree } from '@/routeTree.gen'

/**
 * A configuração do roteador, num lugar só.
 *
 * Existe porque o app e os testes montavam o router SEPARADAMENTE — `main.tsx`
 * de um lado, `renderRoute` de `src/test/utils.tsx` do outro — e nada obrigava
 * os dois a concordarem. Uma opção acrescentada só no app passa a ser um
 * comportamento que teste nenhum cobre; acrescentada só no teste, é um teste que
 * afirma coisa que o operador não vive. O primeiro caso aconteceu na fase 3 com
 * o `defaultNotFoundComponent`.
 *
 * Quem monta o router junta isto com o que só ele sabe: o `history` (memória no
 * teste, navegador no app).
 *
 * **`defaultNotFoundComponent`, e não `notFoundComponent` na raiz:** a raiz só
 * atende endereço que não casa com ramo nenhum. Endereço errado DENTRO de um
 * módulo (`/cadastros/qualquer-coisa`) é atendido pelo layout daquele módulo, e
 * ali o TanStack cai no default dele — "Not Found", cru e em inglês (medido).
 * São quatro módulos com layout; o default cobre os quatro de uma vez.
 */
export const opcoesDoRouter = {
  routeTree,
  defaultNotFoundComponent: RotaInexistente,
} as const
