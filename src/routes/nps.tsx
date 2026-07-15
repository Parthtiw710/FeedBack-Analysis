"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/nps')({
  component: NpsRoute
})

function NpsRoute() {
  return <Dashboard view="nps" />
}
