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
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
})
