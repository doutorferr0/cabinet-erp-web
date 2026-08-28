import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { carregarTitulo } from '@/data/financeiro-api'
import {
  type TituloEmEdicao,
  TituloForm,
  paraEdicao,
  tituloVazio,
} from '@/features/financeiro/titulo-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financeiro/pagar/titulos/$tituloId')({
  component: TituloAPagarPage,
  validateSearch: validateModoSearch,
})

/**
 * O provider do documento monta-se AQUI, e não no registry.
 *
 * A entrada de registry é para tela de cadastro com DataTable — o que a listagem
 * de títulos usa. Este é o outro tipo de fronteira: `get` por id e registro em
 * branco. Ele traduz DTO → forma do formulário na borda, que é onde
 * `paraEdicao`/`tituloVazio` moram.
 */
const provider = {
  get: async (id: string): Promise<TituloEmEdicao | null> => {
    const dto = await carregarTitulo(id)
    return dto ? paraEdicao(dto) : null
  },
  empty: () => tituloVazio('payable'),
}

function TituloAPagarPage() {
  const { tituloId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = tituloId === 'novo'

  return (
    <TelaDeDocumento
      provider={provider}
      queryKeyBase="titulo-financeiro"
      idParam={tituloId}
      titulo="Título a pagar"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(t) => t.number}
      naoEncontrado="Título não encontrado."
      erroAoCarregar="Não foi possível carregar o título."
    >
      {(titulo) => <TituloForm titulo={titulo} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
