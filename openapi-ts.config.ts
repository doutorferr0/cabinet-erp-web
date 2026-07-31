import { defineConfig } from '@hey-api/openapi-ts'

/**
 * Codegen do cliente a partir do contrato do backend.
 *
 * `contracts/openapi-v1.json` é CÓPIA VERSIONADA do
 * `docs/contrato/openapi-v1.json` do `vitra-erp-dotnet`. Cópia e não referência
 * porque são dois repositórios: o arquivo aqui é o que este front realmente
 * consome, e o diff dele é a notificação de que o backend mudou.
 *
 * O cliente gerado é COMMITADO: build e testes não dependem de rodar codegen, e
 * a revisão vê o que mudou na fronteira. `pnpm codegen` regenera; se o diff não
 * for vazio depois de atualizar o contrato, é porque o backend mudou de forma.
 */
export default defineConfig({
  input: { path: './contracts/openapi-v1.json' },
  output: { path: 'src/api/gerado', format: false, lint: false },
  plugins: ['@hey-api/client-fetch'],
})
