import { useState, useEffect } from 'react'

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        width: 1280,
        height: 800,
        orientation: 'landscape',
      }
    }

    const w = window.innerWidth
    const h = window.innerHeight
    return {
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      width: w,
      height: h,
      orientation: w >= h ? 'landscape' : 'portrait',
    }
  })

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setDeviceInfo({
        isMobile: w < 768,
        isTablet: w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        width: w,
        height: h,
        orientation: w >= h ? 'landscape' : 'portrait',
      })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return deviceInfo
}
