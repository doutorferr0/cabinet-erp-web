import path from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Telas esperam o provider mock (latência simulada) várias vezes por teste;
    // sob paralelismo os 5000ms padrão estouram. Ver nota em src/test/setup.ts.
    testTimeout: 15000,
    /**
     * `.claude/worktrees/` FORA da varredura.
     *
     * São cópias de trabalho que a ferramenta deixa no repo, cada uma com o
     * próprio `src/`, e o padrão do vitest varre o repo inteiro. Medido em
     * 2026-08-08 com quatro worktrees paradas: `pnpm test` subiu de 59 arquivos
     * para 275 e reprovou 93 — e não por regressão. O alias `@` das cópias
     * resolve para o `./src` DESTE diretório, então testes de uma branch velha
     * rodavam contra o código de agora e falhavam por divergência de branch.
     *
     * Pior que o ruído: a falha era muda quanto à causa. O relatório dizia
     * "AppShell" e "FormGrid", nomes de arquivos que existem aqui, e nada
     * apontava para a cópia. É a mesma família do `biome check` que já saía 1
     * dentro de worktree.
     */
    /**
     * `e2e/` FORA da varredura, e pela razão oposta à de cima.
     *
     * Aquelas cópias eram ruído; estes são testes de VERDADE — só que de outro
     * corredor. `e2e/fluxo-vivo.spec.ts` importa `@playwright/test`, precisa de
     * navegador e de Postgres, e roda por `pnpm e2e`. Coletado aqui, ele derruba
     * `pnpm test` inteiro na importação: MEDIDO — 2069 casos verdes e um arquivo
     * vermelho que nunca teve chance de rodar.
     *
     * O padrão do vitest é `**\/*.{test,spec}.?(c|m)[jt]s?(x)`, e `.spec.ts`
     * casa: o nome do arquivo não separa os dois mundos. O diretório separa.
     */
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**', 'e2e/**'],
  },
})
