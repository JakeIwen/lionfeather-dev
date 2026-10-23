import { Route, Routes } from 'react-router-dom'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { PagePosition } from './components/layout/PagePosition'
import { ArticlePage } from './pages/ArticlePage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProjectPage } from './pages/ProjectPage'
import { RecommendationPage } from './pages/RecommendationPage'
import { WritingPage } from './pages/WritingPage'
import {
  articleRoute,
  homePath,
  projectRoute,
  recommendationPath,
  writingPath,
} from './routes'
import './App.css'

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <PagePosition />
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path={homePath} element={<HomePage />} />
          <Route path={writingPath} element={<WritingPage />} />
          <Route path={projectRoute} element={<ProjectPage />} />
          <Route path={articleRoute} element={<ArticlePage />} />
          <Route path={recommendationPath} element={<RecommendationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
