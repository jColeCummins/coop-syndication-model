import React from 'react';
import { DealModel } from '@/utils/engine';
import { TrendingUp, AlertTriangle, OctagonAlert, Info } from 'lucide-react';

export function InsightsSection({ model }: { model: DealModel }) {
  return (
    <section className="flex flex-col space-y-4">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Structuring Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {model.insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  );
}

function InsightCard({ insight }: { insight: DealModel['insights'][0] }) {
  const { severity, title, body } = insight;

  let styles = '';
  let Icon = Info;

  switch (severity) {
    case 'positive':
      styles = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500';
      Icon = TrendingUp;
      break;
    case 'warning':
      styles = 'border-accent/30 bg-accent/5 text-accent';
      Icon = AlertTriangle;
      break;
    case 'critical':
      styles = 'border-destructive/30 bg-destructive/5 text-destructive';
      Icon = OctagonAlert;
      break;
    case 'info':
    default:
      styles = 'border-border bg-card text-foreground';
      Icon = Info;
      break;
  }

  return (
    <div className={`p-4 rounded-md border flex items-start space-x-3 ${styles}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex flex-col space-y-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider">{title}</h3>
        <p className="text-xs opacity-90 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}