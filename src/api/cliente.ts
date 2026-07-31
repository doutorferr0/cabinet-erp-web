import { client } from '@/api/gerado/client.gen'

/**
 * Configuração do cliente gerado.
 *
 * `credentials: 'include'` é obrigatório: a sessão é um COOKIE opaco (ADR-010, D2),
 * e sem isso o navegador não o envia em requisição cross-origin — o back
 * responderia 401 em tudo e pareceria bug de autenticação.
 *
 * A URL base vem de variável de ambiente porque é configuração de implantação,
 * não contrato: o `openapi-v1.json` do backend não traz `servers` de propósito.
 */
export function configurarApi(baseUrl = import.meta.env.VITE_API_URL ?? '/') {
  client.setConfig({ baseUrl, credentials: 'include' })
}
