// Image-upload composable for admin. Posts a single image file to
// /api/admin/upload/image and resolves with its signed URL. Used by the
// RichTextEditor image button and by the featured/OG image fields on
// the page editor. Reports progress via the optional `onProgress`
// callback for a nicer UX.

export interface UploadResponse {
  url: string
  key: string
  filename: string
}

export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/admin/upload/image')
    xhr.responseType = 'json'

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as UploadResponse)
      } else {
        const msg = xhr.response?.statusMessage || xhr.response?.message || `Upload failed (${xhr.status})`
        reject(new Error(msg))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))

    xhr.send(formData)
  })
}

export function useImageUpload() {
  const uploading = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  async function upload(file: File): Promise<UploadResponse> {
    uploading.value = true
    progress.value = 0
    error.value = null
    try {
      return await uploadImage(file, p => (progress.value = p))
    } catch (e: any) {
      error.value = e?.message || 'Upload failed'
      throw e
    } finally {
      uploading.value = false
    }
  }

  return { upload, uploading, progress, error }
}
