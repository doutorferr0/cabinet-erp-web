import { FormBlock } from '@/components/cabinet/form-block'
import { Button } from '@/components/ui/button'
import type { EntidadeCadastro, ModuloCadastro } from '@/features/cadastro/modulos'
import { Pencil, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { camposPreenchidos, moduloVazio, textoDoCampo } from './valores'

/**
 * FICHA DE LEITURA POR MÓDULOS (issue #103).
 *
 * Pedido do user (2026-08-14): a consulta também por módulos. **Ler é o uso mais
 * frequente de um cadastro, não editar** — e abrir um registro hoje devolve o
 * formulário inteiro, com 40 campos em modo somente-leitura.
 *
 * ## A ficha e o formulário são O MESMO schema
 *
 * Nenhum módulo é declarado aqui: eles vêm de `EntidadeCadastro`
 * (`src/features/cadastro/modulos/`), o mesmo objeto que gera o formulário. É a
 * razão inteira de o schema existir — duas telas escritas à mão sobre a mesma
 * entidade divergem em três meses, e foi o que já aconteceu com os `FormBlock`
 * (Fornecedor 13, Profissional 3). O teste de paridade trava isso.
 *
 * ## As duas leituras que o desenho precisa separar
 *
 * - **Módulo com dado** → aberto, na cor do módulo. É o que se veio ler.
 * - **Módulo vazio** → recolhido e apagado, com o convite para preencher. Some
 *   da vista sem sumir da tela: o operador continua sabendo que ele existe.
 *
 * E dentro do módulo cheio, **campo sem valor escreve "não informado"** em vez
 * de sumir. Sumir faria o leitor não distinguir "o dado não existe" de "a tela
 * não mostra" — a mesma economia do `AvisoDeCobertura`.
 *
 * ## O que este componente NÃO faz, e por quê
 *
 * **Não consulta lista de apoio.** Campo que guarda id de lookup chega aqui como
 * id; quem traduz é a tela, pelo mapa `rotulos`. Componente de apresentação que
 * dispara consulta vira componente que falha, carrega e precisa de estado de
 * erro — e a ficha passaria a ter três estados por módulo em vez de dois.
 *
 * **Não monta os KPIs.** A faixa do topo é por entidade (cliente → comprado no
 * ano, pedidos, obras) e nenhum desses números está no schema: eles vêm de
 * consulta agregada que o contrato ainda não publica. Entram por `kpis`, como
 * conteúdo — inventar os números aqui seria dado de mentira com cara de dado do
 * servidor.
 */

export interface FichaDeModulosProps {
  entidade: EntidadeCadastro
  /** O registro, na forma que o schema descreve (caminhos de `campo`). */
  registro: unknown
  /**
   * Valor guardado → texto que se lê. É por aqui que o id de uma lista de apoio
   * vira nome. Ausente: a ficha imprime o valor como ele está.
   */
  rotulos?: Readonly<Record<string, string>>
  /** Faixa de indicadores do topo. Ver a nota do docstring. */
  kpis?: ReactNode
  /** Lápis por módulo — abre a edição DAQUELE módulo, não do formulário inteiro. */
  onEditarModulo?: (moduloId: string) => void
  /** "+ Preencher" do módulo vazio. Sem ele, o módulo vazio é só informativo. */
  onPreencherModulo?: (moduloId: string) => void
}

function ParDeLeitura({ rotulo, texto }: { rotulo: string; texto: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.06em]">
        {rotulo}
      </span>
      {texto === null ? (
        // "não informado" é conteúdo, não placeholder: ele afirma que o campo
        // existe e está vazio. Por isso não usa a voz de dado.
        <span className="text-muted-foreground text-sm italic">não informado</span>
      ) : (
        <span className="break-words text-sm">{texto}</span>
      )}
    </div>
  )
}

function ModuloCheio({
  modulo,
  registro,
  rotulos,
  onEditar,
}: {
  modulo: ModuloCadastro
  registro: unknown
  rotulos?: Readonly<Record<string, string>>
  onEditar?: (moduloId: string) => void
}) {
  return (
    <FormBlock legend={modulo.titulo} {...(modulo.cor ? { cor: modulo.cor } : {})}>
      <div className="flex flex-col gap-3">
        {onEditar ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Alterar ${modulo.titulo}`}
              onClick={() => onEditar(modulo.id)}
            >
              <Pencil />
              Alterar
            </Button>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {modulo.campos.map((campo) => (
            <ParDeLeitura
              key={campo.k}
              rotulo={campo.r}
              texto={textoDoCampo(registro, campo, rotulos)}
            />
          ))}
        </div>
      </div>
    </FormBlock>
  )
}

function ModuloVazio({
  modulo,
  onPreencher,
}: {
  modulo: ModuloCadastro
  onPreencher?: (moduloId: string) => void
}) {
  // Sem `cor`: módulo vazio é cinza. A cor anuncia conteúdo, e pintar um
  // compartimento sem nada dentro faria a ficha parecer cheia de longe.
  //
  // **E sem `colapsavel`**, ainda que "recolhido" seja a palavra da issue. A
  // primeira versão usava o colapso do `FormBlock` e o teste pegou o defeito: o
  // botão `Preencher` ficava DENTRO do corpo fechado — o convite escondido
  // atrás daquilo que ele convida a abrir. Recolhido aqui quer dizer BAIXO: uma
  // fileira, contra as três ou quatro do módulo cheio. A diferença de altura é
  // que faz o olho pular os vazios, não um gatilho.
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-surface-sunken px-3 py-2">
      <span className="font-bold font-mono text-[0.75rem] text-text-strong uppercase tracking-[0.06em]">
        {modulo.titulo}
      </span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground text-sm">{modulo.resumo}</span>
      {onPreencher ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Preencher ${modulo.titulo}`}
          onClick={() => onPreencher(modulo.id)}
        >
          <Plus />
          Preencher
        </Button>
      ) : null}
    </div>
  )
}

export function FichaDeModulos({
  entidade,
  registro,
  rotulos,
  kpis,
  onEditarModulo,
  onPreencherModulo,
}: FichaDeModulosProps) {
  return (
    <div className="flex flex-col gap-3" data-slot="ficha-de-modulos">
      {kpis}
      {entidade.modulos.map((modulo) => {
        const vazio = moduloVazio(registro, modulo, rotulos)
        return (
          <section key={modulo.id} data-modulo-id={modulo.id} data-vazio={vazio || undefined}>
            {vazio ? (
              <ModuloVazio
                modulo={modulo}
                {...(onPreencherModulo ? { onPreencher: onPreencherModulo } : {})}
              />
            ) : (
              <ModuloCheio
                modulo={modulo}
                registro={registro}
                {...(rotulos ? { rotulos } : {})}
                {...(onEditarModulo ? { onEditar: onEditarModulo } : {})}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}

/** Quantos campos do módulo estão preenchidos — o índice lateral usa isto. */
export { camposPreenchidos, moduloVazio }
