import { PaginaDoFunil } from '@/features/crm/pagina-do-funil'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/crm/funil/$funilId')({
  component: () => <PaginaDoFunil pipelineId={Route.useParams().funilId} />,
})
