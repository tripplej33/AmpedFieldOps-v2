import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/**
 * Captures a high-resolution photo using the native device camera (on iOS/Android)
 * or returns null if not running on native platform.
 */
export async function captureNativePhoto(customFileName?: string): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) {
    return null
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: false,
    })

    if (!image.webPath) {
      return null
    }

    // Convert webPath / blob URL to standard JavaScript File object
    const response = await fetch(image.webPath)
    const blob = await response.blob()
    const filename = customFileName || `photo_${Date.now()}.${image.format || 'jpg'}`
    const file = new File([blob], filename, { type: blob.type || `image/${image.format || 'jpeg'}` })
    return file
  } catch (err) {
    if (err instanceof Error && (err.message.includes('User cancelled') || err.message.includes('cancelled'))) {
      return null
    }
    console.error('[captureNativePhoto] Error:', err)
    throw err
  }
}
