import type { ModuloCor } from '@/components/cabinet/modulo-cores'

/**
 * SCHEMA DE MÓDULOS — a fonte única de formulário, ficha e grade (issue #100).
 *
 * Hoje cada tela decide sozinha como agrupa, e o resultado é desigual e
 * mensurável: Fornecedor tem 13 `FormBlock` (6 nomeados), Cliente 11 (4),
 * Profissional 3 (1) e Colaborador 3 (1). Sem fonte única isso diverge de novo
 * em três meses. **Módulo é a unidade de tudo**: o mesmo objeto diz quais campos
 * o formulário mostra, quais o filtro oferece, quais viram coluna da grade e
 * como a ficha de leitura se reparte.
 *
 * Fonte: `mockup-consulta-modelo.html` e `mockup-cadastros-modelo.html`,
 * aprovados pelo user em 2026-08-14. O primeiro já traz o schema nesta forma —
 * `{k, r, col, fil, grana}` são os nomes DELE, mantidos de propósito.
 *
 * ## As duas propriedades que acrescentei ao desenho do user, e por quê
 *
 * **`campo`** — o caminho no schema Zod da entidade (`endereco.cidadeNome`).
 * **`dto`** — o nome do campo NO CONTRATO (`legalName`).
 *
 * Não são enfeite de tipagem: **o formulário fala português e a listagem fala
 * inglês**, e são vocabulários diferentes para a mesma entidade. O formulário do
 * Cliente valida `nome`, `cpf`, `endereco.cep`; a listagem ordena por
 * `legalName`, `code`, `document`, porque `accessorKey` viaja como `sortBy` e a
 * whitelist do servidor é em inglês — traduzir dá 400 ao clicar no cabeçalho
 * (CLAUDE.md §padrões). Um `k` só não consegue ser os dois.
 *
 * **A ausência delas é informação, não esquecimento.** O mockup desenha o
 * cadastro que a Vertz QUER; o repo guarda o que a transcrição e o contrato
 * cobrem hoje. Campo sem `campo` é campo que nenhum formulário grava; campo sem
 * `dto` é campo que o servidor não publica. Em vez de apagar o que o user
 * desenhou (a espec encolheria em silêncio) ou de fingir que existe (dado de
 * mentira com cara de dado do servidor), a lacuna fica DECLARADA e contável —
 * mesma economia do `AvisoDeCobertura`. `colunasDe` e `filtrosDe` derivam só o
 * que tem lastro, e o teste de invariante prova que a listagem gerada nunca
 * pede ao servidor um campo fora da whitelist.
 */

/** Controle do campo. Nomes do mockup — `busca` é o LookupCombo, `seg` o par
 *  exclusivo (Física/Jurídica), `area` o textarea. */
export type TipoDeCampo =
  | 'texto'
  | 'data'
  | 'select'
  | 'busca'
  | 'dinheiro'
  | 'area'
  | 'seg'
  | 'check'

/** Variantes que o filtro estruturado da DataTable já implementa. */
export type VarianteDeFiltro = 'texto' | 'sel' | 'data' | 'faixa' | 'bool'

export interface CampoCadastro {
  /** Identidade do campo DENTRO do módulo. É a chave do mockup, e é estável
   *  mesmo quando o repo ainda não tem onde guardar o valor. */
  k: string
  /** Rótulo como o operador lê. */
  r: string
  /** Controle. Padrão `texto` — a maioria é. */
  t?: TipoDeCampo
  /** Obrigatório. **Só pode viver em módulo `obrigatorio`** — campo que trava o
   *  Gravar dentro de bloco recolhível esconde o que impede de gravar. */
  req?: true
  /** Quer ser coluna fixa da grade. Só vira coluna de verdade com `dto`. */
  col?: true
  /** Quer ser filtro, na variante indicada. Só vira filtro de verdade com `dto`. */
  fil?: VarianteDeFiltro
  /** Largura no formulário. Vazio = a linha inteira. */
  w?: 'curto' | 'medio'
  /** Dinheiro: centavos no dado, `R$` só na borda de exibição (CLAUDE.md). */
  grana?: true
  /** Opções de `select`/`seg`. */
  op?: readonly string[]
  /** Caminho no schema Zod da entidade. Ausente = o repo ainda não guarda. */
  campo?: string
  /** Nome no contrato. Ausente = o servidor ainda não publica. */
  dto?: string
}

export interface ModuloCadastro {
  /** Único dentro da entidade — é ele que nomeia o bloco, a aba e a seção da ficha. */
  id: string
  titulo: string
  /** Uma linha do que mora aqui. Vira o resumo do bloco fechado e o subtítulo da ficha. */
  resumo: string
  /**
   * Cor do módulo. **Opcional de propósito**: o repo nomeia nove cores, uma por
   * MÓDULO do ERP, e nem todo bloco de cadastro corresponde a um deles.
   * `Dados bancários` e `Metas e comissão` aparecem no mockup em verde de
   * dinheiro e amarelo de foco, que são cores com DONO — e "cor de bloco nunca
   * invade faixa com dono" é regra do user (2026-08-14). Bloco sem cor cai no
   * neutro do `FormBlock`, que é desenho legítimo, não falta de acabamento.
   */
  cor?: ModuloCor
  /** O módulo que trava o Gravar: nunca colapsa, e é o único que aceita `req`. */
  obrigatorio?: true
  campos: readonly CampoCadastro[]
}

