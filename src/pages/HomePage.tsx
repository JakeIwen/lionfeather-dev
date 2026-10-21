import { About } from './home/About'
import { Contact } from './home/Contact'
import { Hero } from './home/Hero'
import { RecommendationSection } from './home/RecommendationSection'
import { SelectedWork } from './home/SelectedWork'
import { StackStrip } from './home/StackStrip'

export function HomePage() {
  return (
    <>
      <Hero />
      <StackStrip />
      <SelectedWork />
      <RecommendationSection />
      <About />
      <Contact />
    </>
  )
}
