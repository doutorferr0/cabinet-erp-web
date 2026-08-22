import type {
  PagedResultOfPartnerContactDto,
  PartnerContactDto,
  PartnerContactWriteRequest,
} from '@/api/gerado'
import { createPartnerContact, listPartnerContacts, updatePartnerContact } from '@/api/gerado'
import { ErroDaApi, PAGE_SIZE_MAX, dadosOuErro } from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DOS CONTATOS DO PARCEIRO — `/api/partners/{partnerId}/contacts`.
 *
 * ## Por que não é campo do `PartnerDto`
 *
 * O contrato diz por escrito, na descrição da operação: *"Sub-recurso e não
 * `contacts[]` no `PartnerDto` — a mesma forma das variantes do produto."* A
 * consequência prática decide o desenho da tela: contato tem **caminho e ciclo
 * próprios**, então NÃO entra no corpo do `PUT` do parceiro e não pode ser
 * gravado pelo `Gravar` do cadastro. Uma grade ligada ao registro do formulário
 * daria a impressão contrária — o operador editaria a linha, gravaria o
 * cadastro, e o contato ficaria onde estava.
 *
 * É o mesmo arranjo que `PainelDeAtividades` já usa: registro próprio,
 * gravação própria, montado fora do `<form>` do cadastro.
 *
 * ## Não existe DELETE, e isso é a regra 8 do CLAUDE.md
 *
 * O contrato publica `GET`, `POST` e `PUT` — nada mais. Tirar um contato da
 * grade é gravá-lo com `active: false` (desativação lógica), como todo cadastro
 * deste produto. Some da lista do operador e continua existindo para quem
 * consultar o histórico.
 *
 * ## A listagem pede o conjunto INTEIRO
 *
 * Contato é lista curta e a tela mostra todos de uma vez — não há paginação no
 * bloco. `pageSize` vai no teto do contrato (`PAGE_SIZE_MAX`) e o total volta
 * junto, para o dia em que um cadastro passar de 100 contatos: aí o rodapé
 * precisa DIZER que cortou, em vez de mostrar 100 como se fossem todos. É a
 * mesma regra que o padrão 9 (view modes) aplica às visões não-tabela.
 */

/** Uma linha da grade, do jeito que a tela a edita. `id` nulo = ainda não existe. */
export interface ContatoDaGrade {
  id: string | null
  nome: string
  vinculo: string
  fone: string
  celular: string
  fax: string
  email: string
}

/** Linha em branco do `Incluir` da grade. */
export function contatoVazio(): ContatoDaGrade {
  return { id: null, nome: '', vinculo: '', fone: '', celular: '', fax: '', email: '' }
}

/** Texto de formulário → campo do contrato. Vazio (ou só espaço) é ausência. */
function textoOuNulo(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  return texto === '' ? null : texto
}

/** `PartnerContactDto` → linha da grade. */
export function contatoDoContrato(dto: PartnerContactDto): ContatoDaGrade {
  return {
    id: dto.id,
    nome: dto.name,
    vinculo: dto.role ?? '',
    fone: dto.phone ?? '',
    celular: dto.mobilePhone ?? '',
    fax: dto.fax ?? '',
    email: dto.email ?? '',
  }
}

/**
 * Linha da grade → corpo de escrita.
 *
 * `active` é parâmetro e não campo da linha: a grade não desenha caixinha de
 * ativo por contato — quem some da grade some porque o operador clicou em
 * `Excluir linha`, e é a sincronização que traduz isso em `active: false`.
 */
export function contatoParaContrato(
  linha: ContatoDaGrade,
  active: boolean,
): PartnerContactWriteRequest {
  return {
    name: linha.nome.trim(),
    role: textoOuNulo(linha.vinculo),
    phone: textoOuNulo(linha.fone),
    mobilePhone: textoOuNulo(linha.celular),
    fax: textoOuNulo(linha.fax),
    email: textoOuNulo(linha.email),
    active,
  }
}

/**
 * Os contatos ATIVOS do parceiro, na ordem que o servidor devolveu.
 *
 * **O filtro é daqui, e é medido:** contra o par local (2026-08-22, api
 * `3089106`), `GET .../contacts` devolveu as três linhas do cadastro semeado —
 * inclusive `MARCOS TERCEIRO` com `active: false`. O contrato não publica
 * parâmetro de situação nesta operação (só `q`, `sortBy`, `sortDesc`, `page`,
 * `pageSize`), então quem separa é a fronteira. Sem isto o contato REMOVIDO
 * voltava para a grade, e o `Gravar` seguinte o gravaria de volta com
 * `active: true` — a desativação lógica desfeita por quem só quis salvar um
 * telefone.
 */
