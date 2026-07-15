"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/raw')({
  component: RawRoute
})

function RawRoute() {
  return <Dashboard view="raw" />
}
