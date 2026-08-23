import type { PartnerDto } from '@/api/gerado'
import {
  type CamposEditaveis,
  type PapelDeParceiro,
  atualizarParceiro,
  corpoDeEscrita,
  corpoDeInclusao,
  idDoParceiroExistente,
  incluirParceiro,
  obterParceiro,
  vincularParceiro,
} from '@/data/parceiros-api'
import { avisar } from '@/lib/avisos'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

/** As três listagens de parceiro — a única coisa que `navigate({ to })` aceita aqui. */
export type RotaDeParceiro =
  | '/cadastros/clientes'
  | '/cadastros/fornecedores'
  | '/cadastros/profissionais'

/**
 * O que separa Cliente, Fornecedor e Profissional Externo — mesma tabela,
 * mesmo `GET /api/partners`, campo próprio por papel. `usarParceiro` é o resto
 * (query, 3 mutations, navegação), que é idêntico nos três.
 */
export interface PapelDeCadastro<T> {
  role: PapelDeParceiro
  rota: RotaDeParceiro
  queryKeyListagem: readonly unknown[]
  /** Lista de campos que o Gravar envia na EDIÇÃO, para o aviso de cobertura. */
  camposDeEdicao: string
  /** Registro em branco do "Incluir" — local, o backend não fornece. */
  vazio: (id: number) => T
  /** Linha do `PartnerDto` → registro do formulário. */
  dtoParaForm: (dto: PartnerDto) => T
  /**
   * Campos do formulário que o servidor NÃO preencheu e que só têm valor por
   * default do registro em branco — a ficha os apaga em vez de afirmá-los.
   *
   * Existe por causa do `Tipo de pessoa` (#270): radio obrigatório nasce
   * `FISICA` porque o controle precisa de valor, e cadastro anterior ao campo
   * tem `personType: null`. Sem isto a ficha diria "FISICA" para um CNPJ de 14
   * dígitos — o defeito que `registro-para-ficha` mediu com dado real e que só
   * agora tem conserto, porque só agora o contrato publica o campo.
   *
   * Opcional: papel cujo formulário não tem campo obrigatório sem par no
   * servidor não precisa declarar nada.
   */
  ausentesNoServidor?: (dto: PartnerDto | null) => string[]
  /** Formulário + linha original → campos editáveis do `PUT`. */
  paraEscrita: (values: T, linha: PartnerDto) => CamposEditaveis
  /** Formulário → campos editáveis do `POST`. */
  paraInclusao: (values: T) => CamposEditaveis
}

/**
 * Query + 3 mutations (gravar, incluir, vincular) + navegação de uma tela de
 * detalhe de parceiro. Byte a byte idêntico entre Cliente, Fornecedor e
 * Profissional Externo antes desta extração — o que muda é só o `papel`.
 */
export function usarParceiro<T>(papel: PapelDeCadastro<T>, idParam: string) {
  const isNovo = idParam === 'novo'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // A listagem semeia a linha em `['parceiro', id]`, então quem chega por lá
  // não gasta requisição (staleTime de 30s). Link direto e recarga não têm
  // semente — aí a consulta busca por id, que o contrato passou a oferecer.
  // O observer da query também segura o registro enquanto o formulário está
  // aberto: era para isso que aqui havia um `useState`, e o corpo do PUT
  // precisa da linha inteira até o fim da edição (`code` e `paymentTerms`
  // viajam de volta sem passar por campo nenhum da tela).
  const query = useQuery({
    queryKey: ['parceiro', idParam],
    queryFn: () => obterParceiro(idParam),
    enabled: !isNovo,
  })
  const linha = query.data ?? null

  /**
   * Gravou: reconsulta a listagem, avisa e volta.
   *
   * O aviso entra AQUI porque este é o único ponto que sabe que a escrita
   * terminou — a tela que tinha o formulário está sendo desmontada na linha
   * seguinte, e a listagem que recebe o operador é idêntica à que ele viu antes
   * de editar. Sem isto, o `Gravar` respondia com uma troca de tela e mais
   * nada. Ver `lib/avisos.ts` (#201).
   */
  async function aposGravar(_dado: unknown, _variaveis: unknown, mensagem = 'Cadastro gravado.') {
    avisar(mensagem)
    await queryClient.invalidateQueries({ queryKey: papel.queryKeyListagem })
    void navigate({ to: papel.rota })
  }

  const gravar = useMutation({
    mutationFn: (values: T) => {
      if (!linha) throw new Error('Sem a linha da listagem não há o que gravar.')
      return atualizarParceiro(linha.id, corpoDeEscrita(linha, papel.paraEscrita(values, linha)))
    },
    onSuccess: (dado, variaveis) => aposGravar(dado, variaveis, 'Alterações gravadas.'),
  })

  const incluir = useMutation({
    mutationFn: (values: T) =>
      incluirParceiro(corpoDeInclusao(papel.role, papel.paraInclusao(values))),
    onSuccess: (dado, variaveis) => aposGravar(dado, variaveis, 'Cadastro incluído.'),
  })

  // O 409 de documento repetido não é beco: o cadastro existe no GRUPO e só falta
  // esta empresa se ligar a ele. Criar outro geraria duplicata do mesmo CNPJ.
  const jaExiste = idDoParceiroExistente(incluir.error)

  const vincular = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => vincularParceiro(id, ativo),
    // O caso do 409: o cadastro já existia no grupo e esta empresa se ligou a
    // ele. Dizer "incluído" seria mentira sobre o que aconteceu.
    onSuccess: (dado, variaveis) =>
      aposGravar(dado, variaveis, 'Empresa vinculada ao cadastro existente.'),
  })

  const registro = isNovo ? papel.vazio(0) : linha ? papel.dtoParaForm(linha) : null

  // O que a FICHA não pode afirmar (#270). Sai daqui, e não das três rotas,
  // porque depende da linha — e a linha mora nesta query. Em `Incluir` a lista
  // é vazia por construção: não há ficha, e não há registro do servidor a que
  // comparar o default.
  const ausentesNaFicha = isNovo ? [] : (papel.ausentesNoServidor?.(linha) ?? [])

  return { query, isNovo, registro, ausentesNaFicha, gravar, incluir, vincular, jaExiste }
}
