/**
 * Ponto de configuração do cliente HTTP.
 *
 * A implementação mora em `src/api/http.ts` (o mutator do Orval — transporte
 * único de todo request). Este módulo re-exporta para manter estável o caminho
 * que `main.tsx` e os testes chamam na subida: `configurarApi()`.
 */
export { configurarApi } from './http'
