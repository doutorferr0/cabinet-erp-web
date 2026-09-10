import { createFileRoute } from '@tanstack/react-router'
import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { carregarTitulo } from '@/data/financeiro-api'
import {
  paraEdicao,
  type TituloEmEdicao,
  TituloForm,
  tituloVazio,
} from '@/features/financeiro/titulo-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'

export const Route = createFileRoute('/financeiro/receber/titulos/$tituloId')({
  component: TituloAReceberPage,
  validateSearch: validateModoSearch,
})

/** Mesmo provider da outra direção — só o registro em branco muda de lado. */
const provider = {
  get: async (id: string): Promise<TituloEmEdicao | null> => {
    const dto = await carregarTitulo(id)
    return dto ? paraEdicao(dto) : null
  },
  empty: () => tituloVazio('receivable'),
}

function TituloAReceberPage() {
  const { tituloId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = tituloId === 'novo'

  return (
    <TelaDeDocumento
      provider={provider}
      queryKeyBase="titulo-financeiro"
      idParam={tituloId}
      titulo="Título a receber"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(t) => t.number}
      naoEncontrado="Título não encontrado."
      erroAoCarregar="Não foi possível carregar o título."
    >
      {(titulo) => <TituloForm titulo={titulo} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
