import type { EmployeeDetailDto, EmployeeDto, EmployeeWriteRequest } from '@/api/gerado'
import { createEmployee, getEmployee, updateEmployee } from '@/api/gerado'
import {
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
} from '@/data/api-provider'
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
 * 1. **A ESCRITA MIGROU em 2026-08-28 (#402)** — esta nota descrevia o estado
 *    anterior e fica como registro do que se decidiu. `Gravar` era
 *    `console.info` porque `POST /api/employees` e `PUT /api/employees/{id}`
 *    respondem **403 `urn:cabinet:erro:papel-insuficiente`** para
 *    `operator-full`, o papel da semente e do usuário demo (medido em 25/08).
 *    A matriz do api reserva esta família a `admin` por razão própria e boa:
 *    vínculo é o que decide o papel dos OUTROS. **A decisão do user (28/08) foi
 *    ligar assim mesmo, admin-only, com o 403 tratado NA TELA** — um cadastro
 *    que recusa em voz alta é melhor que um que finge gravar, porque só o
 *    primeiro diz ao operador que ele precisa de outro papel. Ver
 *    `corpoDeEscrita` no fim deste arquivo.
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
    // Os dois ganharam campo na tela pela #402 — antes eram pendência declarada
    // ("Ainda não guardamos: E-mail de login"). Sem lê-los aqui, o formulário
    // abriria em branco e o `PUT` os apagaria no primeiro Gravar.
    email: dto.email ?? null,
    telefone: dto.phone ?? null,
    ativo: dto.active,
    setor: dto.sectorId ?? null,
    cargo: dto.jobTitleId ?? null,
    atendimentoCliente: dto.customerFacing ?? false,
    dataAdmissao: dto.hiredAt ?? null,
    dataDemissao: dto.dismissedAt ?? null,
  }
}

/**
 * A FICHA CRUA do servidor, por id. `null` quando não existe — 409 (sem empresa
 * ativa) e 403 continuam sendo ERRO, que é o que `itemOuNulo` separa.
 *
 * Existe separada de `obterColaborador` por causa do `PUT`: ele é integral, e o
 * corpo precisa devolver `document` e `photoUrl` como vieram. A forma da tela
 * (`Colaborador`) não os carrega, então quem edita guarda o DTO.
 */
export async function obterFichaDoColaborador(id: string): Promise<EmployeeDetailDto | null> {
  return itemOuNulo<EmployeeDetailDto>(await getEmployee(id), `o colaborador ${id}`)
}

/**
 * O mesmo registro na forma da TELA.
 *
 * Quem edita usa `obterFichaDoColaborador` e guarda o DTO: o corpo do `PUT`
 * precisa da ficha original até o fim da edição, porque `document` e `photoUrl`
 * viajam de volta sem passar por campo nenhum da tela. Esta função continua
 * existindo para o registry (`data.colaboradores.get`), que promete
 * `Colaborador`.
 */
