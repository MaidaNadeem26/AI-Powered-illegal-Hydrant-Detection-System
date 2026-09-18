interface Props {
  satellite: boolean
  onToggle: (value: boolean) => void
}

export default function LayerToggle({ satellite, onToggle }: Props) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
      <button
        onClick={() => onToggle(false)}
        className={`px-3 py-1 text-xs font-medium rounded-[5px] transition-colors ${
          !satellite ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Street
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`px-3 py-1 text-xs font-medium rounded-[5px] transition-colors ${
          satellite ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Satellite
      </button>
    </div>
  )
}