export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-lg shadow-primary/30">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
          <path d="M5 2v20" />
          <path d="M9 2v20" />
          <path d="M18 2a3 3 0 0 0-3 3v6h3" />
          <path d="M18 11v11" />
        </svg>
      </span>
      <span className="text-xl font-extrabold tracking-tight text-foreground">
        Resto<span className="text-primary">OS</span>
      </span>
    </div>
  )
}
