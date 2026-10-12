/**
 * Sharing helpers for generated images.
 * - shareImage: opens the native share sheet (WhatsApp, Instagram, etc.)
 * - downloadImage: saves the file locally
 */

function toFile(blob: Blob, filename = 'minha-leitura.png'): File {
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

/** True when the device/browser can share files (mobile share sheet). */
export function canShareFile(): boolean {
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
  if (typeof navigator.share !== 'function') return false
  try {
    return nav.canShare?.({ files: [toFile(new Blob())] }) ?? false
  } catch {
    return false
  }
}

/** Opens the native share sheet with the image. Returns false if unsupported. */
export async function shareImage(
  blob: Blob,
  filename = 'minha-leitura.png',
  text = 'Minha leitura!',
): Promise<boolean> {
  const file = toFile(blob, filename)
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
  if (typeof navigator.share !== 'function') return false
  try {
    if (nav.canShare && !nav.canShare({ files: [file] })) return false
    await navigator.share({ files: [file], text })
    return true
  } catch {
    return false
  }
}

/** Saves the image to the device. */
export function downloadImage(blob: Blob, filename = 'minha-leitura.png'): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Back-compat: share if possible, otherwise download. */
export async function shareCard(blob: Blob, filename = 'minha-leitura.png', text = 'Minha leitura!'): Promise<'shared' | 'downloaded'> {
  const shared = await shareImage(blob, filename, text)
  if (shared) return 'shared'
  downloadImage(blob, filename)
  return 'downloaded'
}
