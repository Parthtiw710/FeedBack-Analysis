"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/scores')({
  component: ScoresRoute
})

function ScoresRoute() {
  return <Dashboard view="scores" />
}
