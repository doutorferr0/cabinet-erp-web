/**
 * A rota que o operador tentou abrir antes da guarda mandá-lo para o login.
 *
 * Existe porque perder o destino é perder trabalho: quem clicou num link de
 * `/cadastros/clientes/123` com a sessão vencida voltava para o Dashboard e
 * tinha de refazer a navegação inteira à mão. O destino viaja no `redirect` da
 * busca de `/login`, e é a URL que a barra de endereço mostraria.
 *
 * ## Por que validar em vez de aceitar a string
 *
 * `redirect` vem da barra de endereço, então é entrada de fora: qualquer pessoa
 * pode montar `/login?redirect=https://outro-site` e mandar o link para o
 * operador. Depois de entrar, ele seria despejado no site do atacante **com a
 * sessão recém-criada** — a classe de falha conhecida como open redirect. A
 * defesa não é escapar a string, é recusar tudo que não seja um caminho interno.
 */

/**
 * `true` só para caminho interno que vale a pena reabrir depois do login.
 *
 * Recusa, e o motivo de cada recusa:
 * - **vazio ou sem `/` inicial** — não é caminho, é palavra solta;
 * - **`//` ou `/\`** — o browser lê `//host` como URL absoluta protocol-relative,
 *   que sai do site apesar de começar com barra. É o open redirect clássico;
 * - **`:` antes da primeira `/`** — `javascript:` e afins;
 * - **o próprio `/login`** — voltar ao login depois de entrar é laço, e é o que
 *   aconteceria com o `redirect` que a própria guarda escreve se ela disparasse
 *   estando já em `/login`.
 */
export function rotaDeOrigemValida(bruto: unknown): bruto is string {
  if (typeof bruto !== 'string' || bruto.length === 0) return false
  if (!bruto.startsWith('/')) return false
  // `//` e `/\` viram autoridade externa no browser, mesmo começando com barra.
  if (bruto.startsWith('//') || bruto.startsWith('/\\')) return false
  // Esquema antes de qualquer barra seguinte: `/javascript:...` não é caminho.
  const primeiroSegmento = bruto.slice(1).split('/')[0] ?? ''
  if (primeiroSegmento.includes(':')) return false
  // `/login` e `/login?...` — reabrir a tela de entrada depois de entrar é laço.
  if (bruto === '/login' || bruto.startsWith('/login?')) return false
  return true
}

/**
 * O destino a abrir depois do login: a origem preservada, ou o Dashboard.
 *
 * O padrão é `/dashboard` porque é a entrada do sistema (decisão do user) — o
 * `redirect` só desvia disso quando a guarda de fato interrompeu uma navegação.
 */
export function destinoDepoisDoLogin(redirect: unknown): string {
  return rotaDeOrigemValida(redirect) ? redirect : '/dashboard'
}
