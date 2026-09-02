import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { App as CapApp } from '@capacitor/app'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Initializes native mobile capabilities (Dark Status Bar, Splash Screen, Android Hardware Back Button, and Org URL redirection).
 */
export function useMobileInit() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // 1. Style status bar to match dark theme
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    StatusBar.setBackgroundColor({ color: '#121417' }).catch(() => {})

    // 2. Hide splash screen gracefully once React has mounted
    SplashScreen.hide().catch(() => {})

    // 3. If running inside local app container and user has a configured Organization URL, connect directly
    if (window.location.hostname === 'localhost') {
      const savedOrgUrl = localStorage.getItem('amped_org_url')
      if (savedOrgUrl && (savedOrgUrl.startsWith('https://') || savedOrgUrl.startsWith('http://'))) {
        window.location.href = savedOrgUrl
        return
      }
    }

    // 4. Handle Android hardware back button
    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (
        location.pathname === '/dashboard' ||
        location.pathname === '/' ||
        location.pathname === '/login' ||
        location.pathname === '/app/dashboard'
      ) {
        CapApp.exitApp()
      } else if (canGoBack) {
        navigate(-1)
      } else {
        navigate('/dashboard')
      }
    })

    return () => {
      backListener.then((sub) => sub.remove()).catch(() => {})
    }
  }, [navigate, location.pathname])
}
