"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/priority')({
  component: PriorityRoute
})

function PriorityRoute() {
  return <Dashboard view="priority" />
}
