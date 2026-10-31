import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { recordView, startPageAnalytics } from './analyticsBeacon'

export function PageAnalytics() {
  const { pathname } = useLocation()
  useEffect(startPageAnalytics, [])
  useEffect(() => recordView(pathname), [pathname])
  return null
}
