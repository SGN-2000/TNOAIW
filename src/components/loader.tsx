import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
