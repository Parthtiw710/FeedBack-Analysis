"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/submissions')({
  component: SubmissionsRoute
})

function SubmissionsRoute() {
  return <Dashboard view="submissions" />
}
