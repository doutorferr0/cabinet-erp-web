import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/financeiro` não é tela — é o pai das duas agendas. A frase "escolha uma
 * opção no menu" que morava aqui mandava o operador de volta ao lugar de onde
 * ele veio; na 2.0 toda rota chega ao `PageHeader` ou declara por que não
 * (`toda-rota-tem-cabecalho.test.ts`), e um índice sem conteúdo é o segundo
 * caso. Cai em Contas a Receber, que é a agenda mais consultada; `replace`
 * para o `Voltar` não prender o operador entre as duas.
 */
export const Route = createFileRoute('/financeiro/')({
  beforeLoad: () => {
    throw redirect({ to: '/financeiro/receber', replace: true })
  },
})
