import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function FormSkeleton() {
  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Title skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>
        
        {/* Form fields skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-11 w-full bg-white/10 rounded-xl" />
            </div>
          ))}
        </div>
        
        {/* Button skeleton */}
        <Skeleton className="h-12 w-full bg-white/10 rounded-xl" />
      </CardContent>
    </Card>
  )
}

