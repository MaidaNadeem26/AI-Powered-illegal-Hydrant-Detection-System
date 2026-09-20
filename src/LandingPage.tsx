import { Link } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Secondary In-Page Navigation Bar */}
      <div className="landing-subnav">
        <div className="landing-container landing-subnav-inner">
          <div className="landing-subnav-links">
            <a href="#pipeline">Screening methodology</a>
            <a href="#evidence">Physical evidence</a>
            <a href="#dashboard-preview">Triage queue</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/screening" className="landing-btn landing-btn-primary text-xs !py-1 !px-3">
              Launch screening app →
            </Link>
          </div>
        </div>
      </div>

      {/* 1. Hero Section with Real Satellite Image Backdrop */}
      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">Remote sensing & civic infrastructure screening</span>
            <h1 className="landing-hero-title">Find illegal hydrants before the tankers do.</h1>
            <p className="landing-hero-subhead">
              In dense, arid urban centers like Karachi, water extraction networks siphon municipal mains into commercial tanker queues undetected. Global Water Theft Detection & Monitoring screens multispectral Sentinel-2 imagery to spot unauthorized surface reservoirs, booster clusters, and perimeter tanker tracks weeks before billing anomalies surface.
            </p>
            <div className="landing-hero-actions">
              <Link to="/screening" className="landing-btn landing-btn-primary">
                Launch screening app
              </Link>
              <a href="#pipeline" className="landing-btn landing-btn-secondary">
                See how detection works
              </a>
              <a href="#cta" className="landing-btn landing-btn-secondary">
                Request a demo
              </a>
            </div>

            <div className="landing-metrics-strip">
              <div className="landing-metric-item">
                <strong>5-stage pipeline</strong>
                <span>From user bounding box to ground verification</span>
              </div>
              <div className="landing-metric-item">
                <strong>0.00–1.00 score</strong>
                <span>Evidence scoring, never a guilt verdict</span>
              </div>
              <div className="landing-metric-item">
                <strong>~300m radius</strong>
                <span>Spatial clustering of repeat detections</span>
              </div>
            </div>
          </div>

          {/* Hero Right: Authentic Satellite Panel with Sentinel-2 Imagery */}
          <div className="landing-satellite-panel" aria-label="Authentic satellite imagery visual with extraction anomaly">
            <img
              src="/images/satellite-detection.jpg"
              alt="Orbital Sentinel-2 true-color satellite capture over Karachi arid fringe showing open water reservoir"
              className="landing-satellite-img-bg"
            />
            <div className="landing-scanline" />

            <div className="landing-hud-top font-mono">
              <span className="landing-hud-badge">
                <span className="landing-pulse-dot" />
                Sentinel-2 MSI Level-2A
              </span>
              <span>10m/px · True color B04/03/02</span>
            </div>

            <div className="landing-aoi-box">
              <span className="landing-aoi-tag font-mono">AOI-KHI-409 · 14.8 km²</span>
            </div>

            <div className="landing-radar-marker" title="Flagged potential extraction feature">
              <div className="landing-radar-wave" />
              <div className="landing-radar-core" />
            </div>

            <div className="landing-hotspot-chip font-mono">
              <strong>0.84 conf</strong> · Unregistered reservoir
            </div>

            <div className="landing-hud-bottom font-mono">
              <span>24.9412° N, 67.0984° E</span>
              <span>Karachi Sector 11-A</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem Strip */}
      <section className="landing-problem-strip">
        <div className="landing-container landing-problem-grid">
          <div className="landing-problem-text">
            Municipal water authorities traditionally discover commercial extraction late, after chronic low-pressure complaints or quarterly bulk supply shortfalls appear. Global Water Theft Detection & Monitoring scans multispectral earth observation passes on revisit to identify physical extraction signatures on the ground before meters record the loss.
          </div>
          <div className="landing-problem-metrics">
            <div className="landing-problem-metric-card">
              <strong>&lt; 48h</strong>
              <span>Target revisit screening cycle over urban periphery</span>
            </div>
            <div className="landing-problem-metric-card">
              <strong>10m</strong>
              <span>Spatial resolution across visible & NIR spectral bands</span>
            </div>
            <div className="landing-problem-metric-card">
              <strong>0.00–1.00</strong>
              <span>Calibrated confidence metric for field priority</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pipeline Section */}
      <section id="pipeline" className="landing-pipeline-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-eyebrow">Screening methodology</span>
            <h2>5-stage detection and routing pipeline</h2>
            <p>A closed loop from satellite acquisition to municipal field enforcement.</p>
          </div>

          <div className="landing-pipeline-row">
            <div className="landing-pipeline-card">
              <span className="landing-step-num font-mono">Step 01</span>
              <h3>Draw area of interest</h3>
              <p>User encloses an inspection sector on the interactive Leaflet map canvas up to 100 km².</p>
            </div>

            <div className="landing-pipeline-card">
              <span className="landing-step-num font-mono">Step 02</span>
              <h3>Pull satellite passes</h3>
              <p>The backend queries Copernicus Sentinel-2 L2A bottom-of-atmosphere reflectance scenes.</p>
            </div>

            <div className="landing-pipeline-card">
              <span className="landing-step-num font-mono">Step 03</span>
              <h3>Screen for extraction</h3>
              <p>Vision analysis evaluates reservoir reflectance, booster lines, and tanker loops.</p>
            </div>

            <div className="landing-pipeline-card">
              <span className="landing-step-num font-mono">Step 04</span>
              <h3>Cluster into hotspots</h3>
              <p>Spatial grouping consolidates repeat detections within ~300 meters into persistent records.</p>
            </div>

            <div className="landing-pipeline-card">
              <span className="landing-step-num font-mono">Step 05</span>
              <h3>Verify on the ground</h3>
              <p>Civic field teams visit on-site, upload geotagged photos, and update status from pending to verified.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Evidence Section */}
      <section id="evidence" className="landing-evidence-section">
        <div className="landing-container landing-evidence-grid">
          <div className="landing-evidence-copy">
            <span className="landing-eyebrow">Instrument readout</span>
            <h2>Evidence-based screening, not opaque guesses</h2>
            <p>
              Global Water Theft Detection & Monitoring never outputs a black-box accusation. The vision model breaks its screening into observable, verifiable physical indicators that ground teams can validate on site.
            </p>

            <ul className="landing-checklist">
              <li>
                <svg className="landing-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Usability flag screens out cloud cover, sensor blur, and nodata tiles</span>
              </li>
              <li>
                <svg className="landing-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Named physical signs list tangible structures and ground disturbance</span>
              </li>
              <li>
                <svg className="landing-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Strict numerical confidence (0.00–1.00) reflects evidence quality</span>
              </li>
              <li>
                <svg className="landing-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Zero legal conclusions, guilt labels, or ownership claims from imagery</span>
              </li>
            </ul>

            {/* Ground Inspection Documentary Photo */}
            <div className="landing-ground-truth-box">
              <img
                src="/images/ground-verification.jpg"
                alt="Documentary ground verification inspection of illegal hydrant booster pump manifold and water transport tanker"
                className="landing-ground-truth-img"
              />
              <div className="landing-ground-truth-caption">
                <span>Field audit: Case DET-2026-0921-KHI</span>
                <span className="text-[var(--success-dark)] font-semibold">Ground Truth Confirmed</span>
              </div>
            </div>
          </div>

          {/* Realistic Detection Card Mock */}
          <div className="landing-mock-card">
            <div className="landing-card-topbar">
              <div className="landing-card-title-group">
                <span className="font-mono text-[11px] text-[var(--primary)] font-semibold block">DET-2026-0921-KHI</span>
                <strong>Karachi East, Sector 11-A</strong>
                <span>Scanned area: 8.4 km²</span>
              </div>
              <span className="landing-badge-signal">Needs review</span>
            </div>

            <div className="landing-confidence-meter">
              <div className="landing-confidence-header">
                <span>Model Confidence</span>
                <strong className="text-[var(--success-dark)]">0.84 (High)</strong>
              </div>
              <div className="landing-confidence-bar-track">
                <div className="landing-confidence-bar-fill" />
              </div>
            </div>

            <div className="text-[11px] font-semibold text-[var(--ink-muted)] mb-2">
              Observable physical evidence
            </div>

            <ul className="landing-signs-list">
              <li>Uncovered rectangular storage reservoir not present in baseline imagery</li>
              <li>Recurring heavy tanker wheel ruts converging toward walled compound</li>
              <li>Localized surface moisture signature adjacent to high-pressure municipal main</li>
            </ul>

            <div className="landing-card-footer">
              <span>imageUsable: true</span>
              <span>24.9412° N, 67.0984° E</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Dashboard Preview Section */}
      <section id="dashboard-preview" className="landing-dashboard-section">
        <div className="landing-container landing-dashboard-grid">
          <div className="landing-mock-table">
            <div className="landing-mock-table-header">
              <div className="landing-filter-pills">
                <span className="landing-pill active">All (28)</span>
                <span className="landing-pill">Pending (12)</span>
                <span className="landing-pill">Verified (9)</span>
                <span className="landing-pill">Needs review (7)</span>
              </div>
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">CSV Export</span>
            </div>

            <div className="landing-mock-rows">
              <div className="landing-mock-row">
                <div className="landing-row-location">
                  <div className="relative w-9 h-9 rounded-[var(--radius-xs)] overflow-hidden border border-[var(--line-strong)] flex-shrink-0">
                    <img src="/images/satellite-detection.jpg" alt="Screening capture" className="w-full h-full object-cover" />
                    <span className="landing-status-dot signal absolute bottom-0.5 right-0.5 border border-white" />
                  </div>
                  <div>
                    <strong className="block text-[13px]">Sector 11-A, Gulzar-e-Hijri</strong>
                    <span className="font-mono text-[var(--ink-muted)] text-[11px]">24.9412° N, 67.0984° E</span>
                  </div>
                </div>
                <div className="font-mono text-right">
                  <strong className="text-[var(--signal-dark)] text-xs block">0.84 conf</strong>
                  <span className="text-[11px] text-[var(--ink-muted)] block">3 detections</span>
                </div>
              </div>

              <div className="landing-mock-row">
                <div className="landing-row-location">
                  <div className="relative w-9 h-9 rounded-[var(--radius-xs)] overflow-hidden border border-[var(--line-strong)] flex-shrink-0">
                    <img src="/images/satellite-detection.jpg" alt="Screening capture" className="w-full h-full object-cover" />
                    <span className="landing-status-dot success absolute bottom-0.5 right-0.5 border border-white" />
                  </div>
                  <div>
                    <strong className="block text-[13px]">Manghopir Industrial Arterial</strong>
                    <span className="font-mono text-[var(--ink-muted)] text-[11px]">24.9810° N, 67.0215° E</span>
                  </div>
                </div>
                <div className="font-mono text-right">
                  <strong className="text-[var(--success-dark)] text-xs block">0.91 conf</strong>
                  <span className="text-[11px] text-[var(--ink-muted)] block">Verified on site</span>
                </div>
              </div>

              <div className="landing-mock-row">
                <div className="landing-row-location">
                  <div className="relative w-9 h-9 rounded-[var(--radius-xs)] overflow-hidden border border-[var(--line-strong)] flex-shrink-0">
                    <img src="/images/satellite-detection.jpg" alt="Screening capture" className="w-full h-full object-cover" />
                    <span className="landing-status-dot danger absolute bottom-0.5 right-0.5 border border-white" />
                  </div>
                  <div>
                    <strong className="block text-[13px]">Surjani Town Sector 4-B</strong>
                    <span className="font-mono text-[var(--ink-muted)] text-[11px]">25.0210° N, 67.0541° E</span>
                  </div>
                </div>
                <div className="font-mono text-right">
                  <strong className="text-[var(--danger-dark)] text-xs block">0.76 conf</strong>
                  <span className="text-[11px] text-[var(--ink-muted)] block">Further audit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-dashboard-copy">
            <span className="landing-eyebrow">Operational triage</span>
            <h2 className="text-[26px] font-semibold font-[var(--font-display)] text-[var(--ink)] mb-3">
              Investigation queue for task forces
            </h2>
            <p className="text-sm mb-4 leading-relaxed text-[var(--ink-muted)]">
              Detections flow automatically into a centralized case list. Ground enforcement and water board inspectors can filter by jurisdiction, monitor spatial clusters, and export CSV dossiers for multi-agency field operations.
            </p>
            <div className="flex gap-3 mt-4">
              <Link to="/dashboard" className="landing-btn landing-btn-secondary">
                Explore investigation dashboard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA Band */}
      <section id="cta" className="landing-cta-section">
        <div className="landing-container">
          <div className="landing-cta-panel">
            <h2>Deploy proactive water screening in your municipality.</h2>
            <p>
              Connect Global Water Theft Detection & Monitoring to your regional coordinates and begin screening extraction-prone infrastructure sectors this week.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href="mailto:contact@watertheftdetection.org" className="landing-btn landing-btn-primary">
                Request a demo
              </a>
              <Link to="/screening" className="landing-btn landing-btn-secondary">
                Launch screening app
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Minimal Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div>
            <strong>Global Water Theft Detection & Monitoring</strong> · Civic remote-sensing infrastructure screening
          </div>
          <div>
            Multispectral imagery via European Space Agency Copernicus Open Access Hub (Sentinel-2 MSI).
          </div>
        </div>
      </footer>
    </div>
  )
}

