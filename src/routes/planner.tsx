import { PlannerTela } from '@/features/planner/planner'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/planner')({
  component: PlannerTela,
})
