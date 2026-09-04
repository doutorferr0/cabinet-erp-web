import type { NavGroup, NavItem } from '@/app/navigation'
import { secoesVisiveis } from '@/app/navigation'
import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { Stamp } from '@/components/cabinet/stamp'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'

/**
 * Uma linha do painel: o nome da tela em cima, o que ela FAZ embaixo.
 *
 * A descrição aparece aqui por extenso, e não em cartão de hover como na barra
 * lateral: a barra é lida de relance, com o operador a caminho de outro lugar;
 * esta página é onde ele PARA para decidir onde mexer. Esconder a explicação
 * atrás do ponteiro faria a decisão depender de passar o mouse em cada item —
 * e num toque não há ponteiro nenhum.
 */
function LinhaDaTela({ item }: { item: NavItem }) {
  const corpo = (
    <>
      <span className="t-bloco flex items-center gap-[var(--s-2)]">
        <item.icon aria-hidden="true" className="size-4 shrink-0 text-modulo" />
        <span className="min-w-0 truncate">{item.title}</span>
        {item.externo ? (
          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        ) : null}
      </span>
      <span className="t-meta">{item.descricao}</span>
    </>
  )

  if (item.futuro) {
    return (
      // Apagado no FUNDO, nunca na tinta (regra Visual-1) — o mesmo tratamento
      // da barra lateral, porque é a mesma informação: a tela vai existir.
      <div
        aria-disabled="true"
        className="flex cursor-not-allowed flex-col gap-[var(--s-1)] border-2 border-transparent bg-muted p-2.5"
      >
        <span className="flex items-center gap-[var(--s-2)]">
          {corpo}
          <span className="ml-auto shrink-0 self-start">
            <Stamp tom="neutral" label="futuro" />
          </span>
        </span>
      </div>
    )
  }

  const classe =
    'flex flex-col gap-[var(--s-1)] border-2 border-transparent p-2.5 outline-none hover:border-border hover:bg-modulo focus-visible:focus-ring'

  // Item EXTERNO é `<a href>`: o alvo é arquivo estático servido ao lado da
  // SPA, e `<Link to>` o mandaria ao roteador — 404 com o arquivo ali do lado.
  return item.externo ? (
    <a href={item.url} target="_blank" rel="noreferrer" className={classe}>
      {corpo}
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  ) : (
    <Link to={item.url} className={classe}>
      {corpo}
    </Link>
  )
}

function PainelDoGrupo({ grupo }: { grupo: NavGroup }) {
  return (
    // `exactOptionalPropertyTypes`: grupo sem módulo (Sistema) não declara a
    // propriedade — passar `undefined` seria dizer "módulo nenhum" onde o
    // painel espera "não perguntei", e o par neutro do `:root` é o certo.
    <Painel titulo={grupo.title} {...(grupo.modulo && { modulo: grupo.modulo })} className="gap-0">
      <div className="-m-1.5 flex flex-col">
        {grupo.items.map((item) => (
          <LinhaDaTela key={item.url} item={item} />
        ))}
      </div>
    </Painel>
  )
}

/**
 * CONFIGURAÇÕES — a seção que virou PÁGINA (decisão do user, 2026-08-17).
 *
 * Era um bloco no pé da barra lateral, com o mesmo peso visual de Comercial ou
 * Estoque para uma visita que acontece uma vez por trimestre. Aqui ela ganha o
 * espaço da folha: painel por assunto, explicação à vista, e nenhum lugar da
 * operação gasto com ela.
 *
 * Lê a MESMA taxonomia da barra (`navigation.ts`), e não uma lista própria:
 * item novo em Configurações aparece aqui sem ninguém lembrar de vir mexer, e
 * a guarda de recurso da empresa ativa continua valendo — empresa que não
 * opera um recurso não vê a tela dele nem por este caminho.
 */
export function TelaDeConfiguracoes() {
  // `conhecido` junto com `tem`, e não só o `tem`: quando a consulta do vínculo FALHA o
  // hook devolve o conjunto de recursos VAZIO — então `tem()` responde não a tudo, toda
  // seção some, e a folha afirmava "Nenhuma configuração disponível para esta empresa"
  // por causa de uma requisição que não voltou. O hook publica `conhecido` exatamente
  // para separar "a empresa não tem" de "eu não sei o que a empresa tem"; era o único
  // ponto do repo, fora de `require-recurso`, onde a resposta importava na tela.
  const { tem, conhecido } = useRecursosDaEmpresa()
  const config = secoesVisiveis(tem).find((secao) => secao.oculta)

  return (
    <div className="flex flex-col gap-[var(--s-5)]">
      <PageHeader titulo="Configurações" subtitulo="Como o sistema é montado" />
      {!conhecido ? (
        <p className="t-meta" role="alert">
          Não foi possível saber quais recursos esta empresa tem. Recarregue a página.
        </p>
      ) : config ? (
        <div className="grid gap-[var(--s-5)] md:grid-cols-2">
          {config.grupos.map((grupo) => (
            <PainelDoGrupo key={grupo.title} grupo={grupo} />
          ))}
        </div>
      ) : (
        // Empresa cujos recursos derrubaram todo item de configuração: a página
        // DIZ que não há o que ajustar. Folha em branco faria parecer defeito.
        <p className="t-meta">Nenhuma configuração disponível para esta empresa.</p>
      )}
    </div>
  )
}
