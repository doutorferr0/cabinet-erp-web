import { CartaoLateral, type ParDoCartao } from '@/components/cabinet/cartao-lateral'
import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import { CabecalhoDoRegistro, LayoutDoRegistro } from '@/components/cabinet/documento'
import { BlocoIdentidade } from '@/components/cabinet/ficha/bloco-identidade'
import { FichaDeModulos } from '@/components/cabinet/ficha/ficha-de-modulos'
import { IndiceDeModulos } from '@/components/cabinet/ficha/indice-de-modulos'
import { textoDoCampo } from '@/components/cabinet/ficha/valores'
import type { EntidadeCadastro } from '@/features/cadastro/modulos/tipos'
import { Pencil } from 'lucide-react'
import { type ReactNode, useState } from 'react'

/**
 * A FICHA DE CADASTRO no esqueleto 2.0 (D19, #487).
 *
 * ## O que mudou em relação à `FichaDeCadastro` 1.x
 *
 * A ficha antiga abria com um `PageHeader` — nome da TELA ("Cadastro de
 * Clientes") e um `Alterar` forte à direita — e pendurava identidade e índice
 * numa calha estreita à esquerda. Ela respondia "que tela é esta?", e essa não
 * é a pergunta de quem abriu um cadastro: quem abriu já sabe onde está e quer
 * saber **de quem é o registro, em que pé ele está e o que fazer com ele**.
 *
 * Três consequências, e cada uma é a mesma decisão do documento (#483):
 *
 * 1. **O cabeçalho é do REGISTRO, não da tela.** Título é a entidade no
 *    singular (`Cliente`), o id vem em mono ao lado, e a situação vira badge.
 * 2. **A ação forte deixou de ser `Alterar`.** `Alterar` é o gesto de sempre,
 *    disponível em todo cadastro em todo estado — não é o *próximo passo*.
 *    O próximo passo de um cadastro é o que muda o estado dele: `Ativar` o que
 *    está inativo, `Desativar` o que está ativo. `Alterar` desce para
 *    secundária, onde continua a um clique.
 * 3. **A calha virou LATERAL.** Identidade e resumo passam para a coluna de
 *    consulta de 320px, do lado direito, que é onde o resto da 2.0 põe o que
 *    orbita o registro. O índice de módulos vai junto: ele é navegação da
 *    ficha, e navegação não disputa a coluna do conteúdo.
 *
 * ## Por que o `resumo` é prop e não consulta daqui
 *
 * "Em aberto, últimos registros" só é verdade onde o contrato deixa perguntar.
 * `/api/purchase-orders` e `/api/purchase-requests` filtram por `supplierId`;
 * `/api/quotes` e `/api/orders` **não têm filtro por parceiro** (só `q`,
 * `filters` e ordenação). Consultar daqui obrigaria este componente a saber de
 * qual papel é o registro para escolher a pergunta — e, no papel sem caminho,
 * a inventar uma. Quem sabe o papel é a rota; ela passa os pares que consegue
 * provar, e o cartão não aparece quando não há nenhum.
 */
export interface FichaDeRegistroProps {
  /** Schema de módulos da entidade — a mesma fonte que gera o formulário. */
  entidade: EntidadeCadastro
  /** O registro aberto, na forma que o schema descreve. */
  registro: unknown
  /** A entidade no singular, como o cabeçalho do registro a diz: `Cliente`. */
  titulo: string
  /** O nome de quem está aberto — vai no cartão Identidade e no diálogo. */
  nome: string
  /** O código do cadastro, em mono ao lado do título. */
  id?: string | number | undefined
  /** Procedência do registro, à direita do badge. */
  meta?: ReactNode
  /** Situação do cadastro — é ela que escolhe entre `Ativar` e `Desativar`. */
  ativo: boolean
  /**
   * Inverte o `Ativo` do cadastro. Sem isto o cabeçalho fica sem próxima ação,
   * que é a resposta certa para o registro que a tela não sabe alternar —
   * botão forte que não faz nada ensina que aquele lugar não vale a leitura.
   */
  aoAlternarAtivo?: (() => void) | undefined
  alternando?: boolean
  erroAoAlternar?: string | null
  /** Pares do cartão `Resumo`. Vazio = o cartão não monta. */
  resumo?: readonly ParDoCartao[]
  /** Vale para a tela inteira (cobertura do contrato, vínculo pai/filho). */
  aviso?: ReactNode
  /** O que continua abaixo da ficha — contatos, painel de atividades. */
  abaixo?: ReactNode
  /** Leva ao modo edição da MESMA rota; com módulo, o bloco nasce aberto. */
  aoEditar: (moduloId?: string) => void
  /** Valor guardado → texto legível (id de lista de apoio → nome). */
  rotulos?: Readonly<Record<string, string>>
}

