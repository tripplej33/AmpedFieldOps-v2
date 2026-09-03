/**
 * Date and timezone helper utilities for local calendar scheduling.
 * Ensures consistent handling in all timezones (e.g. UTC+12 NZDT/NZST, UTC-8, etc.)
 */

export function getLocalTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatLocalDate(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return ''
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatLocalTime(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return ''
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function getLocalDayBounds(dateStr: string): { startDate: string; endDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d, 23, 59, 59, 999)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

export function createLocalIsoString(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  const dateObj = new Date(y, m - 1, d, hours || 0, minutes || 0, 0, 0)
  return dateObj.toISOString()
}
