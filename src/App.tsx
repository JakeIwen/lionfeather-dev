import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PageAnalytics } from './analytics/PageAnalytics'
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
  adminArticleRoute,
  adminPath,
  articleRoute,
  homePath,
  projectRoute,
  recommendationPath,
  writingPath,
} from './routes'
import './App.css'

// Only the owner opens it, so visitors never download its code.
const AdminPage = lazy(() =>
  import('./pages/admin/AdminPage').then((module) => ({
    default: module.AdminPage,
  })),
)

const ArticleEditorPage = lazy(() =>
  import('./pages/admin/ArticleEditorPage').then((module) => ({
    default: module.ArticleEditorPage,
  })),
)

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <PagePosition />
      <PageAnalytics />
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path={homePath} element={<HomePage />} />
          <Route path={writingPath} element={<WritingPage />} />
          <Route path={projectRoute} element={<ProjectPage />} />
          <Route path={articleRoute} element={<ArticlePage />} />
          <Route path={recommendationPath} element={<RecommendationPage />} />
          <Route
            path={adminPath}
            element={
              <Suspense fallback={null}>
                <AdminPage />
              </Suspense>
            }
          />
          <Route
            path={adminArticleRoute}
            element={
              <Suspense fallback={null}>
                <ArticleEditorPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
