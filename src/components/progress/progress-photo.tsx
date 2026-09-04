import { cn } from "@/lib/utils";
import type { ProgressPhoto } from "@/types";

interface ProgressPhotoProps {
  photos: ProgressPhoto[];
  className?: string;
}

export default function ProgressPhotoComparison({ photos, className }: ProgressPhotoProps) {
  const grouped = photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    const date = new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(p);
    return acc;
  }, {});

  return (
    <div className={cn("space-y-4", className)}>
      {Object.entries(grouped).map(([date, datePhotos]) => (
        <div key={date} className="rounded-2xl border border-border/50 bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">{date}</h3>
          <div className="grid grid-cols-3 gap-4">
            {["front", "side", "back"].map((type) => {
              const photo = datePhotos.find((p) => p.type === type);
              return (
                <div key={type} className="aspect-[3/4] rounded-xl bg-muted flex flex-col items-center justify-center text-muted-foreground overflow-hidden">
                  {photo ? (
                    <div className="w-full h-full bg-gradient-to-b from-muted to-muted/50 flex items-center justify-center">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ) : (
                    <>
                      <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs capitalize">{type}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
