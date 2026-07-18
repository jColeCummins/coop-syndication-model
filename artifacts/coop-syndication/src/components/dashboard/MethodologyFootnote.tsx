import React from 'react';
import { METHODOLOGY } from '@/utils/calculations';

export function MethodologyFootnote() {
  return (
    <div className="pt-8 border-t border-border mt-8">
      <div className="text-[13px] text-muted-foreground leading-relaxed max-w-4xl space-y-3 pb-8">
        <p className="uppercase tracking-widest font-semibold text-zinc-500 mb-1">Methodology & Assumptions</p>
        {METHODOLOGY.map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>
    </div>
  );
}