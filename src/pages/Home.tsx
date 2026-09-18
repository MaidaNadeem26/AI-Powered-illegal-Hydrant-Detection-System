import MapView from '../components/map/MapView'
import { hotspots } from '../data/hotspots'

function Home() {
  return (
    <main className="h-screen w-screen flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C9 6 6 10 6 14a6 6 0 0 0 12 0c0-4-3-8-6-12Z"
                fill="white"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">
              AI Hydrant Detection System
            </h1>
            <p className="text-xs text-slate-400 leading-tight">
              Mapping and monitoring hydrant locations
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-slate-300">
            {hotspots.length} locations tracked
          </span>
        </div>
      </header>

      <div className="flex-1 relative">
        <MapView />
      </div>
    </main>
  )
}

export default Home