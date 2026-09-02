import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export interface GeoCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number | null
  speed?: number | null
  heading?: number | null
  timestamp?: number
}

export interface TravelBillingParams {
  distanceKm: number
  travelTimeMinutes?: number
  ratePerKm?: number
  hourlyRate?: number
}

export interface TravelBillingResult {
  distanceKm: number
  travelTimeMinutes: number
  mileageCost: number
  laborTravelCost: number
  totalTravelCharge: number
}

/**
 * Calculates straight-line or road-factor distance between two GPS coordinates using the Haversine formula.
 * Includes an empirical road winding factor (~1.22x) for real-world driving approximations when routing API is offline.
 */
export function calculateHaversineDistanceKm(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number },
  applyRoadFactor = true
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180

  const lat1 = (coord1.latitude * Math.PI) / 180
  const lat2 = (coord2.latitude * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightDistance = R * c

  // Standard urban/suburban driving route factor
  return applyRoadFactor ? straightDistance * 1.22 : straightDistance
}

/**
 * Calculates client travel billing charges given distance, time, and rate parameters.
 */
export function calculateTravelBilling({
  distanceKm,
  travelTimeMinutes = 0,
  ratePerKm = 0.95, // Standard NZ/AU mileage rate default
  hourlyRate = 85.0, // Standard electrician hourly charge-out rate default
}: TravelBillingParams): TravelBillingResult {
  const safeDistance = Math.max(0, distanceKm)
  const safeMinutes = Math.max(0, travelTimeMinutes)

  const mileageCost = Math.round(safeDistance * ratePerKm * 100) / 100
  const laborTravelCost = Math.round((safeMinutes / 60) * hourlyRate * 100) / 100
  const totalTravelCharge = Math.round((mileageCost + laborTravelCost) * 100) / 100

  return {
    distanceKm: safeDistance,
    travelTimeMinutes: safeMinutes,
    mileageCost,
    laborTravelCost,
    totalTravelCharge,
  }
}

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<GeoCoordinates | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [isTracking, setIsTracking] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined' && !Capacitor.isNativePlatform()) {
      setIsSupported(false)
      setError('Geolocation is not supported on this platform.')
    }
  }, [])

  /**
   * Retrieves current GPS position with promise resolution and custom options.
   * Uses native Capacitor Geolocation on Android/iOS and HTML5 Geolocation in browser.
   */
  const getCurrentLocation = useCallback(
    async (options?: PositionOptions): Promise<GeoCoordinates> => {
      setLoading(true)
      setError(null)

      try {
        if (Capacitor.isNativePlatform()) {
          // Check/Request native mobile permissions
          const perm = await Geolocation.checkPermissions()
          if (perm.location !== 'granted') {
            const requested = await Geolocation.requestPermissions()
            if (requested.location !== 'granted') {
              throw new Error('Location permission was denied on this device.')
            }
          }

          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
          })

          const coords: GeoCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
          }
          setCoordinates(coords)
          setLoading(false)
          return coords
        }

        // Browser fallback
        return await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            const errMsg = 'Geolocation is not supported on this browser.'
            setError(errMsg)
            reject(new Error(errMsg))
            return
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords: GeoCoordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                speed: pos.coords.speed,
                heading: pos.coords.heading,
                timestamp: pos.timestamp,
              }
              setCoordinates(coords)
              setLoading(false)
              resolve(coords)
            },
            (err) => {
              let message = 'Failed to acquire GPS location.'
              if (err.code === err.PERMISSION_DENIED) {
                message = 'Location access denied. Please allow location permissions in your settings.'
              } else if (err.code === err.POSITION_UNAVAILABLE) {
                message = 'GPS position unavailable. Ensure location services are enabled.'
              } else if (err.code === err.TIMEOUT) {
                message = 'Location request timed out. Retrying with lower accuracy...'
              }
              setError(message)
              setLoading(false)
              reject(new Error(message))
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 30000,
              ...options,
            }
          )
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to acquire GPS coordinates'
        setError(message)
        setLoading(false)
        throw err
      }
    },
    []
  )

  /**
   * Starts real-time watch position tracking
   */
  const startTracking = useCallback(
    (onUpdate?: (coords: GeoCoordinates) => void, options?: PositionOptions) => {
      setIsTracking(true)

      if (Capacitor.isNativePlatform()) {
        let watchCallbackId: string | null = null
        Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          },
          (pos, err) => {
            if (err) {
              setError(err.message)
              return
            }
            if (pos) {
              const coords: GeoCoordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                speed: pos.coords.speed,
                heading: pos.coords.heading,
                timestamp: pos.timestamp,
              }
              setCoordinates(coords)
              onUpdate?.(coords)
            }
          }
        ).then((id) => {
          watchCallbackId = id
        })

        return () => {
          if (watchCallbackId) {
            Geolocation.clearWatch({ id: watchCallbackId })
          }
          setIsTracking(false)
        }
      }

      if (!navigator.geolocation) return () => {}

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: GeoCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
          }
          setCoordinates(coords)
          onUpdate?.(coords)
        },
        (err) => {
          setError(err.message)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          ...options,
        }
      )

      return () => {
        navigator.geolocation.clearWatch(watchId)
        setIsTracking(false)
      }
    },
    []
  )

  return {
    coordinates,
    error,
    isSupported,
    loading,
    isTracking,
    getCurrentLocation,
    startTracking,
    calculateDistance: calculateHaversineDistanceKm,
    calculateBilling: calculateTravelBilling,
  }
}
