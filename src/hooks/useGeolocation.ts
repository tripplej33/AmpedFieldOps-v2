import { useState, useEffect, useCallback } from 'react'

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
  ratePerKm = 0.95, // Default NZ IRD / standard vehicle reimbursement rate per km
  hourlyRate = 85.0, // Default technician hourly travel rate
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
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsSupported(false)
      setError('Geolocation is not supported by your device or browser.')
    }
  }, [])

  /**
   * Retrieves current GPS position with promise resolution and custom options.
   */
  const getCurrentLocation = useCallback(
    (options?: PositionOptions): Promise<GeoCoordinates> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          const errMsg = 'Geolocation is not supported on this device.'
          setError(errMsg)
          reject(new Error(errMsg))
          return
        }

        setLoading(true)
        setError(null)

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
              message = 'Location access denied. Please allow location permissions in your browser.'
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
    },
    []
  )

  /**
   * Starts real-time watch position tracking
   */
  const startTracking = useCallback(
    (onUpdate?: (coords: GeoCoordinates) => void, options?: PositionOptions) => {
      if (!navigator.geolocation) return () => {}

      setIsTracking(true)
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
