"use client"

import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '../pages/Dashboard'

export const Route = createFileRoute('/volume')({
  component: VolumeRoute
})

function VolumeRoute() {
  return <Dashboard view="volume" />
}