export function FichaDeRegistro({
  entidade,
  registro,
  titulo,
  nome,
  id,
  meta,
  ativo,
  aoAlternarAtivo,
  alternando = false,
  erroAoAlternar = null,
  resumo = [],
  aviso,
  abaixo,
  aoEditar,
  rotulos,
}: FichaDeRegistroProps) {
  const [confirmando, setConfirmando] = useState(false)
  const documento = primeiroTexto(entidade, registro, CHAVES_DO_DOCUMENTO, rotulos)
  const cidade = primeiroTexto(entidade, registro, CHAVES_DA_CIDADE, rotulos)

  return (
    // Fronteiras entre regiões da página = espaço `--s-5` (24), sem linha
    // (§Hierarquia, separação nº 1).
    <div className="flex min-w-0 flex-col gap-6" data-slot="ficha-de-cadastro">
      <CabecalhoDoRegistro
        titulo={titulo}
        {...(id !== undefined && id !== '' ? { id } : {})}
        // `open`/`done` e não uma cor inventada: o vocabulário de situação é o
        // do `Stamp`, e cadastro ativo é registro EM USO, não concluído.
        badge={ativo ? { tom: 'open', label: 'Ativo' } : { tom: 'void', label: 'Inativo' }}
        {...(meta ? { meta } : {})}
        secundarias={[{ id: 'alterar', label: 'Alterar', icon: Pencil, onClick: () => aoEditar() }]}
        {...(aoAlternarAtivo
          ? {
              proximaAcao: {
                id: 'alternar-ativo',
                label: ativo ? 'Desativar' : 'Ativar',
                disabled: alternando,
                // Desativar passa pelo diálogo (`confirmar-desativacao`): é
                // perda de alcance, e o operador precisa ler o que some.
                // Ativar não pergunta nada — devolver o registro à circulação
                // não tira nada de ninguém.
                onClick: () => (ativo ? setConfirmando(true) : aoAlternarAtivo()),
              },
            }
          : {})}
      />

      {aviso}

      <LayoutDoRegistro
        principal={
          <FichaDeModulos
            entidade={entidade}
            registro={registro}
            {...(rotulos ? { rotulos } : {})}
            onEditarModulo={aoEditar}
            // Preencher e Alterar levam ao mesmo lugar — a diferença entre eles
            // é o estado do módulo, não o destino.
            onPreencherModulo={aoEditar}
          />
        }
        lateral={
          <aside
            aria-label={`Apoio do cadastro de ${titulo.toLowerCase()}`}
            className="flex flex-col gap-4"
          >
            <BlocoIdentidade
              nome={nome}
              {...(documento ? { documento } : {})}
              {...(cidade ? { cidade } : {})}
            />
            {resumo.length > 0 ? (
              <CartaoLateral titulo="Resumo" tint="sand" pares={[...resumo]} />
            ) : null}
            <IndiceDeModulos
              entidade={entidade}
              registro={registro}
              {...(rotulos ? { rotulos } : {})}
            />
          </aside>
        }
      />

      {abaixo}

      {aoAlternarAtivo ? (
        <ConfirmarDesativacao
          entidade={titulo.toLowerCase()}
          nome={nome}
          ativo={ativo}
          aberto={confirmando}
          onFechar={() => setConfirmando(false)}
          onConfirmar={() => {
            aoAlternarAtivo()
            setConfirmando(false)
          }}
          pendente={alternando}
          erro={erroAoAlternar}
        />
      ) : null}
    </div>
  )
}

/**
 * Documento e cidade do subtítulo do cartão Identidade, lidos do SCHEMA e não
 * de um mapa por entidade — o mesmo `k` significa a mesma coisa em cliente,
 * fornecedor, profissional e colaborador, que é para isso que o schema é único.
 *
 * A regra é a de `ficha-de-cadastro.tsx`, e está repetida aqui de propósito:
 * lá ela é privada, e aquele arquivo é zona de outra issue desta rodada
 * (D16, #484). Importar exigiria exportá-la de um arquivo que não é meu; a D30
 * junta as duas quando a ficha 1.x sair.
 */
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
