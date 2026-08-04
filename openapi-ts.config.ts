import { defineConfig } from '@hey-api/openapi-ts'

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
 */
export default defineConfig({
  input: { path: './contracts/openapi-v1.json' },
  output: { path: 'src/api/gerado', format: false, lint: false },
  plugins: ['@hey-api/client-fetch'],
})
