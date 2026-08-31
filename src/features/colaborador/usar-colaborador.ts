import type { EmployeeDetailDto } from '@/api/gerado'
import {
  atualizarColaborador,
  corpoDeEscrita,
  corpoDeInclusao,
  daFichaDoServidor,
  incluirColaborador,
  obterFichaDoColaborador,
} from '@/data/colaboradores-api'
import { avisar } from '@/lib/avisos'
import { type Colaborador, colaboradorVazio } from '@/mocks/colaboradores'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

const ROTA_DA_LISTAGEM = '/cadastros/colaboradores' as const

/**
 * Query da ficha + as duas escritas do cadastro de Colaborador (#402).
 *
 * Mesma forma de `usarParceiro`, e pelo mesmo motivo mecânico: **a query
 * segura o `EmployeeDetailDto` original enquanto o formulário está aberto**.
 * O `PUT` é integral e `document`/`photoUrl` não têm controle na tela — eles
 * viajam de volta pelo `corpoDeEscrita`, que precisa da ficha como o servidor a
 * mandou. Guardar só o `Colaborador` derivado apagaria os dois no primeiro
 * Gravar de quem foi cadastrado por `/config/usuarios`.
 *
 * A rota continua sendo quem decide o que mostrar (ficha, formulário, erro);
 * este hook é só a fronteira de dados dela.
 */
export function usarColaborador(idParam: string) {
  const isNovo = idParam === 'novo'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['colaborador', idParam],
    queryFn: () => obterFichaDoColaborador(idParam),
    enabled: !isNovo,
  })

  const ficha = isNovo ? null : (query.data ?? null)

  /**
   * O registro na forma da TELA. Em `Incluir` é o branco local — o backend não
   * fornece registro em branco e não há por que esperar rede para abrir um
   * formulário vazio.
   */
  const registro: Colaborador | null = isNovo
    ? colaboradorVazio()
    : ficha
      ? daFichaDoServidor(ficha)
      : null

  /**
   * Gravou: avisa, reconsulta a listagem e volta.
   *
   * O aviso entra AQUI porque este é o único ponto que sabe que a escrita
   * terminou — a tela que tinha o formulário está sendo desmontada na linha
   * seguinte, e a listagem que recebe o operador é idêntica à que ele viu antes
   * de editar (`lib/avisos.ts`, #201).
   *
   * A invalidação usa a chave de LISTAGEM inteira e a da ficha: o `Alterar`
   * muda o nome, que é coluna da grade, e a ficha aberta em outra aba ficaria
   * com o valor velho.
   */
  async function aposGravar(dto: EmployeeDetailDto, mensagem: string) {
    avisar(mensagem, dto.name)
    await queryClient.invalidateQueries({ queryKey: ['colaboradores'] })
    await queryClient.invalidateQueries({ queryKey: ['colaborador'] })
    void navigate({ to: ROTA_DA_LISTAGEM })
  }

  const incluir = useMutation({
    mutationFn: (values: Colaborador) => incluirColaborador(corpoDeInclusao(values)),
    onSuccess: (dto) => aposGravar(dto, 'Colaborador incluído.'),
  })

  const gravar = useMutation({
    mutationFn: (values: Colaborador) => {
      // Sem a ficha original não há o que gravar: o `PUT` precisa devolver
      // `document` e `photoUrl` como vieram, e inventá-los aqui seria apagar
      // dado que ninguém pediu para apagar.
      if (!ficha) throw new Error('Sem a ficha do servidor não há o que gravar.')
      return atualizarColaborador(ficha.id, corpoDeEscrita(ficha, values))
    },
    onSuccess: (dto) => aposGravar(dto, 'Alterações gravadas.'),
  })

  return { query, isNovo, ficha, registro, incluir, gravar }
}
