import { data } from '@/data'
import { FornecedorForm } from '@/features/fornecedor/fornecedor-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/fornecedores/$fornecedorId')({
  component: FornecedorEditPage,
  validateSearch: validateModoSearch,
})

function FornecedorEditPage() {
  const { fornecedorId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = fornecedorId === 'novo'

  // Só o "Incluir" chega até o formulário. A listagem vem de `GET /api/partners`
  // e o contrato NÃO tem detalhe por id: buscar no mock casaria o uuid do
  // servidor com id inventado e responderia "não encontrado" para quem existe.
  const registro = isNovo ? data.fornecedores.empty(Date.now() % 100000) : null

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
        Cadastro de Fornecedores{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${registro.nomeFantasia}`}
      </h1>
      <FornecedorForm fornecedor={registro} readOnly={readOnly} />
    </div>
  )
}
