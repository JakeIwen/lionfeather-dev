import type { ComponentType } from 'react'
import { useSiteSettings } from '../settings/currentSiteSettings'
import { visibleIds, type HomeSectionId } from '../settings/siteSettings'
import { About } from './home/About'
import { AdditionalWork } from './home/AdditionalWork'
import { Contact } from './home/Contact'
import { Hero } from './home/Hero'
import { RecommendationSection } from './home/RecommendationSection'
import { SelectedWork } from './home/SelectedWork'
import { StackStrip } from './home/StackStrip'

// The hero and stack strip stay on top; the owner orders and hides the rest.
const homeSections: Record<HomeSectionId, ComponentType> = {
  'selected-work': SelectedWork,
  'additional-work': AdditionalWork,
  recommendation: RecommendationSection,
  about: About,
  contact: Contact,
}

export function HomePage() {
  const settings = useSiteSettings()
  return (
    <>
      <Hero />
      <StackStrip />
      {visibleIds(settings.homeSections).map((id) => {
        const Section = homeSections[id]
        return <Section key={id} />
      })}
    </>
  )
}
