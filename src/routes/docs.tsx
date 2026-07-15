"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/docs')({
  component: DocsRoute
})

function DocsRoute() {
  return <Dashboard view="docs" />
}
