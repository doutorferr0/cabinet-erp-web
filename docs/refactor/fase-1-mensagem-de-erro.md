# Fase 1 — `mensagemDoErro()`

## Problema

O mesmo ternário aparece em 13 lugares:

```ts
erro instanceof ErroDaApi
  ? (erro.detail ?? 'Não foi possível X. Tente de novo.')
  : erro
    ? 'Não foi possível X. Tente de novo.'
    : null
```

Só o texto do fallback muda por tela. Um ajuste na regra (por exemplo, tratar `erro.status`
diferente) hoje exige lembrar de 13 lugares.

## Sítios conhecidos

- `src/routes/cadastros/clientes/index.tsx`, `$clienteId.tsx`
- `src/routes/cadastros/fornecedores/index.tsx`, `$fornecedorId.tsx`
- `src/routes/cadastros/profissionais/index.tsx`, `$profissionalId.tsx`
- `src/routes/cadastros/produtos/index.tsx`, `$produtoId.tsx`
- `src/features/produto/produto-form.tsx`
- `src/features/dashboard/falha.tsx`
- `src/components/cabinet/data-table.tsx`

(confirmar contagem exata com `grep -rn "instanceof ErroDaApi" src` antes de começar — pode ter
mudado desde o levantamento.)

## Implementação

Novo helper em `src/lib/erros.ts` (arquivo novo, pasta já existe):

```ts
import { ErroDaApi } from '@/data/api-provider'

/** Mensagem para exibir ao operador: `detail` do servidor, ou o fallback da tela. */
export function mensagemDoErro(erro: unknown, fallback: string): string | null {
  if (erro instanceof ErroDaApi) return erro.detail || fallback
  return erro ? fallback : null
}
```

Cada sítio troca o ternário por `mensagemDoErro(erro, 'Não foi possível X. Tente de novo.')`.
**Não mudar o texto de nenhum fallback** — são específicos por tela (ex.: "Não foi possível
desativar." vs "Não foi possível consultar."). Copiar literalmente o texto que já existe em cada
sítio.

## Reuso

`ErroDaApi` já vem de `src/data/api-provider.ts` — não duplicar a classe, só importar.

## Verificação

- `pnpm check-types && pnpm test` — os testes que já cobrem os fluxos de erro (desativação
  falhando, etc.) continuam verdes sem alteração, porque a mensagem produzida é idêntica.
- Cobrir `ErroDaApi` com `detail: ''`: detalhe vazio não é mensagem para o operador e deve cair no
  fallback. É diferente de `null` só na implementação; para a interface, ambos significam
  "sem detalhe útil".
- Grep de confirmação: os ternários de mensagem do operador foram removidos das telas. As
  ocorrências restantes de `instanceof ErroDaApi` são usos semânticos de `detalheDoErro`, regras
  específicas de status 4xx/409 ou a mensagem especial da variante — não duplicam
  `mensagemDoErro`.
- Nenhuma tela muda visualmente — é puro refactor de lógica.

## Critério de saída

Zero ternário duplicado fora de `src/lib/erros.ts`. `pnpm check && pnpm check-types && pnpm test`
verdes. Commit único: `refactor: extrai mensagemDoErro`.
