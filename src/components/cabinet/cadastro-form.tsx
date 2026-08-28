import { AlteracoesNaoSalvas } from '@/components/cabinet/alteracoes-nao-salvas'
import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { type FamiliaDeCaminho, useReadOnlyPorPapel } from '@/data/papeis'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type DefaultValues, type FieldValues, type Resolver, useForm } from 'react-hook-form'
import type { z } from 'zod'

export interface CadastroFormProps<T extends FieldValues> {
  /** TODO(contract): o Zod do codegen substituirá estes schemas na integração. */
  schema: z.ZodTypeAny
  defaultValues: DefaultValues<T>
  onGravar: (values: T) => void
  onCancelar: () => void
  /**
   * Gravação em curso (mutation HTTP pendente): o Gravar desabilita para não
   * mandar a mesma escrita duas vezes — num clique duplo, duas requisições
   * idênticas virariam dois registros ou um 409 sem explicação.
   */
  gravando?: boolean
  /**
   * Gravação que deu CERTO (`mutation.isSuccess`) — o par de `gravando`.
   *
   * Existe desde a #405, quando a alteração passou a PERMANECER na tela: o que
   * está nos campos acabou de virar o que o servidor tem, e um formulário que
   * segue marcado como sujo depois disso mente duas vezes — levanta a barra de
   * "alterações não salvas" na primeira tecla e faz a guarda de navegação
   * perguntar se pode descartar o que já foi gravado.
   *
   * Na inclusão o efeito é inofensivo: a tela navega para o documento que
   * nasceu e o formulário desmonta em seguida.
   */
  gravou?: boolean
  /**
   * Modo `Consul.` da barra de ações (§9 padrão 8): mesma tela, sem edição.
   * Desabilita TODO o conteúdo via `<fieldset disabled>` — inclusive botões de
   * busca e de incluir linha nas grades — e o rodapé vira só `Fechar`.
   */
  readOnly?: boolean
  /**
   * Nome da tela, literal da transcrição. Presente, o formulário abre com a
   * banda de identidade (DESIGN.md §CadastroForm) — o `<h1>` da tela passa a
   * ser dela, e a rota para de montar o título à mão.
   */
  titulo?: string
  /**
   * O que qualifica o título: o modo (`Consulta`, `Incluir`) ou o registro
   * aberto. Vai em Meta, ao lado do nome — antes era sufixo `— X` colado no
   * `<h1>`, o que fazia o leitor de tela anunciar modo e nome como uma coisa só.
   */
  contexto?: string
  /**
   * Aviso que vale para a tela inteira (cobertura do contrato, erro de
   * gravação): entra SOB o título e SOBRE os campos.
   *
   * Existe como lugar nomeado porque, solto na rota, ele era irmão do
   * formulário — e como a banda mora aqui dentro, o aviso acabava impresso
   * ANTES do nome da tela. Aviso antes do título faz o operador ler a ressalva
   * sem saber ainda do que ela fala.
   */
  aviso?: React.ReactNode
  /**
   * Família de caminho do recurso. Quando o papel do vínculo ativo não alcança
   * a escrita, o formulário vira somente-leitura automaticamente.
   */
  familia?: FamiliaDeCaminho
  children: React.ReactNode
}

/**
 * Padrão "form com abas" da transcrição (§9): shadcn Tabs + RHF, 1 form por
 * tela (as abas ficam em `children`), rodapé fixo Gravar/Cancelar.
 */
