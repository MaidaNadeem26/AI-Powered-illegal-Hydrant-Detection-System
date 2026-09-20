import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { Navbar } from './components/Navbar'

const App = lazy(() => import('./App'))
const Dashboard = lazy(() => import('./Dashboard'))
const HotspotDetail = lazy(() => import('./HotspotDetail'))
const LandingPage = lazy(() => import('./LandingPage'))

function RouteFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      <span className="text-xs font-mono text-[var(--ink-muted)]">Loading view…</span>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/screening" element={<App />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/overview" element={<LandingPage />} />
              <Route path="/landing.html" element={<Navigate to="/landing" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/hotspots/:id" element={<HotspotDetail />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  </StrictMode>,
)

