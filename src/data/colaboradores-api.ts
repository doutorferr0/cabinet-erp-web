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
 * ## O buraco entre contrato e formulário FECHOU — pelos dois lados (#403)
 *
 * Até 2026-08-28 o `EmployeeDetailDto` trazia 17 campos contra os ~30 da §2 da
 * transcrição, e os ~13 restantes nasciam em BRANCO. O corte que fechou a
 * diferença foi de MEIO-TERMO (decisão do user), e as duas metades importam:
 *
 * 1. **O contrato subiu.** Nascimento, estado civil, cônjuge, filiação,
 *    naturalidade, nacionalidade, ano de chegada, instrução e profissão são do
 *    nível ORGANIZAÇÃO e entraram em `EmployeeDetailDto` + `EmployeeWriteRequest`.
 *    Vínculo e salário são do nível EMPRESA ATIVA — foram para o detalhe (leitura)
 *    e para `EmployeeLinkRequest` (escrita), ao lado de cargo, setor e `hiredAt`.
 *    **Salário na ficha da pessoa gravaria numa empresa e reescreveria em
 *    silêncio o da outra**, que é o mesmo defeito que já mantinha cargo e setor
 *    fora do `EmployeeWriteRequest`.
 * 2. **A tela desceu.** `sexo` e `racaCor` SAÍRAM — do formulário, do schema, do
 *    módulo de cadastro e do tipo. São dado sensível (LGPD art. 5º II) sem
 *    finalidade nem regra de acesso no produto, e a decisão foi não os coletar
 *    em vez de os deixar nascendo em branco.
 *
 * **`salaryCents` é `admin`-only na LEITURA também**, e o contrato manda o
 * servidor OMITIR o campo — não devolvê-lo em `null` — para quem não pode vê-lo.
 * `daFichaDoServidor` ainda não distingue as duas coisas: `Colaborador.salario`
 * é `number | null` e não tem como dizer "existe e você não pode ver". É dívida
 * declarada, não esquecimento — quem for ligar a leitura admin-only (api#250)
 * precisa de um terceiro estado aqui e de um rótulo próprio na tela; até lá o
 * campo aparece vazio, que é o mesmo que "sem salário registrado".
 *
 * O que continua em branco: metas e comissão (módulo inteiro do mockup, sem
 * lastro em schema nenhum) e o perfil por empresa, que é o escopo da #105.
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
 * **Todo campo de lista de apoio recebe o ID, não o nome.** O formulário e a
 * ficha os tratam como lista de apoio (`useRotulosDeApoio` traduz id → rótulo na
 * leitura), e o DTO traz sempre o par — `sectorId`/`sector`, `jobTitleId`/`jobTitle`,
 * e desde a #403 também `maritalStatusId`, `nationalityId`, `educationLevelId`,
 * `occupationId` e `employmentTypeId`, cada um com seu nome resolvido ao lado.
 * Gravar o NOME onde a tela espera id faria o combo abrir sem seleção e a ficha
 * imprimir o rótulo cru — parece certo na tela e erra na hora de gravar.
 *
 * **Os campos de texto caem em `''` e não em `null`, e a diferença é do tipo.**
 * `nomeConjuge`, `nomePai`, `nomeMae`, `anoChegada` e `naturalidade.cidadeNome`
 * são `string` em `Colaborador` (são `<input>` controlado, e `null` num deles é
 * o aviso de campo não-controlado do React); os que são `string | null` seguem
 * `null`. O DTO manda `null` nos dois casos — quem converte é aqui.
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
    // Bloco pessoal — nível ORGANIZAÇÃO.
    dtNascimento: dto.birthDate ?? null,
    estadoCivil: dto.maritalStatusId ?? null,
    nomeConjuge: dto.spouseName ?? '',
    dtNascConjuge: dto.spouseBirthDate ?? null,
    nomePai: dto.fatherName ?? '',
    nomeMae: dto.motherName ?? '',
    naturalidade: {
      cidadeCodigo: dto.birthCityCode ?? null,
      cidadeNome: dto.birthCity ?? '',
      uf: dto.birthState ?? null,
    },
    // `colaboradorVazio()` semeia BRASILEIRA, e para um registro que veio do
    // servidor isso seria chute: quem não tem nacionalidade gravada tem `null`,
    // não a nacionalidade mais provável.
    nacionalidade: dto.nationalityId ?? null,
    anoChegada: dto.arrivalYear ?? '',
    grauInstrucao: dto.educationLevelId ?? null,
    profissao: dto.occupationId ?? null,
    // Bloco trabalhista — nível EMPRESA ATIVA.
    vinculo: dto.employmentTypeId ?? null,
    // Vazio aqui é ambíguo por enquanto: `admin` sem salário gravado e papel sem
    // permissão de ver chegam os dois como ausência. Ver o cabeçalho do arquivo.
    salario: dto.salaryCents ?? null,
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
