import { DefinirSenhaTela } from '@/features/login/definir-senha'
import { createFileRoute, useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/definir-senha')({
  component: Pagina,
  /**
   * O token vem da barra de endereço — é entrada de FORA, e a fronteira é aqui.
   *
   * Só a forma é conferida: comprimento plausível e o alfabeto de `base64url`,
   * que é o que o servidor gera. Quem diz se ele VALE é o servidor, e não
   * poderia ser diferente — validar conteúdo aqui exigiria conhecer o segredo.
   *
   * Token fora de forma vira `undefined` em vez de erro de rota: a tela mostra
   * "link inválido", que é a mensagem certa, em vez de uma tela de erro do
   * roteador que não diz nada a quem clicou num link torto.
   */
  validateSearch: (busca: Record<string, unknown>): { token?: string | undefined } => {
    const token = busca.token
    const forma = typeof token === 'string' && /^[A-Za-z0-9_-]{16,256}$/.test(token)
    // `token: undefined` EXPLÍCITO, e não um objeto sem a chave. A busca de um
    // match é o merge com a do pai, e a raiz não valida nada: devolver `{}`
    // não REMOVE a chave — deixa passar a do pai, crua. Medido nesta bateria,
    // com um `<script>` chegando inteiro na tela.
    return { token: forma ? (token as string) : undefined }
  },
})

function Pagina() {
  // `useSearch({ from })` e não `Route.useSearch()`: com `autoCodeSplitting` o
  // componente sai para outro módulo, e o `Route` que ele importa não é a
  // instância que o router montou — a busca voltava CRUA, sem passar pelo
  // `validateSearch` acima. Medido: token torto chegava inteiro na tela. É a
  // mesma forma que `/login` usa, e a que a bateria de open redirect cobre.
  const { token } = useSearch({ from: '/definir-senha' })
  return <DefinirSenhaTela token={token} />
}
