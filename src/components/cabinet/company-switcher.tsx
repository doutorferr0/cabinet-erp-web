import { monograma } from '@/components/cabinet/monograma'
import { Ornamento } from '@/components/cabinet/ornamento'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { papelLabel } from '@/data/papeis'
import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button as ButtonAria } from 'react-aria-components'

/** Rota que administra o grupo — a mesma aba Empresas de `/config/usuarios`. */
const ROTA_DE_EMPRESAS = '/config/usuarios'

/** Caixa do monograma da empresa ATIVA — chartreuse com tinta preta. */
const MONOGRAMA_ATIVO = {
  background: 'var(--main)',
  color: 'var(--main-fg)',
  border: '1px solid var(--n-900)',
} as const

/** Caixa do monograma das outras — neutra, para o chartreuse marcar UMA. */
const MONOGRAMA_INATIVO = {
  background: 'var(--n-100)',
  border: '1px solid var(--n-300)',
} as const

/**
 * Seletor da empresa ativa (`activeTenantId` da sessão).
 *
 * Vínculo ≠ contexto: a lista mostra o que o usuário alcança, o rótulo mostra
 * onde ele está. Trocar aqui é trocar o escopo de todo dado da tela — a
 * invalidação mora no hook, não neste componente.
 *
 * ## Era GAVETA e virou TECLA + POPOVER (Reface 2.0, issue D6)
 *
 * A decisão de 2026-08-06 pôs a lista numa gaveta modal, e o argumento era o
 * PESO: trocar de empresa muda todo número da tela, e menu suspenso trataria
 * isso com o peso de escolher uma coluna de ordenação. A issue D6 (2026-09-02)
 * pede popover, e as duas coisas convivem porque o peso nunca esteve na
 * gaveta: está no ALERTA de confirmação, que continua aqui. O popover é o
 * SELETOR — barato, colado ao gatilho, do tamanho da escolha; o alerta é onde a
 * consequência é lida e onde o clique é cobrado. A gaveta cobrava um clique a
 * mais ANTES de o operador ver do que se tratava.
 *
 * O `Sair` saiu junto com ela, e não some do sistema: mora no menu do operador,
 * ao lado deste bloco. Estava no rodapé da gaveta por ser o outro gesto de
 * "quem/onde estou" — numa peça pousada de três linhas, seria a terceira delas,
 * a um pixel de distância de trocar de empresa.
 *
 * TODO(contract): a transcrição mostra CNPJ junto do nome da empresa; o
 * `VinculoDeEmpresa` do contrato traz só `tenantId`, `name` e `role`. Enquanto
 * o CNPJ não vier, a segunda linha mostra o papel — que é dado real — em vez de
 * um documento inventado.
 */
