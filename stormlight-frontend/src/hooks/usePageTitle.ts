import { useEffect } from 'react'

/**
 * Custom hook to set the browser tab title dynamically
 * @param title - The page-specific title (will be formatted as "Stormlight | {title}")
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = `Stormlight | ${title}`
    
    // Restore previous title on unmount (optional, for cleanup)
    return () => {
      document.title = previousTitle
    }
  }, [title])
}
