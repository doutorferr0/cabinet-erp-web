import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { FichaDeModulos } from '@/components/cabinet/ficha/ficha-de-modulos'
import { Button } from '@/components/ui/button'
import type { EntidadeCadastro } from '@/features/cadastro/modulos'
import { X } from 'lucide-react'
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
 * Banda de identidade, aviso da tela e rodapé `Fechar` são os mesmos nas quatro
 * entidades — e são os mesmos do `CadastroForm`, de propósito: quem vem do
 * `Alterar` reconhece a tela pela moldura e vê só o miolo trocar. Quatro cópias
 * divergiriam, que é a mesma razão de o schema de módulos existir.
 *
 * ## O que NÃO faz, e a pendência declarada
 *
 * **Não traduz id de lista de apoio.** Os quatro cadastros ainda guardam o
 * rótulo legível (`setor: 'VENDAS'`), então a ficha imprime o valor como está.
 * Quando a #94 (LookupCombo por id) entrar, quem passa o mapa `rotulos` é a
 * rota — o ponto de entrada já existe na prop do `FichaDeModulos`.
 *
 * **O lápis abre o cadastro, não o módulo.** A issue pede "edita AQUELE
 * módulo"; abrir o formulário JÁ posicionado num bloco exige o `CadastroForm`
 * aceitar módulo inicial, e os quatro formulários estão fora da zona desta PR.
 * O caminho de volta à edição existe e é o certo — o refinamento fica declarado
 * em vez de meio-feito.
 */

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
  /** Volta para a listagem. */
  aoFechar: () => void
  /** Leva ao modo edição da MESMA rota (sem `?modo=consulta`). */
  aoEditar: (moduloId: string) => void
}

export function FichaDeCadastro({
  entidade,
  registro,
  titulo,
  contexto,
  aviso,
  abaixo,
  aoFechar,
  aoEditar,
}: FichaDeCadastroProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <BandaDeIdentidade titulo={titulo} {...(contexto ? { contexto } : {})} />
      {aviso}

      <FichaDeModulos
        entidade={entidade}
        registro={registro}
        onEditarModulo={aoEditar}
        // Preencher e Alterar levam ao mesmo lugar — a diferença entre eles é o
        // estado do módulo, não o destino. Módulo vazio dá ao operador o convite
        // que o módulo cheio dá pelo lápis.
        onPreencherModulo={aoEditar}
      />

      {abaixo}

      {/* Mesma tira do `CadastroForm` em modo consulta: régua forte sobre
          Documento, ação única à direita. Ver o rodapé de cadastro-form.tsx. */}
      <div className="sticky bottom-0 flex justify-end gap-2 rule-strong-top bg-card py-3">
        <Button type="button" variant="outline" onClick={aoFechar}>
          <X />
          Fechar
        </Button>
      </div>
    </div>
  )
}