export function CompanySwitcher() {
  const [aberta, setAberta] = useState(false)
  const { empresas, ativa, carregando, erro, trocar, trocando } = useEmpresasDaSessao()
  const navigate = useNavigate()
  // Alvo da confirmação. O POPOVER CONTINUA ABERTO por baixo do alerta:
  // cancelar devolve o operador à lista de onde ele saiu, não a lugar nenhum.
  const [confirmando, setConfirmando] = useState<(typeof empresas)[number] | null>(null)

  // Estados distintos: esperar, avisar alguém, ou não ter vínculo mesmo.
  const titulo = carregando
    ? 'Carregando…'
    : erro
      ? 'Empresas indisponíveis'
      : (ativa?.name ?? 'Nenhuma empresa ativa')

  // "3 empresas" só é informação quando há mais de uma — com uma só, a frase
  // anunciaria uma escolha que o operador não tem.
  const quantas = empresas.length > 1 ? `${empresas.length} empresas` : null
  const legenda = ativa
    ? [papelLabel(ativa.role), quantas].filter(Boolean).join(' · ')
    : 'Sem vínculo ativo'

  return (
    <PopoverTrigger isOpen={aberta} onOpenChange={setAberta}>
      {/* TECLA: 1.5px de tinta e `--key-1`. É o único elemento da barra lateral
          com relevo de tinta, e é de propósito — a régua §Hierarquia dá uma
          sombra dura por tela, e aqui ela marca a peça que responde "de qual
          empresa é tudo isto". Borda e sombra inline porque o
          `* { border-color }` do `index.css` mora fora de camada e apaga
          qualquer utility de cor de borda. */}
      <ButtonAria
        isDisabled={carregando || Boolean(erro)}
        // Sem empresa, o nome acessível é o MOTIVO — 'Empresa ativa' num botão
        // que diz 'Nenhuma empresa ativa' faria o leitor de tela anunciar o
        // contrário do que está escrito nele.
        aria-label={ativa ? `Empresa ativa: ${ativa.name}` : titulo}
        // `desabilitado`, e não `disabled:opacity-60`: a §Desabilitado (decisão
        // do user, 2026-08-14, #106) manda o apagamento ir para o FUNDO e o
        // TRAÇO, nunca para o conteúdo — opacidade apaga o texto junto e é o que
        // derruba o contraste de quem mais precisa lê-lo. A utility já existia
        // no `index.css` e a varredura de `desabilitado.test.tsx` cobra; esta
        // linha nasceu na D6 com a receita antiga (D37).
        className="desabilitado flex w-full items-center gap-3 rounded-card border bg-card px-3 py-2 text-left outline-none focus-visible:focus-ring"
        style={{ borderWidth: '1.5px', borderColor: 'var(--n-900)', boxShadow: 'var(--key-1)' }}
      >
        {/* MONOGRAMA chartreuse com tinta preta — o único chartreuse desta
            peça, e o mockup o quer assim: cor de empresa fica no monograma,
            nunca no bloco inteiro. O `Ornamento` do galpão saiu com a gaveta;
            duas marcas de "empresa" na mesma linha diziam o mesmo duas vezes. */}
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-content-center rounded-item t-rotulo"
          style={ativa ? MONOGRAMA_ATIVO : MONOGRAMA_INATIVO}
        >
          {ativa ? monograma(ativa.name) : '—'}
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="truncate t-bloco">{titulo}</span>
          <span className="truncate t-meta">{legenda}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </ButtonAria>

      <Popover placement="bottom start" className="w-(--trigger-width) min-w-64 gap-1 p-1">
        {empresas.length === 0 ? (
          <p className="px-2 py-3 t-meta">Nenhuma empresa vinculada a este usuário.</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {empresas.map((empresa) => {
              const eAtiva = empresa.tenantId === ativa?.tenantId
              return (
                <li key={empresa.tenantId}>
                  <ButtonAria
                    isDisabled={trocando}
                    onPress={() => {
                      // Escolher a que já está ativa não é troca: só fecha.
                      if (eAtiva) {
                        setAberta(false)
                        return
                      }
                      setConfirmando(empresa)
                    }}
                    className="flex w-full items-center gap-2 rounded-item px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:focus-ring"
                    {...(eAtiva && { 'aria-current': 'true' })}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-content-center rounded-item t-rotulo"
                      style={eAtiva ? MONOGRAMA_ATIVO : MONOGRAMA_INATIVO}
                    >
                      {monograma(empresa.name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate t-ui">{empresa.name}</span>
                      <span className="truncate t-meta">{papelLabel(empresa.role)}</span>
                    </span>
                    {/* A marca da ativa é o CHECK, não um fundo: fundo de
                        seleção some sob o hover do vizinho, e "em qual eu
                        estou?" precisa de resposta estável. */}
                    {eAtiva && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  </ButtonAria>
                </li>
              )
            })}
          </ul>
        )}

        {/* Rodapé: a saída para administrar o grupo. Uma hairline separando —
            a ferramenta mais barata que resolve esta fronteira. */}
        <div className="border-t pt-1" style={{ borderTopColor: 'var(--n-200)' }}>
          <ButtonAria
            onPress={() => {
              setAberta(false)
              void navigate({ to: ROTA_DE_EMPRESAS })
            }}
            className="flex w-full items-center gap-2 rounded-item px-2 py-1.5 text-left t-ui outline-none hover:bg-muted focus-visible:focus-ring"
          >
            <Settings2 aria-hidden="true" className="size-4 shrink-0" />
            Gerenciar empresas
          </ButtonAria>
        </div>
      </Popover>

      {/* CONFIRMAÇÃO DA TROCA — onde o peso do gesto é cobrado.
          `role="alertdialog"` (§alert-dialog): a consequência é lida JUNTO do
          título, antes de o foco chegar nos botões. Clicar fora não cancela; a
          saída é sempre por botão nomeado.

          O ornamento é `empresa`, não `alerta`/`erro`: trocar de empresa é
          forte, não é engano nem destruição, e a cor de estado num ornamento
          só é permitida quando o significado É erro (memória §@ornamentos).
          Pela mesma razão o botão de ação é o padrão, não `destructive`. */}
      {confirmando ? (
        <AlertDialog isOpen onOpenChange={(open) => !open && setConfirmando(null)}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertDialogMedia>
                <Ornamento shape="empresa" tom="empresa" tamanho={40} />
              </AlertDialogMedia>
              <AlertDialogTitle>Trocar para {confirmando.name}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Tudo que está aberto passa a ser de <strong>{confirmando.name}</strong>: listagens,
              documentos e totais são recarregados no escopo da nova empresa. Nada é apagado — dá
              para voltar por aqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => setConfirmando(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={trocando}
              onClick={() => {
                trocar(confirmando.tenantId)
                setConfirmando(null)
                setAberta(false)
              }}
            >
              {trocando ? 'Trocando…' : 'Trocar empresa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      ) : null}
    </PopoverTrigger>
  )
}
