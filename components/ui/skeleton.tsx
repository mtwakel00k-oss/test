import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-premium-pulse rounded-2xl bg-muted/60 dark:bg-muted/20 border border-border/5',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
