/**
 * Safe wrapper around window.localStorage to protect against QuotaExceededError
 * and restricted browser environments (private browsing, sandboxed iframes).
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value)
    } catch (err: any) {
      console.warn(`[safeLocalStorage] Failed to set key "${key}", attempting cache cleanup:`, err)
      try {
        // Clear heavy non-critical caches to free up quota
        localStorage.removeItem('amped_safety_draft')
        localStorage.removeItem('amped_cached_offline_queue')
        
        // Attempt set again
        localStorage.setItem(key, value)
      } catch (retryErr) {
        console.error(`[safeLocalStorage] Storage quota exhausted. Unable to persist key "${key}".`, retryErr)
      }
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch {}
  },

  clear: (): void => {
    try {
      localStorage.clear()
    } catch {}
  }
}
