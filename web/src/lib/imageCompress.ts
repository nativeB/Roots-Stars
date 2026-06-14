import imageCompression from 'browser-image-compression';

/**
 * Phones produce huge images. Downscale + re-encode to WebP before upload so
 * R2 stays light and the sky loads fast. EXIF orientation is handled by the lib.
 */
export async function compressForUpload(file: File): Promise<Blob> {
  return imageCompression(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 0.3,
    useWebWorker: true,
    fileType: 'image/webp',
  });
}
