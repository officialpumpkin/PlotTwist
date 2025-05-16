import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimpleCardProps {
  title: string;
  description: string;
  status: "Your Turn" | "Waiting" | "Active" | "Completed";
  stats?: {
    contributors?: number;
    segments?: number;
    maxSegments?: number;
  };
  onContinue?: () => void;
  onPrint?: () => void;
  onJoin?: () => void;
}

export default function SimpleCard({
  title,
  description,
  status,
  stats,
  onContinue,
  onPrint,
  onJoin
}: SimpleCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
      {/* Color bar */}
      <div className={cn(
        "h-2 rounded-t-xl",
        status === "Your Turn" && "bg-primary",
        status === "Waiting" && "bg-neutral-400",
        status === "Active" && "bg-secondary",
        status === "Completed" && "bg-accent"
      )}></div>
      
      {/* Card content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg">{title}</h3>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full whitespace-nowrap",
            status === "Your Turn" && "bg-primary/10 text-primary",
            status === "Waiting" && "bg-neutral-100 text-neutral-600",
            status === "Active" && "bg-secondary/10 text-secondary",
            status === "Completed" && "bg-accent/10 text-accent"
          )}>
            {status}
          </span>
        </div>
        
        {/* Description */}
        <p className="text-neutral-600 text-sm mb-4">{description}</p>
        
        {/* Stats */}
        {stats && (
          <div className="flex items-center text-xs text-neutral-500 mt-3 mb-4">
            {stats.contributors !== undefined && (
              <>
                <span>{stats.contributors} contributors</span>
                <span className="mx-2">•</span>
              </>
            )}
            {stats.segments !== undefined && stats.maxSegments !== undefined && (
              <span>{stats.segments}/{stats.maxSegments} segments</span>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end space-x-2 mt-4">
          {status === "Your Turn" && onContinue && (
            <Button size="sm" onClick={onContinue}>Continue</Button>
          )}
          
          {status === "Waiting" && (
            <Button size="sm" variant="outline" className="text-neutral-500 cursor-not-allowed">
              Waiting
            </Button>
          )}
          
          {status === "Completed" && onPrint && (
            <>
              <Button size="sm" variant="outline">Read</Button>
              <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={onPrint}>Print</Button>
            </>
          )}
          
          {onJoin && (
            <Button 
              size="sm" 
              className={status === "Completed" ? "bg-accent hover:bg-accent/90" : "bg-secondary hover:bg-secondary/90"}
              onClick={onJoin}
            >
              Join Story
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}