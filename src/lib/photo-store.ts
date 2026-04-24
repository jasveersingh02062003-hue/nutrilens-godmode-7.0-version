import { scopedGet, scopedSet } from "@/lib/scoped-storage";
import { safeJsonParse } from "@/lib/safe-json";
// ==========================================
// NutriLens AI – Progress Photos Storage
// Cloud-first: uploads to storage bucket, stores URL locally.
// Falls back to base64 if user is not authenticated.
// ==========================================

import type { ProgressPhoto } from './store';
import { uploadPhoto, deleteCloudPhoto, getPhotoUrl, compressImage } from './photo-cloud';
import { supabase } from '@/integrations/supabase/client';

const PHOTOS_KEY = 'nutrilens_progress_photos';

function getAllPhotos(): ProgressPhoto[] {
  const data = scopedGet(PHOTOS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveAllPhotos(photos: ProgressPhoto[]) {
  scopedSet(PHOTOS_KEY, JSON.stringify(photos));
}

export function getProgressPhotos(): ProgressPhoto[] {
  return getAllPhotos().sort((a, b) => b.date.localeCompare(a.date));
}

export function getProgressPhotosByDate(date: string): ProgressPhoto[] {
  return getAllPhotos().filter(p => p.date === date);
}

/**
 * Add a progress photo. Compresses and uploads to cloud if authenticated,
 * otherwise stores compressed base64 locally.
 */
export async function addProgressPhoto(photo: ProgressPhoto): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Cloud path: compress + upload, store signed URL
    const cloudPath = await uploadPhoto(photo.dataUrl, session.user.id, photo.id);
    if (cloudPath) {
      const signed = await getPhotoUrl(cloudPath);
      photo.dataUrl = signed ?? await compressImage(photo.dataUrl);
      (photo as any).cloudPath = cloudPath;
    } else {
      // Fallback: compress and store locally
      photo.dataUrl = await compressImage(photo.dataUrl);
    }
  } else {
    // No auth: compress and store locally
    photo.dataUrl = await compressImage(photo.dataUrl);
  }

  const photos = getAllPhotos();
  photos.push(photo);
  saveAllPhotos(photos);
}

/**
 * Delete a progress photo. Also removes from cloud bucket if it has a cloud path.
 */
export async function deleteProgressPhoto(id: string): Promise<void> {
  const photos = getAllPhotos();
  const photo = photos.find(p => p.id === id);

  if (photo && (photo as any).cloudPath) {
    await deleteCloudPhoto((photo as any).cloudPath);
  }

  saveAllPhotos(photos.filter(p => p.id !== id));
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result as string);
        resolve(compressed);
      } catch {
        resolve(reader.result as string);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
