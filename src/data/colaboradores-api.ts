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
