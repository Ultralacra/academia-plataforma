import { Skeleton } from "@/components/ui/skeleton";

export function StudentChatSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-64" />
      </div>

      <div className="p-3 flex-1 min-h-0 relative">
        <div className="flex flex-col md:grid md:grid-cols-12 gap-3 h-full min-h-0">
          {/* Sidebar Skeleton */}
          <div className="w-full md:col-span-3 border border-border rounded p-3 bg-card space-y-4 h-full">
            {/* Search */}
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </div>

            {/* Filter text */}
            <Skeleton className="h-3 w-24" />

            {/* Coaches List */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>

            {/* Conversations List */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-8" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area Skeleton */}
          <div className="hidden md:flex md:col-span-9 border border-border rounded-lg p-4 flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-border pb-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-hidden">
              <div className="flex justify-start">
                <Skeleton className="h-12 w-64 rounded-lg" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-12 w-64 rounded-lg" />
              </div>
              <div className="flex justify-start">
                <Skeleton className="h-20 w-80 rounded-lg" />
              </div>
            </div>

            {/* Input Area */}
            <div className="mt-4 pt-3 border-t border-border flex gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