export function CadastroForm<T extends FieldValues>({
  schema,
  defaultValues,
  onGravar,
  onCancelar,
  gravando = false,
  gravou = false,
  readOnly: readOnlyProp = false,
  titulo,
  contexto,
  aviso,
  familia,
  children,
}: CadastroFormProps<T>) {
  const { readOnly: readOnlyDoPapel } = useReadOnlyPorPapel(familia)
  const readOnly = readOnlyProp || readOnlyDoPapel

  const form = useForm<T>({
    // zodResolver tipa pelo schema; com T genérico o casamento é garantido pelo caller.
    resolver: zodResolver(schema as unknown as z.ZodType<T, FieldValues>) as unknown as Resolver<T>,
    defaultValues,
  })

  /**
   * "O `Gravar` já foi apertado" — em `ref` e em estado, de propósito.
   *
   * O `ref` é lido pela guarda de navegação no MESMO tique do `submit`: quem
   * grava navega dentro do `onGravar`, antes de qualquer re-render, e uma
   * guarda que lesse estado veria o valor do render anterior e barraria a saída
   * provocada pelo próprio botão. O estado existe para a barra sumir na tela.
   *
   * Volta a valer na primeira tecla seguinte: gravação que falhou deixa o
   * operador editando de novo, e a partir daí há trabalho a proteger outra vez.
   */
  const enviadoRef = useRef(false)
  const [enviado, setEnviado] = useState(false)

  function rearmar() {
    enviadoRef.current = false
    if (enviado) setEnviado(false)
  }

  /**
   * Gravou e a tela PERMANECE (#405): o que está nos campos é o que o servidor
   * tem, então o formulário deixa de estar sujo — `reset` com os próprios
   * valores zera `isDirty` sem mexer em nada do que está escrito.
   *
   * O `enviado` volta a `false` no mesmo gesto, e é ele que devolve a barra de
   * alterações à próxima tecla: sem isto, a segunda edição da mesma tela seria
   * a única do sistema sem aviso de trabalho pendente.
   */
  useEffect(() => {
    if (!gravou) return
    form.reset(form.getValues())
    enviadoRef.current = false
    setEnviado(false)
    // `form` entra na lista porque a regra do lint a exige; a referência do RHF
    // é estável entre renders, então quem dispara o efeito continua sendo a
    // gravação — e o `reset` com os próprios valores é idempotente de qualquer
    // forma.
  }, [gravou, form])

  // Modo consulta não tem o que gravar; e depois do `Gravar` a barra sai de
  // cena para não pedir de novo o que já foi pedido.
  const temAlteracaoPendente = form.formState.isDirty && !readOnly && !enviado

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          enviadoRef.current = true
          setEnviado(true)
          onGravar(values)
        })}
        onChange={rearmar}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
      >
        {/* `disabled` no fieldset cobre todo descendente sem prop por campo.
            O `gap-4` mora aqui: regiões da tela (fileira de cabeçalho, tira de
            abas, barra de rodapé) se separam por `{spacing.lg}` uma vez só, em
            vez de cada tela repetir `mt-2`/`pt-3` no olho. */}
        {/* Fora do `<fieldset disabled>`: a banda é identidade, não campo — em
            modo consulta ela continua legível, não apagada com o formulário. */}
        {titulo ? <BandaDeIdentidade titulo={titulo} {...(contexto ? { contexto } : {})} /> : null}
        {/* Acima do aviso e dos campos, colada no topo: é a única coisa da tela
            que fala do ESTADO do trabalho, e ela precisa continuar à vista com a
            página rolada. */}
        {temAlteracaoPendente ? (
          <AlteracoesNaoSalvas
            gravando={gravando}
            podeSair={() => enviadoRef.current}
            onDescartar={() => {
              form.reset()
              rearmar()
            }}
          />
        ) : null}
        {aviso}
        {/* `min-w-0` nos dois: sem ele, um item de `flex-col` nasce com
            `min-width: auto` e uma grade larga (Orçamento, 14 colunas) empurra
            a página inteira em vez de rolar dentro de si — ver form-grid.tsx. */}
        <fieldset
          disabled={readOnly}
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 border-0 p-0"
        >
          {children}
        </fieldset>
        {/* Rodapé é Documento (`bg-card`): senta na folha; régua superior em
            Régua Forte (DESIGN.md) — separa a tira de ações do conteúdo. */}
        {/* Padding nos dois lados: `sticky bottom-0` sem `pb` encosta o botão na moldura. */}
        <div className="sticky bottom-0 flex justify-end gap-2 rule-strong-top bg-card py-3">
          {readOnly ? (
            <Button type="button" variant="outline" onClick={onCancelar}>
              <X />
              Fechar
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onCancelar}>
                <X />
                Cancelar
              </Button>
              {/* O `Gravar` SOBE para a barra de alterações enquanto ela está no
                  ar — dois botões com o mesmo rótulo e o mesmo efeito na mesma
                  tela fariam o operador procurar a diferença entre eles. Com o
                  formulário limpo ele fica aqui, que é onde o legado o pôs e
                  onde o cadastro novo (ainda sem uma tecla digitada) precisa
                  dele: campo preenchido por janela de busca não marca o
                  formulário como sujo. */}
              {temAlteracaoPendente ? null : (
                <Button type="submit" disabled={gravando}>
                  <Check />
                  Gravar
                </Button>
              )}
            </>
          )}
        </div>
      </form>
    </Form>
  )
}
