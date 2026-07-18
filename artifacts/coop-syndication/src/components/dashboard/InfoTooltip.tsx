import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 ring-ring rounded-full w-5 h-5 ml-1.5 align-text-bottom">
          <Info className="w-4 h-4" />
          <span className="sr-only">More info</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[360px] text-[14px] font-sans bg-zinc-800 text-zinc-50 border border-zinc-600 leading-relaxed shadow-xl p-3">
        {text}
      </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