export async function listarContatos(partnerId: string): Promise<ContatoDaGrade[]> {
  const resposta = await listPartnerContacts(partnerId, { pageSize: PAGE_SIZE_MAX })
  const pagina = dadosOuErro<PagedResultOfPartnerContactDto>(
    resposta,
    'Falha ao consultar os contatos do cadastro.',
  )
  return pagina.rows.filter((dto) => dto.active !== false).map(contatoDoContrato)
}

/**
 * O QUE MUDOU entre a lista que o servidor tem e a que o operador deixou na
 * tela — em três montes, e nenhum deles é "apagar".
 *
 * Sai como função pura, separada de quem chama a rede, porque é aqui que mora a
 * decisão errável: linha nova é `POST`, linha conhecida é `PUT`, e linha que
 * SUMIU da grade é `PUT` com `active: false`. Trocar os dois últimos gravaria o
 * contato removido por cima de outro, e o teste de rede não veria diferença —
 * as duas chamadas são `PUT` no mesmo caminho.
 */
export function planoDeSincronizacao(
  original: readonly ContatoDaGrade[],
  atual: readonly ContatoDaGrade[],
): {
  incluir: ContatoDaGrade[]
  alterar: ContatoDaGrade[]
  desativar: ContatoDaGrade[]
} {
  const naTela = new Set(atual.map((linha) => linha.id).filter((id): id is string => id !== null))

  return {
    // Linha sem nome não vira contato: a grade nasce com uma linha em branco e
    // gravar isso criaria um contato anônimo a cada `Gravar`.
    incluir: atual.filter((linha) => linha.id === null && linha.nome.trim() !== ''),
    alterar: atual.filter((linha) => linha.id !== null),
    desativar: original.filter((linha) => linha.id !== null && !naTela.has(linha.id)),
  }
}

/**
 * Aplica o plano. Sequencial de propósito: o `detail` do problem+json diz QUAL
 * contato o servidor recusou, e em paralelo a primeira falha abortaria as
 * outras deixando a lista pela metade sem ninguém saber onde parou.
 */
export async function sincronizarContatos(
  partnerId: string,
  original: readonly ContatoDaGrade[],
  atual: readonly ContatoDaGrade[],
): Promise<void> {
  const plano = planoDeSincronizacao(original, atual)

  for (const linha of plano.incluir) {
    const resposta = await createPartnerContact(partnerId, contatoParaContrato(linha, true))
    dadosOuErro<PartnerContactDto>(resposta, `Falha ao incluir o contato ${linha.nome}.`)
  }

  for (const linha of plano.alterar) {
    const resposta = await updatePartnerContact(
      partnerId,
      linha.id as string,
      contatoParaContrato(linha, true),
    )
    dadosOuErro<PartnerContactDto>(resposta, `Falha ao gravar o contato ${linha.nome}.`)
  }

  for (const linha of plano.desativar) {
    const resposta = await updatePartnerContact(
      partnerId,
      linha.id as string,
      contatoParaContrato(linha, false),
    )
    dadosOuErro<PartnerContactDto>(resposta, `Falha ao remover o contato ${linha.nome}.`)
  }
}

/** A chave da query — exportada porque a tela invalida a mesma lista. */
export function chaveDosContatos(partnerId: string): readonly unknown[] {
  return ['parceiro', partnerId, 'contatos']
}

/** Leitura dos contatos de um parceiro. Desligada enquanto não há id (Incluir). */
export function useContatos(partnerId: string | null) {
  return useQuery({
    queryKey: chaveDosContatos(partnerId ?? ''),
    queryFn: () => listarContatos(partnerId as string),
    enabled: partnerId !== null,
  })
}

/** Gravação da grade inteira, contra a lista que o servidor tinha. */
export function useGravarContatos(partnerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      original,
      atual,
    }: { original: readonly ContatoDaGrade[]; atual: readonly ContatoDaGrade[] }) =>
      sincronizarContatos(partnerId, original, atual),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaveDosContatos(partnerId) }),
  })
}

/** O `detail` que o servidor mandou, quando mandou — a frase acionável. */
export function motivoDaRecusa(erro: unknown): string | null {
  return erro instanceof ErroDaApi ? (erro.detail ?? erro.message) : null
}
