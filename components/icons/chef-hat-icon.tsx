"use client"

interface IconProps {
  isActive: boolean
  isCurrent: boolean
}

export function ChefHatIcon({ isActive }: IconProps) {
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
      {/* Chef hat top (toque) */}
      <path d="M6 13.87A4 4 0 0 1 7.41 6.6a5.11 5.11 0 0 1 9.18 0A4 4 0 0 1 18 13.87V17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3.13z" />
      {/* Hat band */}
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  )
}
