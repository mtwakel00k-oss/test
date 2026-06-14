
interface IconProps {
  isActive: boolean
  isCurrent: boolean
}

export function ServingIcon({ isActive, isCurrent }: IconProps) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={isActive ? "text-primary-foreground" : "text-muted-foreground"}
    >
      {/* Cloche/dome */}
      <path 
        d="M3 14h18" 
        className={isCurrent ? "animate-bounce" : ""}
        style={{ animationDuration: "2s" }}
      />
      <path d="M4 14c0-5.5 3.5-9 8-9s8 3.5 8 9" />
      {/* Handle */}
      <path d="M12 5V3" />
      <circle cx="12" cy="2.5" r="0.5" fill="currentColor" />
      {/* Plate base */}
      <path d="M2 14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2" />
      {/* Plate bottom */}
      <path d="M6 16v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}
