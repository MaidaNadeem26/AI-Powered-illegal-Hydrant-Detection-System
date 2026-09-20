import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--line)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 text-[var(--ink)] group">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--primary)] flex items-center justify-center text-white font-bold shadow-none group-hover:bg-[var(--primary-dark)] transition-colors">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-[var(--ink)] leading-none flex items-center gap-2 font-[var(--font-display)]">
                  Global Water Theft Detection & Monitoring
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px] font-mono bg-[var(--surface-alt)] text-[var(--ink-muted)] border border-[var(--line)]">
                    Sentinel-2 L2A
                  </span>
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] mt-0.5 hidden sm:inline">
                  Sentinel Watch · Remote sensing & field verification
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            <a
              href="/landing.html"
              className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)] transition-colors"
            <NavLink
              to="/landing"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--primary-tint)] text-[var(--primary)] font-semibold border border-[var(--primary)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)]'
                }`
              }
            >
              Product overview
            </a>
            </NavLink>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--primary-tint)] text-[var(--primary)] font-semibold border border-[var(--primary)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)]'
                }`
              }
            >
              Satellite screening
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--primary-tint)] text-[var(--primary)] font-semibold border border-[var(--primary)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)]'
                }`
              }
            >
              Investigation dashboard
            </NavLink>
          </nav>

          {/* Right Status Indicator & Mobile Toggle */}
          <div className="flex items-center gap-2.5">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-mono bg-[var(--success-tint)] text-[var(--success-dark)] border border-[var(--success)]"
              title="Copernicus Sentinel-2 & Gemini Vision pipeline ready"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
              </span>
              <span>Pipeline active</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-[var(--radius-sm)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--line)] bg-[var(--surface)] px-4 pt-2 pb-3 space-y-1">
          <a
            href="/landing.html"
            className="block px-3 py-2.5 rounded-[var(--radius-sm)] text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
          <NavLink
            to="/landing"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium ${
                isActive
                  ? 'bg-[var(--primary-tint)] text-[var(--primary)] font-semibold border border-[var(--primary)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]'
              }`
            }
          >
            Product overview
          </a>
          </NavLink>
          <NavLink
            to="/"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium ${
                isActive
                  ? 'bg-[var(--primary-tint)] text-[var(--primary)] font-semibold border border-[var(--primary)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]'
              }`
            }
          >
            Satellite screening
          </NavLink>
          <NavLink
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium ${
                isActive
                  ? 'bg-[var(--primary-tint)] text-[var(--primary)] font-semibold border border-[var(--primary)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]'
              }`
            }
          >
            Investigation dashboard
          </NavLink>
        </div>
      )}
    </header>
  )
}
