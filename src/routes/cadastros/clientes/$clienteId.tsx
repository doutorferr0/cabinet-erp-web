import { data } from '@/data'
import { ClienteForm } from '@/features/cliente/cliente-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/clientes/$clienteId')({
  component: ClienteEditPage,
  validateSearch: validateModoSearch,
})

function ClienteEditPage() {
  const { clienteId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = clienteId === 'novo'

  // Só o "Incluir" chega até o formulário. A listagem vem de `GET /api/partners`
  // e o contrato NÃO tem detalhe por id: buscar no mock casaria o uuid do
  // servidor com id inventado e responderia "não encontrado" para quem existe.
  const registro = isNovo ? data.clientes.empty(Date.now() % 100000) : null

  if (!registro) {
    return (
      <p className="max-w-prose text-muted-foreground">
        O servidor ainda não publica o detalhe de um parceiro (
        <code>GET /api/partners/{'{id}'}</code>), então este cadastro só pode ser aberto em branco
        pelo <strong>Incluir</strong>.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de Clientes {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${registro.nome}`}
      </h1>
      <ClienteForm cliente={registro} readOnly={readOnly} />
    </div>
  )
}
