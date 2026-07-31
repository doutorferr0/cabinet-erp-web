import { client } from '@/api/gerado/client.gen'

/**
 * Configuração do cliente gerado.
 *
 * `credentials: 'include'` é obrigatório: a sessão é um COOKIE opaco (ADR-010, D2),
 * e sem isso o navegador não o envia em requisição cross-origin — o back
 * responderia 401 em tudo e pareceria bug de autenticação.
 *
 * **O padrão é `/` — mesma origem.** Em desenvolvimento quem leva `/api` e
 * `/auth` até o backend é o proxy do `vite.config.ts`, então o cookie não
 * atravessa origem nenhuma e não depende de `SameSite=None` nem de CORS.
 *
 * `VITE_API_URL` fica para a implantação em que front e back saem de origens
 * diferentes — é configuração de implantação, não contrato (o `openapi-v1.json`
 * do backend não traz `servers` de propósito).
 */
export function configurarApi(baseUrl = import.meta.env.VITE_API_URL ?? '/') {
  client.setConfig({ baseUrl, credentials: 'include' })
}
