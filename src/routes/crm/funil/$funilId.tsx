import { createFileRoute } from '@tanstack/react-router'
import { PaginaDoFunil } from '@/features/crm/pagina-do-funil'

export const Route = createFileRoute('/crm/funil/$funilId')({
  component: () => <PaginaDoFunil pipelineId={Route.useParams().funilId} />,
})
