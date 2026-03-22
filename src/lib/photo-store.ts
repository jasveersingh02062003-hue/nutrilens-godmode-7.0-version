// ==========================================
// NutriLens AI – Progress Photos Storage
// Uses localStorage with base64 data URLs.
// Photos are stored privately, never uploaded.
// ==========================================

import type { ProgressPhoto } from './store';

const PHOTOS_KEY = 'nutrilens_progress_photos';

function getAllPhotos(): ProgressPhoto[] {
  const data = localStorage.getItem(PHOTOS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveAllPhotos(photos: ProgressPhoto[]) {
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
}

export function getProgressPhotos(): ProgressPhoto[] {
  return getAllPhotos().sort((a, b) => b.date.localeCompare(a.date));
}

export function getProgressPhotosByDate(date: string): ProgressPhoto[] {
  return getAllPhotos().filter(p => p.date === date);
}

export function addProgressPhoto(photo: ProgressPhoto) {
  const photos = getAllPhotos();
  photos.push(photo);
  saveAllPhotos(photos);
}

export function deleteProgressPhoto(id: string) {
  const photos = getAllPhotos().filter(p => p.id !== id);
  saveAllPhotos(photos);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
