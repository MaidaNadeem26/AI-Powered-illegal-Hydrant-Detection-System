import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Dashboard from './Dashboard.tsx'
import HotspotDetail from './HotspotDetail.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <nav className="top-nav"><Link to="/">Screening</Link><Link to="/dashboard">Dashboard</Link></nav>
      <Routes><Route path="/" element={<App />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/hotspots/:id" element={<HotspotDetail />} /></Routes>
    </BrowserRouter>
  </StrictMode>,
)
