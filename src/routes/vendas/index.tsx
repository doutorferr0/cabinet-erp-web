import { HubDeModulo } from '@/components/cabinet/hub-de-modulo'
import { Link, createFileRoute } from '@tanstack/react-router'

/**
 * `?de=cadastros` — a única marca de proveniência que esta rota aceita.
 *
 * Ela existe porque `/cadastros` passou a redirecionar para cá (D26) e um
 * redirecionamento mudo é o pior dos dois mundos: o operador digita um endereço
 * e chega noutro sem entender o que aconteceu. O repo não tem toast, então o
 * recado viaja na URL e é o HUB de destino que o mostra.
 *
 * Validar em vez de repassar `search` cru não é cerimônia: sem isto, qualquer
 * texto na query entraria no componente, e um `?de=<script>` viraria conteúdo
 * de tela. Valor fora do previsto some — não é erro, é ausência de aviso.
 */
export const Route = createFileRoute('/vendas/')({
  validateSearch: (busca: Record<string, unknown>): { de?: 'cadastros' } =>
    busca.de === 'cadastros' ? { de: 'cadastros' } : {},
  component: VendasHome,
})

function VendasHome() {
  const { de } = Route.useSearch()
  return (
    <HubDeModulo
      modulo="vendas"
      aviso={
        de === 'cadastros' ? (
          <>
            O grupo <b className="font-semibold">Cadastros</b> deixou de existir: cada cadastro
            passou a morar no processo que o usa. Cliente e profissional estão em Vendas, fornecedor
            em Compras, produto em Estoque —{' '}
            <Link to="/cadastros/clientes" className="underline underline-offset-2">
              abrir Clientes
            </Link>
            .
          </>
        ) : undefined
      }
    />
  )
}
