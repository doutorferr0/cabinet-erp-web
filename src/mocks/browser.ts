import { setupWorker } from 'msw/browser'
import { handlers } from './api/handlers'

/**
 * Worker do modo mock (`VITE_API_MODE=mock`): intercepta o fetch NO NAVEGADOR,
 * no nível de rede — `src/data/*`, o cliente gerado e o DevTools veem
 * requisições reais. Só é importado (dinamicamente) quando o modo está ligado:
 * msw/faker não entram no bundle de produção.
 */
export const worker = setupWorker(...handlers)
