import { EsqueletoDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { useFunis } from '@/data/crm-api'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/crm/funil/')({
  component: EscolheFunil,
})

/**
 * `/crm/funil` sem id: manda para o funil PADRÃO da empresa e sai da frente.
 *
 * O menu lateral aponta para cá porque não pode conhecer o id de um funil da
 * empresa ativa — ele é a mesma barra para todas. Quem sabe qual é o padrão é o
 * servidor (`isDefault`), e o `replace` mantém o histórico limpo: voltar leva à
 * tela anterior, não a este desvio.
 */
function EscolheFunil() {
  const navigate = useNavigate()
  const funis = useFunis()
  const escolhido = funis.data?.find((funil) => funil.isDefault) ?? funis.data?.[0]

  useEffect(() => {
    if (!escolhido) return
    void navigate({
      to: '/crm/funil/$funilId',
      params: { funilId: escolhido.id },
      replace: true,
    })
  }, [escolhido, navigate])

  if (funis.isPending) return <EsqueletoDeCarregamento />

  if (!escolhido) {
    // Nenhum funil ativo é estado legítimo de empresa que ainda não configurou
    // o CRM. A saída é o cadastro, e a tela diz qual — em branco não diz nada.
    return (
      <p className="text-muted-foreground">
        Nenhum funil ativo nesta empresa. Crie um no Cadastro de Funis.
      </p>
    )
  }

  return <EsqueletoDeCarregamento />
}
