import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-1 ring-ring rounded-full w-3.5 h-3.5 ml-1.5 align-text-bottom">
          <Info className="w-3 h-3" />
          <span className="sr-only">More info</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-[11px] font-sans bg-zinc-800 text-zinc-100 border border-zinc-700 leading-relaxed shadow-xl">
        {text}
      </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
