import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  if (value === 0) return "$0";
  const formatted = Math.abs(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return value < 0 ? `-${formatted}` : formatted;
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + "%";
}

// For editable percent INPUTS: show the typed precision (up to 2 decimals,
// trailing zeros trimmed) so a value like 6.35% doesn't display as 6.3%.
// Computed outputs keep formatPercent's fixed 1-decimal form.
export function formatPercentInput(value: number): string {
  return (Math.round(value * 100) / 100).toString() + "%";
}
