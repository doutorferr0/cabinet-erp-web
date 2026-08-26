import type { EmployeeDetailDto, EmployeeDto } from '@/api/gerado'
import { getEmployee } from '@/api/gerado'
import { createApiListProvider, itemOuNulo } from '@/data/api-provider'
import type { DocumentoProvider, ListProvider } from '@/data/provider'
import { type Colaborador, colaboradorVazio } from '@/mocks/colaboradores'

/**
 * FRONTEIRA DE COLABORADORES — a última entrada de CADASTRO a sair do mock.
 *
 * `GET /api/employees` e `GET /api/employees/{id}` estavam na lista de passagem
 * desde a #276, e o mock respondia por esta tela mesmo assim. O resultado era o
 * que `cobertura-do-colaborador.tsx` descreve em voz alta: com o par local de
 * pé, o combo de responsável das atividades oferecia as pessoas do Postgres e
 * este cadastro listava as da semente — **duas listas de quem trabalha aqui**, e
 * o operador vendo a errada dependendo da tela em que estivesse.
 *
 * MEDIDO em 2026-08-25 contra a main `2ee954b` do api, par local próprio: a
 * listagem responde `{rows,total}` com `q`, `page`, `pageSize` e `sortBy`, e o
 * detalhe devolve o `EmployeeDetailDto` inteiro. Nada aqui é suposição de
 * contrato — as duas rotas foram exercidas com sessão real.
 *
 * ## A LINHA e o DOCUMENTO são tipos diferentes, como em produtos e orçamento
 *
 * A grade recebe o `EmployeeDto` CRU, porque é o que faz o `sortBy` casar com a
 * whitelist do servidor (`name`, `sector`, `jobTitle`, `active` — medido: pedir
 * `nome` responde 400 `urn:cabinet:erro:ordenacao-invalida`). O formulário
 * recebe `Colaborador`, a forma da transcrição §2.
 *
 * ## O contrato v1 é MUITO menor que o formulário, e isso fica VISÍVEL
 *
 * `EmployeeDetailDto` traz 17 campos; a §2 da transcrição tem ~30. Sexo, raça,
 * estado civil, filiação, naturalidade, nacionalidade e o bloco inteiro de RH
 * **não existem no contrato** — e `EmployeeWriteRequest` diz por quê, em letra:
 * "salário e o resto do bloco de RH ficam fora deste corte: a pergunta de LGPD
 * sobre dado sensível de funcionário segue sem resposta, e campo sem regra de
 * acesso é pior que campo ausente".
 *
 * Esses campos nascem em BRANCO, como em `produtos-api.ts` — a alternativa
 * seria esconder do formulário o que o cadastro precisa vir a ter, apagando a
 * dívida em vez de mostrá-la.
 *
 * ## O que NÃO migrou junto, e não foi esquecimento
 *
 * 1. **A ESCRITA.** `Gravar` continua sendo `console.info`. `POST /api/employees`
 *    e `PUT /api/employees/{id}` existem e respondem — mas com **403
 *    `urn:cabinet:erro:papel-insuficiente`** para `operator-full`, que é o papel
 *    da semente e do usuário demo (medido em 25/08, contra a mesma main). A
 *    matriz do api reserva esta família a `admin` por razão própria e boa:
 *    vínculo é o que decide o papel dos OUTROS. Ligar a escrita agora trocaria
 *    um cadastro que finge gravar por um que recusa — e a pergunta "quem
 *    cadastra colaborador?" continua sem resposta de produto.
 * 2. **O FILTRO ESTRUTURADO.** Esta era a tela piloto do filtro por módulo do
 *    lado mock, e `GET /api/employees` **não publica `filters`**: pedir responde
 *    400 `Este recurso não publica o parâmetro filters` (medido). Por isso
 *    `createApiListProvider` é chamado SEM `filtraveis` — e é essa ausência que
 *    faz `filtrosDaTabela` lançar, com o nome do arquivo, se alguém devolver
 *    campos filtráveis à tela antes de o contrato publicar o parâmetro.
 */
export const listaDeColaboradores: ListProvider<EmployeeDto> = createApiListProvider<EmployeeDto>({
  url: '/api/employees',
})

/**
 * `EmployeeDetailDto` → `Colaborador`.
 *
 * Os campos fora do contrato saem de `colaboradorVazio()`, e não de literais
 * espalhados: um branco escrito à mão aqui divergiria do branco do "Incluir" na
 * primeira vez que o formulário ganhasse campo.
 *
 * **`setor` e `cargo` recebem o ID, não o nome.** O formulário e a ficha os
 * tratam como lista de apoio (`useRotulosDeApoio` traduz id → rótulo na
 * leitura), e o DTO traz os dois: `sectorId`/`sector` e `jobTitleId`/`jobTitle`.
 * Gravar o NOME onde a tela espera id faria o combo abrir sem seleção e a ficha
 * imprimir o rótulo cru — parece certo na tela e erra na hora de gravar.
 */
export function daFichaDoServidor(dto: EmployeeDetailDto): Colaborador {
  return {
    ...colaboradorVazio(),
    id: dto.id,
    nome: dto.name,
    ativo: dto.active,
    setor: dto.sectorId ?? null,
    cargo: dto.jobTitleId ?? null,
    atendimentoCliente: dto.customerFacing ?? false,
    dataAdmissao: dto.hiredAt ?? null,
    dataDemissao: dto.dismissedAt ?? null,
  }
}

/**
 * Um colaborador por id. `null` quando não existe — 409 (sem empresa ativa) e
 * 403 continuam sendo ERRO, que é o que `itemOuNulo` separa.
 */
export async function obterColaborador(id: string): Promise<Colaborador | null> {
  const dto = itemOuNulo<EmployeeDetailDto>(await getEmployee(id), `o colaborador ${id}`)
  return dto ? daFichaDoServidor(dto) : null
}

/**
 * O provider de DOCUMENTO da tela de detalhe. `empty` continua local: o backend
 * não fornece registro em branco, e "Incluir" não precisa esperar rede.
 */
export const documentoDoColaborador: DocumentoProvider<Colaborador> = {
  get: obterColaborador,
  empty: colaboradorVazio,
}
