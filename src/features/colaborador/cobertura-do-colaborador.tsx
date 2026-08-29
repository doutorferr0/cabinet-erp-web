import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import type { CamposDoContrato } from '@/components/cabinet/erro-do-servidor'
import { camposDoContrato, colaborador as esquema } from '@/features/cadastro/modulos'

/**
 * `fields[].path` do servidor → campo desta tela.
 *
 * A base sai de `camposDoContrato(esquema)`, que lê o `dto:` de cada campo — e
 * o `dto:` do schema é o da **LISTAGEM** (`EmployeeDto`, os cinco campos da
 * grade), porque é ele que o seletor de colunas consome. `email` e `phone` não
 * estão lá: são do `EmployeeDetailDto`, e declará-los como `dto` reprovaria a
 * guarda que confere cada `dto` contra `dtoDoContrato`. Os dois entram aqui, ao
 * lado do consumidor, e não como uma terceira coluna no schema.
 */
const CAMPOS_DA_RECUSA: CamposDoContrato = {
  ...camposDoContrato(esquema),
  email: { nome: 'email', rotulo: 'E-mail de login' },
  phone: { nome: 'telefone', rotulo: 'Celular' },
}

/**
 * A COSTURA DO COLABORADOR, dita em voz alta — e ela MUDOU DE LADO DUAS VEZES.
 *
 * ## 25/08: a leitura migrou
 *
 * Este aviso nasceu para uma divergência de LEITURA: `GET /api/employees`
 * estava na lista de passagem porque a família de atividades depende dela,
 * enquanto ESTA tela lia `src/mocks/colaboradores.ts`. Com o par local de pé
 * havia **duas listas de quem trabalha aqui**. Acabou: `data.colaboradores` é
 * HTTP desde 25/08 (`colaboradores-api.ts`).
 *
 * ## 28/08 (#402): a ESCRITA migrou, e o que sobra é uma regra de PERMISSÃO
 *
 * `Gravar` era `console.info`. Agora é `POST /api/employees` e
 * `PUT /api/employees/{id}` — e a matriz do api reserva a família a `admin`,
 * porque vínculo é o que decide o papel dos OUTROS. Quem entra com
 * `operator-full` (o papel da semente e do usuário demo) recebe **403
 * `urn:cabinet:erro:papel-insuficiente`**, e a decisão do user foi ligar assim
 * mesmo: um cadastro que RECUSA em voz alta diz ao operador que ele precisa de
 * outro papel; um que finge gravar não diz nada.
 *
 * Por isso este componente ganhou o `ErroDeGravacao`: o 403 não pode chegar
 * como troca de tela silenciosa. O `detail` do problem+json é quem sabe qual
 * permissão faltou — a tela não teria como adivinhar.
 *
 * ## O aviso de COBERTURA não depende mais do proxy
 *
 * Antes ele só aparecia com `VITE_API_PROXY`, porque falava de uma divergência
 * que só existia com backend real. O que ele diz agora vale nos DOIS ambientes:
 * o `Gravar` envia quatro campos de um formulário que tem trinta, e cargo,
 * setor e admissão são do VÍNCULO — mudam por outra operação, em outra tela.
 * Esconder isso no modo mock ensinaria o operador do site público que o
 * cadastro grava tudo.
 */
export function CoberturaDoColaborador({
  erro,
  isNovo = false,
}: {
  /** Recusa da escrita, quando houve. Ausente: só o aviso de cobertura. */
  erro?: unknown
  isNovo?: boolean
}) {
  const falha = erro ? (
    <ErroDeGravacao
      erro={erro}
      mensagem={
        isNovo
          ? 'Não foi possível incluir este colaborador.'
          : 'Não foi possível gravar este cadastro.'
      }
      campos={CAMPOS_DA_RECUSA}
      className="w-full"
    />
  ) : null

  return (
    <AvisoDeCobertura {...(falha ? { erro: falha } : {})}>
      <p>
        <strong>Gravar</strong> envia ao servidor apenas nome, e-mail de login, celular e situação.
        Cargo, setor e datas de admissão pertencem ao <strong>vínculo com a empresa</strong> e mudam
        em Configurações · Usuários; o bloco de RH ainda não existe no contrato e não é enviado.
      </p>
      <p>
        Alterar colaborador é reservado a quem <strong>administra</strong> — o vínculo é o que
        decide o papel dos outros. Sem esse papel o servidor recusa, e a recusa aparece aqui.
      </p>
    </AvisoDeCobertura>
  )
}
