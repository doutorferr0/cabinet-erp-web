import { defineConfig } from 'orval'

/**
 * Codegen do cliente a partir do contrato.
 *
 * `contracts/openapi-v1.json` é o CONTRATO deste repositório — especificação de
 * ENTRADA do backend, não cópia recebida de fora. Muda só por PR aqui, e o diff
 * dele é a revisão da fronteira.
 *
 * O cliente gerado é COMMITADO: build e testes não dependem de rodar codegen, e
 * a revisão vê o que mudou. `pnpm codegen` regenera; o passo `Codegen is up to
 * date` do CI reprova gerado fora de sincronia com o contrato.
 *
 * O Orval também gera os handlers MSW (`index.msw.ts`): o mock de dev nasce do
 * MESMO contrato que o cliente — não existe drift possível entre os dois. O
 * modo `split` existe por isso: msw/faker ficam num arquivo que só o modo mock
 * importa, fora do bundle de produção.
 *
 * Todo tráfego passa pelo mutator `apiFetch` (src/api/http.ts): ponto único de
 * `credentials: 'include'` e do shape `{ data, error, response }` que a camada
 * `src/data/*` consome.
 */
export default defineConfig({
  cliente: {
    input: { target: './contracts/openapi-v1.json' },
    output: {
      target: 'src/api/gerado/index.ts',
      mode: 'split',
      client: 'fetch',
      httpClient: 'fetch',
      mock: true,
      clean: true,
      override: {
        mutator: { path: 'src/api/http.ts', name: 'apiFetch' },
      },
    },
  },
})