export async function obterColaborador(id: string): Promise<Colaborador | null> {
  const dto = await obterFichaDoColaborador(id)
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

/**
 * ESCRITA — `POST /api/employees` e `PUT /api/employees/{id}` (#402).
 *
 * O `Gravar` desta tela era `console.info` desde que ela existe. As duas
 * operações estão no contrato e o backend as serve; o que faltava era a tela
 * chegar até elas.
 *
 * ## O recorte é o `EmployeeWriteRequest`, e ele é MENOR que o formulário
 *
 * Seis campos: `name`, `document`, `email`, `phone`, `photoUrl`, `active`.
 * Cargo, setor, admissão e demissão NÃO entram — são do VÍNCULO com a empresa
 * e mudam por `PUT /api/employees/{id}/link`, que é outra operação e outra
 * tela (`/config/usuarios`). Mandá-los aqui reescreveria em silêncio o cargo
 * que a pessoa tem na outra empresa do grupo, que é exatamente o que a
 * descrição do schema no contrato diz para não fazer.
 *
 * O bloco de RH inteiro (salário, vínculo, filiação, naturalidade, raça/cor)
 * continua fora: o contrato não o publica, e a pergunta de LGPD sobre dado
 * sensível de funcionário segue sem resposta. Esses campos aparecem em branco
 * na tela e não viajam — é o `AvisoDeCobertura` que diz isso ao operador.
 *
 * ## `PUT` SUBSTITUI, então o que a tela não edita volta como veio
 *
 * ## REMEDIDO em 2026-08-28 contra o api `ac00bb9`, par local próprio
 *
 * `GET /api/employees/{id}` 200 com `document`, `email`, `phone` e `photoUrl`
 * no corpo — são eles que o `PUT` precisa devolver. `POST /api/employees` e
 * `PUT /api/employees/{id}` com corpo VÁLIDO respondem **403
 * `urn:cabinet:erro:papel-insuficiente`**, `detail` = "O papel `operator-full`
 * não pode escrever neste recurso." (corpo vazio responderia 400 antes do 403,
 * e mediria a validação em vez da permissão).
 *
 * `document` e `photoUrl` não têm controle no formulário e o `PUT` é integral:
 * omiti-los apagaria o CPF e a foto de quem foi cadastrado por outro caminho
 * (`/config/usuarios` grava os dois). Por isso `corpoDeEscrita` recebe a FICHA
 * ORIGINAL — a mesma economia de `parceiros-api.ts`, e a regra que o core
 * registrou em 18/08: campo que a tela não lê nunca vira corpo de PUT sozinho.
 *
 * `email` e `phone` seguem o caminho contrário: passaram a ter campo na tela
 * (#402) justamente porque o `POST` exige o e-mail — `employees.email` é NOT
 * NULL e é por ele que a pessoa entra.
 */

/** Texto de formulário → campo do contrato. Vazio (ou só espaço) é ausência. */
function textoOuNulo(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  return texto === '' ? null : texto
}

/** Os campos do `EmployeeDetailDto` que o formulário NÃO edita e o `PUT` apagaria. */
const PRESERVADOS = ['document', 'photoUrl'] as const

/**
 * Ficha original + formulário → corpo do `PUT`.
 *
 * RECUSA em voz alta quando a ficha veio sem um dos preservados: gravar assim
 * apagaria o campo, e um `?? null` calado transformaria "o servidor não mandou"
 * em "o operador quis apagar". Mesma guarda de `parceiros-api.corpoDeEscrita`.
 */
export function corpoDeEscrita(
  original: EmployeeDetailDto,
  editado: Colaborador,
): EmployeeWriteRequest {
  for (const campo of PRESERVADOS) {
    if (!(campo in original)) {
      throw new Error(
        `A ficha veio do servidor sem \`${campo}\`, e o PUT substitui o cadastro inteiro: gravar assim apagaria o campo. Nada foi enviado.`,
      )
    }
  }

  return {
    name: editado.nome,
    email: textoOuNulo(editado.email),
    phone: textoOuNulo(editado.telefone),
    active: editado.ativo,
    // Devolvidos COMO VIERAM: nenhum controle da tela os toca.
    document: original.document ?? null,
    photoUrl: original.photoUrl ?? null,
  }
}

/**
 * Formulário → corpo do `POST`. Na inclusão não há registro anterior a
 * preservar: o que a tela não edita nasce nulo.
 */
export function corpoDeInclusao(editado: Colaborador): EmployeeWriteRequest {
  return {
    name: editado.nome,
    email: textoOuNulo(editado.email),
    phone: textoOuNulo(editado.telefone),
    active: editado.ativo,
    document: null,
    photoUrl: null,
  }
}

/**
 * Cria o colaborador e devolve a ficha COMO O SERVIDOR a gravou (`201` com o
 * `EmployeeDetailDto`) — é dela que sai o id do registro novo.
 *
 * **`403` `urn:cabinet:erro:papel-insuficiente` é o caso comum, não a exceção.**
 * A matriz do api reserva `/api/employees` a `admin`, e o papel da semente
 * (`operator-full`, o do usuário demo) recebe a recusa em toda escrita. Quem
 * chama mostra o `detail` do problem+json — o operador precisa ler POR QUE não
 * pode, e não um `Gravar` que não faz nada.
 *
 * `409` é o e-mail já usado no grupo: a credencial é única no produto inteiro,
 * sem diferença de caixa.
 */
export async function incluirColaborador(corpo: EmployeeWriteRequest): Promise<EmployeeDetailDto> {
  const resposta: RespostaDaApi = await createEmployee(corpo)
  return dadosOuErro<EmployeeDetailDto>(resposta, 'Não foi possível incluir o colaborador.')
}

/** Grava a alteração e devolve a ficha como o servidor a deixou (`200`). */
export async function atualizarColaborador(
  id: string,
  corpo: EmployeeWriteRequest,
): Promise<EmployeeDetailDto> {
  const resposta: RespostaDaApi = await updateEmployee(id, corpo)
  return dadosOuErro<EmployeeDetailDto>(resposta, 'Não foi possível gravar o colaborador.')
}
