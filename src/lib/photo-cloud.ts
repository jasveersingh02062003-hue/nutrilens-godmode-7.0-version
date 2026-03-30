// ============================================
// NutriLens AI – Cloud Photo Service
// Compress + upload progress photos to storage bucket
// ============================================

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'meal-photos';
const MAX_WIDTH = 800;
const JPEG_QUALITY = 0.6;
const MAX_SIZE_KB = 80;

/**
 * Compress image data URL to ~80KB JPEG using Canvas API.
 * Resizes to max 800px width, adjusts quality iteratively.
 */
export async function compressImage(dataUrl: string, maxSizeKB: number = MAX_SIZE_KB): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down if wider than MAX_WIDTH
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));

      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under maxSizeKB
      let quality = JPEG_QUALITY;
      let result = canvas.toDataURL('image/jpeg', quality);

      for (let i = 0; i < 5; i++) {
        const sizeKB = Math.round((result.length * 3) / 4 / 1024);
        if (sizeKB <= maxSizeKB || quality <= 0.2) break;
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

/**
 * Convert a data URL to a Blob for uploading.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteStr = atob(parts[1]);
  const ab = new ArrayBuffer(byteStr.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
  return new Blob([ab], { type: mime });
}

/**
 * Upload a compressed photo to the meal-photos bucket.
 * Path: {userId}/{photoId}.jpg
 */
export async function uploadPhoto(
  dataUrl: string,
  userId: string,
  photoId: string
): Promise<string | null> {
  try {
    const compressed = await compressImage(dataUrl);
    const blob = dataUrlToBlob(compressed);
    const path = `${userId}/${photoId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Photo upload failed:', error);
      return null;
    }

    return path;
  } catch (e) {
    console.error('Photo upload error:', e);
    return null;
  }
}

/**
 * Get the public URL for a stored photo.
 */
export function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a photo from the bucket.
 */
export async function deleteCloudPhoto(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error('Photo delete failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Photo delete error:', e);
    return false;
  }
}
