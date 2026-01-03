import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Image skeleton */}
              <Skeleton className="w-full h-48 rounded-lg bg-white/10" />
              
              {/* Title skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 bg-white/10" />
                <Skeleton className="h-4 w-1/2 bg-white/10" />
              </div>
              
              {/* Details skeleton */}
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
              </div>
              
              {/* Price skeleton */}
              <Skeleton className="h-6 w-24 bg-white/10" />
              
              {/* Button skeleton */}
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

