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
 * ## Sub-recurso, e isso decide o desenho da tela
 *
 * O contrato escreve a razão na descrição de `PartnerContactDto`: o
 * `PUT /api/partners/{id}` é INTEGRAL, e uma coleção dentro dele obrigaria toda
 * tela a devolver as N linhas que não mostra. A consequência prática é que
 * contato **não entra no corpo do `PUT` do parceiro** — tem caminho e ciclo
 * próprios, como as variantes do produto.
 *
 * ## Não existe DELETE, e é a regra 8 do CLAUDE.md
 *
 * O contrato publica `GET`, `POST` e `PUT`. Tirar um contato da grade é gravá-lo
 * com `active: false`: some da lista do operador e continua legível no documento
 * antigo que o citou.
 *
 * ## A leitura descarta o inativo, e isso NÃO é enfeite
 *
 * `ListPartnerContacts` não publica filtro por `active` — devolve ativos e
 * inativos juntos (é o que o mock faz, e o teste do bloco 2 o fixa). Levar o
 * inativo para a grade teria efeito destrutivo na direção contrária: a
 * sincronização grava as linhas visíveis com `active: true`, então o contato que
 * alguém removeu na semana passada voltaria vivo no primeiro `Gravar` de quem
 * abriu o cadastro para corrigir um telefone. Filtrar aqui, e não na tela, é o
 * que garante que o `original` do plano tenha a mesma régua da grade.
 *
 * ## A listagem pede o conjunto INTEIRO
 *
 * Contato é lista curta e o bloco mostra todos de uma vez, sem paginação:
 * `pageSize` vai no teto do contrato. O `total` volta junto porque o dia em que
 * um cadastro passar de 100 contatos a tela precisa DIZER que cortou — grade
 * montada com uma página é grade falsa (é a mesma régua do padrão 9).
 */

/** Uma linha da grade, como a tela a edita. `id` nulo = ainda não existe no servidor. */
export interface ContatoDaGrade {
  id: string | null
  nome: string
  vinculo: string
  fone: string
  celular: string
  fax: string
  email: string
}

/** O que a leitura entrega: as linhas ATIVAS e o que o servidor disse do total. */
export interface ContatosDoCadastro {
  linhas: ContatoDaGrade[]
  /** Total do servidor, ativos e inativos — é o número que denuncia o corte. */
  total: number
  /** O teto da página cortou a lista: o que está na grade não é tudo. */
  cortou: boolean
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
 * `active` é parâmetro e não campo da linha: a grade não desenha caixinha por
 * contato — quem sai da grade sai pelo `Excluir linha`, e é a sincronização que
 * traduz isso em `active: false`.
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

/** Os contatos ativos do parceiro, na ordem em que o servidor os devolveu. */
export async function listarContatos(partnerId: string): Promise<ContatosDoCadastro> {
  const resposta = await listPartnerContacts(partnerId, { pageSize: PAGE_SIZE_MAX })
  const pagina = dadosOuErro<PagedResultOfPartnerContactDto>(
    resposta,
    'Falha ao consultar os contatos do cadastro.',
  )
  return {
    linhas: pagina.rows.filter((dto) => dto.active).map(contatoDoContrato),
    total: pagina.total,
    cortou: pagina.total > PAGE_SIZE_MAX,
  }
}

/** Os campos que o operador edita — `id` fica de fora, ele não é conteúdo. */
const CAMPOS_DA_LINHA = ['nome', 'vinculo', 'fone', 'celular', 'fax', 'email'] as const

/** Duas linhas com o mesmo id dizem a mesma coisa? */
function mesmoConteudo(a: ContatoDaGrade, b: ContatoDaGrade): boolean {
  return CAMPOS_DA_LINHA.every((campo) => a[campo].trim() === b[campo].trim())
}

/**
 * O QUE MUDOU entre a lista que o servidor tem e a que o operador deixou na
 * tela — em três montes, e nenhum deles é "apagar".
 *
 * Função pura, separada de quem chama a rede, porque é aqui que mora a decisão
 * errável: linha nova é `POST`, linha conhecida e MEXIDA é `PUT`, e linha que
 * sumiu da grade é `PUT` com `active: false`. Trocar os dois últimos gravaria o
 * contato removido por cima de outro, e o teste de rede não veria diferença —
 * as duas chamadas são `PUT` no mesmo caminho.
 *
 * **Linha intocada não entra em `alterar`**, e isso não é economia de rede: cada
 * `PUT` é uma escrita datada no cadastro alheio. Abrir a ficha do fornecedor
 * para conferir um telefone e sair dela reescrevendo os oito contatos põe o nome
 * de quem só olhou em cima do trabalho de quem editou.
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
  const antes = new Map(
    original.filter((linha) => linha.id !== null).map((linha) => [linha.id as string, linha]),
  )

  return {
    // Linha sem nome não vira contato: a grade nasce com uma linha em branco e
    // gravá-la criaria um contato anônimo a cada `Gravar`. O contrato também a
    // recusaria — `name` vazio é 400 —, e o erro seria sobre algo que o operador
    // não digitou.
    incluir: atual.filter((linha) => linha.id === null && linha.nome.trim() !== ''),
    alterar: atual.filter((linha) => {
      if (linha.id === null) return false
      const anterior = antes.get(linha.id)
      return anterior === undefined || !mesmoConteudo(anterior, linha)
    }),
    desativar: original.filter((linha) => linha.id !== null && !naTela.has(linha.id)),
  }
}

/**
 * Aplica o plano. Sequencial de propósito: o `detail` do problem+json diz QUAL
 * contato o servidor recusou, e em paralelo a primeira falha abortaria as outras
 * deixando a lista pela metade sem ninguém saber onde parou.
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
