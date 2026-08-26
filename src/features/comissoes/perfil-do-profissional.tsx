import { Painel } from '@/components/cabinet/painel'
import { FaixasDeComissao } from '@/features/comissoes/faixas-de-comissao'

/**
 * O PERFIL DE PARTICIPAÇÃO NO CADASTRO DO PROFISSIONAL.
 *
 * Monta FORA do `<form>` do cadastro, como `PainelDeAtividades`, e pela mesma
 * razão: as faixas são sub-recurso (`/api/partners/{id}/commission-tiers`) com
 * `PUT` próprio, e dentro do formulário o botão delas disputaria o submit.
 *
 * ## Por que a porta do PARCEIRO nasce montada e a do COLABORADOR não
 *
 * A família `/api/partners` já atravessa o proxy inteira: o id que este cadastro
 * carrega é o mesmo que o servidor conhece. A do colaborador não — `listEmployees`
 * passa, mas `data.colaboradores` continua sendo provider de mock, e as duas
 * listas de pessoas divergem (é a costura que `CoberturaDoColaborador` declara em
 * voz alta). Pendurar o perfil de comissão naquele cadastro mandaria ao servidor
 * o uuid de quem ele não conhece, e o 404 sairia com cara de "esta pessoa não tem
 * faixa".
 *
 * A porta `employee` existe na fronteira (`useFaixas('employee', …)`) e liga no
 * dia em que a tela do colaborador migrar — que é o mesmo dia em que as duas
 * sementes viram uma.
 */
export function PerfilDeParticipacaoDoProfissional({
  partnerId,
  readOnly = false,
}: { partnerId: string | null; readOnly?: boolean }) {
  return (
    <Painel titulo="Perfil de participação" modulo="profissionais">
      <FaixasDeComissao porta="partner" pessoaId={partnerId} readOnly={readOnly} />
    </Painel>
  )
}
