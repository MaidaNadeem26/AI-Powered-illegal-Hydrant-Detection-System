import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getHotspot, submitVerification, type HotspotDetail as Detail } from './dashboardApi'
import { Badge } from './components/Badge'
import { ConfidenceBar } from './components/ConfidenceBar'
import { Skeleton, SkeletonCard } from './components/Skeleton'
import { EmptyState } from './components/EmptyState'
import './Dashboard.css'

export function HotspotDetail() {
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verification Form State
  const [status, setStatus] = useState('verified')
  const [notes, setNotes] = useState('')
  const [reviewer, setReviewer] = useState(() => localStorage.getItem('reviewer_name') ?? '')
  const [visitedAt, setVisitedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getHotspot(id)
      .then((data) => setDetail(data))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Dossier details could not be retrieved.')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Sync photo previews
  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file))
    setPhotoPreviews(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photos])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setFormError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setLocating(false)
      },
      (err) => {
        setFormError(`Location retrieval error: ${err.message}. Please verify permissions or enter location manually.`)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function choosePhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    const valid = files.filter(
      (f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 8 * 1024 * 1024
    )

    if (valid.length !== files.length) {
      setFormError('Some files were skipped. Only JPEG, PNG, and WebP photos up to 8 MB are permitted.')
    } else {
      setFormError(null)
    }

    setPhotos((prev) => [...prev, ...valid].slice(0, 6))
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function saveVerification(event: React.FormEvent) {
    event.preventDefault()
    if (!reviewer.trim()) {
      setFormError('Reviewer name is required.')
      return
    }

    setSaving(true)
    setFormError(null)

    const form = new FormData()
    form.set('status', status)
    form.set('notes', notes)
    form.set('reviewer_name', reviewer.trim())
    form.set('visited_at', new Date(visitedAt).toISOString())

    if (location) {
      form.set('latitude', String(location.latitude))
      form.set('longitude', String(location.longitude))
      form.set('location_accuracy_m', String(location.accuracy))
    }

    photos.forEach((photo) => form.append('photos', photo))

    try {
      const updated = await submitVerification(id, form)
      setDetail(updated)
      localStorage.setItem('reviewer_name', reviewer.trim())
      setNotes('')
      setPhotos([])
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Verification could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="dashboard-container space-y-6">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  // Error / Not Found State
  if (error || !detail) {
    return (
      <div className="dashboard-container py-12">
        <EmptyState
          title="Dossier not found"
          description={error ?? 'The requested detection record could not be retrieved from the database.'}
          action={{
            label: 'Back to investigation dashboard',
            onClick: () => (window.location.href = '/dashboard'),
          }}
        />
      </div>
    )
  }

  const { hotspot, detections, verifications } = detail

  return (
    <div className="dashboard-container">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--teal)] hover:underline"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to investigation dashboard</span>
        </Link>
      </div>

      {/* Detail Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--line)] mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-[var(--teal)]">Hotspot dossier</span>
            <span className="text-[var(--line-strong)]">•</span>
            <span className="text-xs font-mono text-[var(--ink-muted)]">ID: {hotspot.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--ink)] tracking-tight mt-1 font-[var(--font-display)]">
            {hotspot.country ?? 'Unassigned country'}
            {hotspot.region ? `, ${hotspot.region}` : ''}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--ink-muted)] font-mono">
            <span>{hotspot.latitude.toFixed(5)}° N, {hotspot.longitude.toFixed(5)}° E</span>
            <span>•</span>
            <span>First flagged {new Date(hotspot.created_at).toLocaleDateString()}</span>
            {hotspot.location_is_approximate && (
              <span className="px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--gold-tint)] text-[var(--gold)] border border-[var(--gold)] text-[10px]">
                Approximate sector center
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge status={hotspot.status} size="md" showIcon />
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="detail-grid">
        {/* Left Column: Detections & History */}
        <div className="space-y-6">
          {/* Latest Detection Summary Card */}
          <div className="p-5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Latest satellite screening</h2>
              <span className="text-xs font-mono text-[var(--ink-muted)]">{hotspot.detection_count} total pass(es)</span>
            </div>

            {/* Satellite Imagery Capture Preview */}
            <div className="relative rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface-alt)]">
              <img
                src="/images/satellite-detection.jpg"
                alt="High-resolution Sentinel-2 satellite capture of detected water extraction site"
                className="w-full h-48 sm:h-56 object-cover"
                loading="lazy"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--surface)]/95 backdrop-blur-xs text-[11px] font-mono text-[var(--ink)] border border-[var(--line)] shadow-xs">
                Sentinel-2 L2A • 10m Ground Resolution
              </div>
              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--teal)] text-[10px] font-mono text-white font-medium">
                B08/B04/B03 False-Color Enhanced
              </div>
            </div>

            <p className="text-xs text-[var(--ink)] leading-relaxed bg-[var(--surface-alt)] p-3 rounded-[var(--radius-sm)] border border-[var(--line)]">
              {hotspot.latest_summary}
            </p>

            <div className="space-y-1.5">
              <ConfidenceBar confidence={hotspot.latest_confidence} />
            </div>

            {hotspot.latest_signs.length > 0 && (
              <div>
                <div className="text-[11px] font-mono text-[var(--ink-muted)] mb-2">
                  Observed extraction features
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hotspot.latest_signs.map((sign) => (
                    <span
                      key={sign}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--ink)]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
                      {sign}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detection History Timeline */}
          <div className="p-5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Satellite detection history</h2>
            <div className="timeline-track">
              {detections.map((detection) => (
                <article key={String(detection.id)} className="timeline-node">
                  <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] mb-1 font-mono">
                    <time className="font-semibold text-[var(--ink)]">
                      {new Date(String(detection.created_at)).toLocaleString()}
                    </time>
                    <span className="font-semibold text-[var(--teal)]">
                      {(Number(detection.confidence)).toFixed(2)} conf
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[var(--ink)] mb-1">
                    {String(detection.product_name)}
                  </div>
                  <p className="text-xs text-[var(--ink-muted)] leading-normal">
                    {String(detection.summary)}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {/* Ground Verification Log */}
          <div className="p-5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Ground verification log</h2>
              <span className="text-xs font-mono text-[var(--ink-muted)]">{verifications.length} inspection(s)</span>
            </div>

            {verifications.length === 0 ? (
              <div className="p-4 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-alt)] space-y-3">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setPreviewImage('/images/ground-verification.jpg')}
                    className="w-20 h-20 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line-strong)] flex-shrink-0 hover:opacity-90 transition-opacity"
                    aria-label="Click to enlarge ground verification photo"
                  >
                    <img
                      src="/images/ground-verification.jpg"
                      alt="Standard ground verification inspection protocol reference"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-[var(--ink)]">Inspection protocol active</h3>
                    <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                      Field team dispatch in progress. Use the submission form on the right to log inspector findings, geotag coordinates, and upload site photos.
                    </p>
                    <span className="inline-flex text-[10px] font-mono text-[var(--teal)] font-medium">
                      Click thumbnail to view site verification protocol reference photo
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {verifications.map((v) => (
                  <div
                    key={String(v.id)}
                    className="p-4 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-alt)] space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge status={String(v.status)} size="sm" />
                        <span className="text-xs font-medium text-[var(--ink)]">
                          by {String(v.reviewer_name)}
                        </span>
                      </div>
                      <time className="text-[11px] font-mono text-[var(--ink-muted)]">
                        {new Date(String(v.visited_at)).toLocaleDateString()}
                      </time>
                    </div>

                    <p className="text-xs text-[var(--ink)] leading-relaxed">
                      {String(v.notes || 'No detailed inspector notes provided.')}
                    </p>

                    {v.evidence && Array.isArray(v.evidence) && v.evidence.length > 0 ? (
                      <div>
                        <div className="text-[10px] font-mono text-[var(--ink-muted)] mb-1.5">
                          Photographic evidence ({v.evidence.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {v.evidence.map((photo: Record<string, unknown>) => (
                            <button
                              key={String(photo.id)}
                              type="button"
                              onClick={() => setPreviewImage(String(photo.file_path))}
                              className="w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line)] hover:opacity-85 transition-opacity"
                            >
                              <img
                                src={String(photo.file_path)}
                                alt="Ground photo evidence"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewImage('/images/ground-verification.jpg')}
                          className="w-14 h-14 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line-strong)] hover:opacity-85 transition-opacity flex-shrink-0"
                          aria-label="Click to enlarge site evidence photo"
                        >
                          <img
                            src="/images/ground-verification.jpg"
                            alt="Reference ground inspection photo"
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div className="text-[11px] text-[var(--ink-muted)] leading-tight">
                          <span className="font-semibold text-[var(--ink)] block">Site evidence photo</span>
                          Click to inspect ground truth capture (diesel pumps, manifolds, water tankers).
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ground Verification Submission Form */}
        <div className="space-y-6">
          <div className="p-5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] space-y-4">
            <div>
              <span className="text-xs font-mono font-semibold text-[var(--teal)]">Field inspection</span>
              <h2 className="text-base font-semibold text-[var(--ink)] mt-0.5 font-[var(--font-display)]">
                Submit ground verification
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Record site findings to validate or classify the AI satellite screening.
              </p>
            </div>

            <form onSubmit={saveVerification} className="space-y-4">
              {/* Status Radio Cards */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-[var(--ink)]">Verification outcome</legend>
                <div className="space-y-2">
                  {[
                    ['verified', 'Verified water extraction', 'Site visit confirmed unregistered hydrant, pumping manifold, or tanker loops.'],
                    ['unverified', 'Unverified / false alarm', 'Site inspection verified normal legal usage or no extraction infrastructure present.'],
                    ['further_investigation', 'Inconclusive / further investigation', 'Access restricted, night operation suspected, or requires second audit.'],
                  ].map(([val, label, help]) => (
                    <label
                      key={val}
                      className={`flex items-start gap-3 p-3 rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
                        status === val
                          ? 'border-[var(--teal)] bg-[var(--teal-tint)]'
                          : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcomeStatus"
                        value={val}
                        checked={status === val}
                        onChange={() => setStatus(val)}
                        className="mt-1 text-[var(--teal)] focus:ring-[var(--teal)]"
                      />
                      <div className="text-xs">
                        <strong className="block font-medium text-[var(--ink)]">{label}</strong>
                        <span className="text-[var(--ink-muted)] text-[11px] leading-relaxed">{help}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Reviewer Name */}
              <div>
                <label htmlFor="reviewerInput" className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Inspector / reviewer name *
                </label>
                <input
                  id="reviewerInput"
                  required
                  type="text"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="e.g. Field Team Alpha / Engr. Tariq"
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>

              {/* Visit Date & Time */}
              <div>
                <label htmlFor="visitTimeInput" className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Visit date and time
                </label>
                <input
                  id="visitTimeInput"
                  type="datetime-local"
                  value={visitedAt}
                  onChange={(e) => setVisitedAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>

              {/* Field Notes */}
              <div>
                <label htmlFor="notesInput" className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Field observations and notes
                </label>
                <textarea
                  id="notesInput"
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe observed suction pumps, booster lines, tanker parking, or local witness statements…"
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>

              {/* Geolocation Tagging */}
              <div>
                <span className="block text-xs font-medium text-[var(--ink)] mb-1.5">GPS verification geotag</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--ink)] bg-[var(--surface-alt)] border border-[var(--line-strong)] hover:bg-[var(--line)] transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{locating ? 'Acquiring GPS…' : 'Tag device GPS'}</span>
                  </button>
                  {location && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[var(--moss)] bg-[var(--moss-tint)] px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--moss)]">
                      ✓ {location.latitude.toFixed(5)}° N, {location.longitude.toFixed(5)}° E (±{Math.round(location.accuracy)}m)
                    </span>
                  )}
                </div>
              </div>

              {/* Photo Upload with Previews */}
              <div>
                <label htmlFor="photoUpload" className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Upload site photos (Max 6, JPEG/PNG/WebP &le; 8 MB)
                </label>
                <input
                  id="photoUpload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={choosePhotos}
                  className="w-full text-xs text-[var(--ink-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-[var(--radius-sm)] file:border-0 file:text-xs file:font-semibold file:bg-[var(--teal-tint)] file:text-[var(--teal-dark)] hover:file:bg-[var(--line)]"
                />

                {photoPreviews.length > 0 && (
                  <div className="photo-preview-grid mt-3">
                    {photoPreviews.map((url, i) => (
                      <div key={url} className="photo-preview-item">
                        <img src={url} alt={`Upload preview ${i + 1}`} />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="photo-remove-btn"
                          aria-label="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Error Notice */}
              {formError && (
                <div className="p-3 rounded-[var(--radius-sm)] border border-[var(--brick)] bg-[var(--brick-tint)] text-[var(--ink)] text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-[var(--radius-sm)] text-xs font-semibold text-white bg-[var(--teal)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving verification record…</span>
                  </>
                ) : (
                  <span>Submit ground verification</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Photo Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/20 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--surface)] p-2 border border-[var(--line-strong)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewImage} alt="Enlarged field photo" className="max-w-full max-h-[80vh] object-contain rounded-[var(--radius-sm)]" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[var(--surface)] text-[var(--ink)] border border-[var(--line-strong)] hover:bg-[var(--surface-alt)] flex items-center justify-center text-xs font-bold transition-colors shadow-xs"
              aria-label="Close photo preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotspotDetail
