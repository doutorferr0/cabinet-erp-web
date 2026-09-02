import { Marca } from '@/components/cabinet/marca'
import { Ornamento } from '@/components/cabinet/ornamento'

/**
 * A PÁGINA DIVIDIDA das quatro telas de credencial (Reface 2.0, D28).
 *
 * Esquerda é BANCADA: marca, ornamento e o claim — quem chega aqui ainda não
 * tem sistema para navegar, então o lado que não pede nada é o que diz de que
 * produto se trata. Direita é a folha rebaixada com UM card, e é lá que mora
 * todo o controle.
 *
 * As quatro telas dividem esta moldura porque o ATO é o mesmo — provar quem é.
 * O que muda são os campos e o título; quatro molduras divergiriam na primeira
 * correção feita numa só, que foi o que aconteceu no 1.x (a folha centrada
 * estava copiada em três arquivos, e a de `definir-senha` já tinha nascido
 * diferente).
 *
 * A bancada some abaixo de `lg`: em tela estreita ela empurraria o card para
 * fora da dobra, e o card é a tarefa.
 *
 * §Hierarquia: DOIS Gambarinos, e são os dois permitidos — `t-display` no claim
 * (a régua nomeia "claim do login" como uso dele) e `t-registro` no título do
 * card. A fronteira bancada › folha é UMA hairline vertical, sem sombra por
 * cima; a sombra dura da tela é a do card (`--hard-2`), e é só ela.
 */
export function PaginaDeAuth({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo?: string
  children: React.ReactNode
}) {
  // O demo é gate de BUILD (`VITE_DEMO_USER` no painel da Cloudflare), não
  // ambiente: a nota só aparece onde a credencial única existe, e some sozinha
  // no app que fala com o backend de verdade.
  const demonstracao = Boolean(import.meta.env.VITE_DEMO_USER)

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col overflow-hidden border-r border-[color:var(--n-300)] bg-[color:var(--n-100)] p-8 lg:flex">
        <div className="flex items-center gap-3">
          <Marca tamanho={40} className="text-[color:var(--n-900)]" />
          <span className="t-secao">Cabinet</span>
        </div>

        {/* Sangra pela direita de propósito: forma cortada pela borda lê como
            textura da bancada, forma inteira e centrada leria como ilustração. */}
        <Ornamento
          shape="dashboard"
          tom="icone"
          tamanho={360}
          className="pointer-events-none absolute top-20 -right-16 text-[color:var(--n-900)] opacity-90"
        />

        {/* `mt-auto` no GRUPO: claim e rodapé fecham a coluna juntos, e a
            distância entre eles é gap — irmão não carrega margem própria. */}
        <div className="relative mt-auto flex flex-col gap-6">
          <h2 className="t-display max-w-[26ch]">
            Do orçamento à entrega,{' '}
            {/* O grifo é FUNDO, e baixo (62%–92%): texto em chartreuse reprova
                contraste, e faixa cheia apagaria a linha de base. */}
            <em
              className="box-decoration-clone not-italic"
              style={{
                backgroundImage:
                  'linear-gradient(transparent 62%, var(--main) 62%, var(--main) 92%, transparent 92%)',
              }}
            >
              num sistema só.
            </em>
          </h2>
          <p className="t-meta max-w-[52ch]">
            Orçamento, pedido, obra e estoque no mesmo lugar, para quem vende projeto sob medida.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-[color:var(--n-50)] p-4 lg:p-8">
        <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-[var(--r-panel)] border-[1.5px] border-[color:var(--n-900)] bg-[color:var(--n-0)] p-6 shadow-[var(--hard-2)]">
          <div className="flex flex-col gap-1">
            <h1 className="t-registro">{titulo}</h1>
            {subtitulo && <p className="t-meta">{subtitulo}</p>}
          </div>
          {children}
          {demonstracao && (
            // Tracejado, e não hairline cheia: a nota não é uma seção do card,
            // é um recado sobre o ambiente — a linha diz isso sem legenda.
            <p className="t-rotulo border-t border-dashed border-[color:var(--n-200)] pt-3">
              ambiente de demonstração · dados fictícios
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
