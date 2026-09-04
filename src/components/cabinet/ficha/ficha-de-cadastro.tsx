import { BlocoIdentidade } from '@/components/cabinet/ficha/bloco-identidade'
import { FichaDeModulos } from '@/components/cabinet/ficha/ficha-de-modulos'
import { IndiceDeModulos } from '@/components/cabinet/ficha/indice-de-modulos'
import { textoDoCampo } from '@/components/cabinet/ficha/valores'
import { PageHeader } from '@/components/cabinet/page-header'
import type { EntidadeCadastro } from '@/features/cadastro/modulos'
import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * A TELA DE CONSULTA — a ficha ligada na rota de detalhe (issue #103).
 *
 * O componente `FichaDeModulos` entrou no repo pelo PR #137 e ficou ÓRFÃO: só o
 * próprio teste o montava. A ligação foi adiada de propósito — as rotas de
 * detalhe eram o único conflito da fila de merge daquele momento — e esta é a
 * PR curta que a nota prometeu, agora que a fila drenou.
 *
 * ## O que muda para o operador
 *
 * `Consul.` da barra de ações continua indo para a mesma URL (`?modo=consulta`,
 * §9 padrão 8). O que ela mostra deixa de ser **o formulário inteiro desabilitado**
 * e passa a ser a ficha: módulo com dado aberto, módulo vazio numa fileira baixa
 * com o convite para preencher.
 *
 * O motivo é o da issue: **ler é o uso mais frequente de um cadastro**, e um
 * formulário de 40 campos apagados obriga o olho a percorrer tudo para achar as
 * quatro linhas que importam. O desenho anterior já vinha remendando isso — em
 * consulta os blocos deixavam de colapsar, senão o `<fieldset disabled>` matava
 * o gatilho e o operador não conseguia abrir metade do cadastro. Remendo que a
 * ficha torna desnecessário: não há gatilho a desabilitar quando não há campo.
 *
 * ## Por que a moldura mora aqui e não em cada rota
 *
 * Cabeçalho de página, aviso da tela e a saída são os mesmos nas quatro
 * entidades: quem vem do `Alterar` reconhece a tela pela moldura e vê só o
 * miolo trocar. Quatro cópias divergiriam, que é a mesma razão de o schema de
 * módulos existir.
 *
 * ## O que NÃO faz, e a pendência declarada
 *
 * **Não traduz id de lista de apoio.** Os quatro cadastros ainda guardam o
 * rótulo legível (`setor: 'VENDAS'`), então a ficha imprime o valor como está.
 * Quando a #94 (LookupCombo por id) entrar, quem passa o mapa `rotulos` é a
 * rota — o ponto de entrada já existe na prop do `FichaDeModulos`.
 *
 * ## O lápis abre AQUELE módulo, e o índice diz onde há dado
 *
 * As duas coisas que a versão anterior desta moldura declarou como pendência.
 * O lápis manda o `moduloId` para a rota, que o repassa ao formulário como
 * `?modulo=` — o bloco correspondente nasce aberto em vez de recolhido. Sem
 * isso o convite entregava o formulário inteiro com o bloco procurado fechado,
 * que é a fricção que a ficha existe para tirar.
 *
 * O `Alterar` da tela continua existindo e vai SEM módulo: é a edição do
 * cadastro inteiro. Desde a #197 ele é a ação primária do cabeçalho, e não mais
 * a tira colada no rodapé.
 */

/**
 * Chaves de campo que respondem "quem é este registro", em ordem de preferência.
 *
 * Vêm do schema de módulos (`campo.k`), não de um mapa por entidade: o mesmo
 * `k` já significa a mesma coisa em cliente, fornecedor, profissional e
 * colaborador — é para isso que o schema é único. Um mapa por tela seria a
 * quarta cópia da mesma pergunta, e a primeira a envelhecer.
 */
const CHAVES_DO_NOME = ['nome', 'apres', 'fantasia'] as const
const CHAVES_DO_DOCUMENTO = ['doc', 'cnpj', 'cpf'] as const
const CHAVES_DA_CIDADE = ['cidade'] as const

function primeiroTexto(
  entidade: EntidadeCadastro,
  registro: unknown,
  chaves: readonly string[],
  rotulos?: Readonly<Record<string, string>>,
): string | undefined {
  for (const chave of chaves) {
    for (const modulo of entidade.modulos) {
      const campo = modulo.campos.find((c) => c.k === chave)
      if (!campo) continue
      const texto = textoDoCampo(registro, campo, rotulos)
      if (texto) return texto
    }
  }
  return undefined
}

export interface FichaDeCadastroProps {
  /** Schema de módulos da entidade — a mesma fonte que gera o formulário. */
  entidade: EntidadeCadastro
  /** O registro aberto, na forma que o schema descreve. */
  registro: unknown
  /** Nome da tela, literal da transcrição (`Cadastro de Clientes`). */
  titulo: string
  /** O que qualifica o título — aqui é sempre o registro aberto ou o modo. */
  contexto?: string
  /** Vale para a tela inteira (cobertura do contrato, vínculo pai/filho). */
  aviso?: ReactNode
  /** O que continua abaixo da ficha — o painel de atividades das três telas de parceiro. */
  abaixo?: ReactNode
  /**
   * Leva ao modo edição da MESMA rota (sem `?modo=consulta`). Com módulo, veio
   * do lápis (ou do `+ Preencher`) de uma seção e o bloco dele nasce aberto;
   * sem módulo, veio do rodapé e é o cadastro inteiro.
   */
  aoEditar: (moduloId?: string) => void
  /**
   * Valor guardado → texto legível (id de lista de apoio → nome). Vem de
   * `useRotulosDeApoio()` na rota; sem ele a ficha imprime o valor cru.
   */
  rotulos?: Readonly<Record<string, string>>
}

export function FichaDeCadastro({
  entidade,
  registro,
  titulo,
  contexto,
  aviso,
  abaixo,
  aoEditar,
  rotulos,
}: FichaDeCadastroProps) {
  const nome = primeiroTexto(entidade, registro, CHAVES_DO_NOME, rotulos)
  const documento = primeiroTexto(entidade, registro, CHAVES_DO_DOCUMENTO, rotulos)
  const cidade = primeiroTexto(entidade, registro, CHAVES_DA_CIDADE, rotulos)

  /**
   * O `contexto` do cabeçalho some quando é o NOME e o card lateral já o diz.
   *
   * As rotas passam o nome do registro como contexto — era a única forma de a
   * tela dizer "quem está aberto" quando o cabeçalho era a única peça de
   * identidade. Com o `BlocoIdentidade` no lugar, mantê-lo escreveria o mesmo
   * nome duas vezes na mesma dobra, uma delas em `--t-rotulo`, que é o degrau
   * de RÓTULO — e nome de entidade não é rótulo de nada.
   *
   * Só quando são iguais: `contexto` também carrega o MODO em outras telas
   * ("Consulta", "Incluir"), e esse não repete nada.
   */
  const contextoDoCabecalho = contexto && contexto !== nome ? contexto : undefined

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4" data-slot="ficha-de-cadastro">
      {/* Cabeçalho de página (Polaris-2, #197): `Alterar` como a única peça
          forte à direita. Era a tira colada no rodapé — e ela contava a mesma
          história duas vezes, porque o lápis de cada módulo já leva ao mesmo
          lugar. No topo, a ação da tela fica onde a ação da tela fica em toda a
          seção, em vez de depender de o operador chegar ao fim de uma ficha de
          quarenta linhas para descobrir que existe.

          A SAÍDA saiu daqui na #235: era o `Fechar` desta ficha, e ele estava
          num canto que só esta tela tinha. Agora é o `Voltar` da folha, no
          mesmo lugar em todas — inclusive nas que não tinham nenhum. */}
      <PageHeader
        titulo={titulo}
        {...(contextoDoCabecalho ? { contexto: contextoDoCabecalho } : {})}
        primaria={{ id: 'alterar', label: 'Alterar', icon: Pencil, onClick: () => aoEditar() }}
      />
      {aviso}

      <div className="flex min-w-0 items-start gap-[var(--s-4)]">
        {/* Coluna lateral: quem é o registro, e depois por onde navegar.
            A ordem importa — identidade antes de índice. O `BlocoIdentidade` é o
            que sobrou da `BandaDeIdentidade` (D16): ela dizia o nome da TELA numa
            faixa de largura inteira, ele diz de QUEM é o registro, no lugar onde
            o olho procura contexto.
            Some no estreito junto com o índice: numa coluna só, o dado de
            identidade já está no primeiro bloco da ficha, e repeti-lo acima
            empurraria a ficha inteira para baixo. */}
        <div className="sticky top-4 hidden w-52 shrink-0 flex-col gap-[var(--s-4)] lg:flex">
          {nome ? (
            <BlocoIdentidade
              nome={nome}
              {...(documento ? { documento } : {})}
              {...(cidade ? { cidade } : {})}
            />
          ) : null}
          <IndiceDeModulos entidade={entidade} registro={registro} />
        </div>

        <div className="min-w-0 flex-1">
          <FichaDeModulos
            entidade={entidade}
            registro={registro}
            {...(rotulos ? { rotulos } : {})}
            onEditarModulo={aoEditar}
            // Preencher e Alterar levam ao mesmo lugar — a diferença entre eles é o
            // estado do módulo, não o destino. Módulo vazio dá ao operador o convite
            // que o módulo cheio dá pelo lápis.
            onPreencherModulo={aoEditar}
          />
        </div>
      </div>

      {abaixo}
    </div>
  )
}
