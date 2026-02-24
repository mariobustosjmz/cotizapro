import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-800/60', className)}
      {...props}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0F1117] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16 mt-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function QuoteRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-l-[3px] border-l-slate-700 rounded-r-lg bg-slate-800/20">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-[#0F1117] p-5 space-y-3">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <QuoteRowSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
