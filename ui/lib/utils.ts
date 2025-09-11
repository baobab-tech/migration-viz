import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Convert partial dates (YYYY-MM) to full dates (YYYY-MM-01)
 * Since monthly data is stored with 1st day of month
 */
export function normalizeDate(dateStr: string, isEndDate= false): string {
  if (!dateStr) return dateStr

  // If already a full date (YYYY-MM-DD), return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr
  }

  // If partial date (YYYY-MM), add -01 for first day of month
  if (dateStr.match(/^\d{4}-\d{2}$/)) {
      // For end dates, go to last day of month
      const lastDay = new Date(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1]), 0).getDate();

      return `${dateStr}-${isEndDate ? lastDay : '01'}`
  }

  // Return as-is for other formats
  return dateStr
}