export interface EntidadeCadastro {
  id: string
  nome: string
  plural: string
  /** Cor da entidade. Ausente onde o user não atribuiu — ver `colaborador`. */
  cor?: ModuloCor
  /**
   * De onde a listagem vem, e isso MUDA a regra da coluna.
   *
   * `http` — quem ordena e filtra é o servidor, e ele só aceita os nomes da
   * whitelist publicada no contrato. Coluna sem `dto` daria 400 ao primeiro
   * clique no cabeçalho.
   * `mock` — quem aplica é o provider, em memória, sobre o objeto do schema.
   * Ali o que vale é o `campo`, e não há whitelist a respeitar.
   */
  fonte: 'http' | 'mock'
  /** A whitelist que o contrato publica, quando `fonte` é `http`. É contra ela
   *  que o teste de invariante confere cada `dto` — campo fora dela é 400. */
  whitelist?: readonly string[]
  modulos: readonly ModuloCadastro[]
  /**
   * A faixa de indicadores do topo da ficha (`kpis` do mockup): "Comprado no
   * ano", "Pedidos", "Obras vinculadas".
   *
   * **Não são campos, e por isso não moram em módulo:** nenhum deles se guarda
   * no registro — todos saem de consulta AGREGADA sobre outra tabela (pedidos
   * do cliente, produtos do fornecedor). Um `campo` deles seria mentira, e
   * dentro de um módulo eles entrariam em `camposDe`, virando candidato a
   * coluna e a filtro de algo que o servidor não sabe ordenar.
   *
   * Ficam DECLARADOS mesmo sem origem pela mesma razão que campo sem `campo`
   * fica: a lacuna precisa ser contável. Antes disto a faixa existia como uma
   * prop `kpis` que tela nenhuma passava — desenho aprovado que nenhum grep
   * encontrava, e que ninguém ia cobrar.
   *
   * `campo`/`dto` seguem valendo com o mesmo sentido: quando o contrato
   * publicar o agregado, o indicador ganha `dto` e a faixa passa a desenhar
   * número — com consumidor, no mesmo PR.
   */
  indicadores?: readonly CampoCadastro[]
}

/** Todos os campos da entidade, na ordem em que os módulos os declaram. */
export function camposDe(entidade: EntidadeCadastro): readonly CampoCadastro[] {
  return entidade.modulos.flatMap((modulo) => modulo.campos)
}

/** Um campo só tem lastro para ordenar/filtrar se a FONTE da entidade souber
 *  resolvê-lo: o servidor pelo `dto`, o provider mock pelo `campo`. */
function temLastroDeConsulta(entidade: EntidadeCadastro, campo: CampoCadastro): boolean {
  return entidade.fonte === 'http' ? campo.dto !== undefined : campo.campo !== undefined
}

/**
 * As colunas que a grade PODE montar hoje. Campo sem lastro fica de fora — a
 * coluna existiria, o operador clicaria no cabeçalho para ordenar e o servidor
 * responderia 400. É a mesma recusa em voz alta que o filtro já pratica.
 */
export function colunasDe(entidade: EntidadeCadastro): readonly CampoCadastro[] {
  return camposDe(entidade).filter((campo) => campo.col && temLastroDeConsulta(entidade, campo))
}

/** Os filtros que a listagem PODE oferecer hoje. Mesma regra da coluna. */
export function filtrosDe(entidade: EntidadeCadastro): readonly CampoCadastro[] {
  return camposDe(entidade).filter((campo) => campo.fil && temLastroDeConsulta(entidade, campo))
}

/** O que o user desenhou e o repo ainda não guarda. Existe para ser CONTADO —
 *  é a medida da distância entre o cadastro pedido e o cadastro implementado. */
export function semLastro(entidade: EntidadeCadastro): readonly CampoCadastro[] {
  return camposDe(entidade).filter((campo) => !campo.campo && !campo.dto)
}

/**
 * Indicadores que a ficha ainda NÃO tem como calcular — hoje, todos.
 *
 * Separado de `semLastro` porque a falta é de outra natureza: campo sem lastro
 * é dado do registro que ninguém guarda; indicador sem lastro é AGREGAÇÃO que
 * o contrato não publica. O primeiro se resolve com uma coluna no banco, o
 * segundo com um caminho novo.
 */
export function indicadoresSemOrigem(entidade: EntidadeCadastro): readonly CampoCadastro[] {
  return (entidade.indicadores ?? []).filter((ind) => !ind.campo && !ind.dto)
}
