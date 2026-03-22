import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, X, Plus, Trash2, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { addProgressPhoto, getProgressPhotos, deleteProgressPhoto, fileToDataUrl } from '@/lib/photo-store';
import { watermarkImage } from '@/lib/photo-watermark';
import { getTodayKey } from '@/lib/store';
import type { ProgressPhoto } from '@/lib/store';
import { toast } from 'sonner';

interface Props {
  refreshKey?: number;
  onChanged?: () => void;
}

export default function ProgressPhotosSection({ refreshKey, onChanged }: Props) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>(() => getProgressPhotos());
  const [showCapture, setShowCapture] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<ProgressPhoto | null>(null);
  const [captureType, setCaptureType] = useState<ProgressPhoto['type']>('front');
  const [caption, setCaption] = useState('');
  const [captureDate, setCaptureDate] = useState(getTodayKey());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showGalleryWarning, setShowGalleryWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const refreshPhotos = () => {
    setPhotos(getProgressPhotos());
    onChanged?.();
  };

  const handleFileSelect = async (file: File, verified: boolean) => {
    setProcessing(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const watermarked = await watermarkImage(dataUrl, { verified, timestamp: new Date() });
      setPreviewUrl(watermarked);
      setIsVerified(verified);
      setShowCapture(true);
    } catch {
      toast.error('Failed to process photo');
    }
    setProcessing(false);
  };

  const handleSavePhoto = () => {
    if (!previewUrl) return;
    const photo: ProgressPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      dataUrl: previewUrl,
      type: captureType,
      caption: `${caption}${isVerified ? '' : ' [unverified]'}`.trim(),
      date: captureDate,
    };
    addProgressPhoto(photo);
    toast.success(isVerified ? 'Verified photo saved!' : 'Photo saved (unverified)');
    resetCapture();
    refreshPhotos();
  };

  const handleDelete = (id: string) => {
    deleteProgressPhoto(id);
    setViewPhoto(null);
    toast.success('Photo deleted');
    refreshPhotos();
  };

  const resetCapture = () => {
    setShowCapture(false);
    setPreviewUrl(null);
    setIsVerified(false);
    setCaption('');
    setCaptureType('front');
    setCaptureDate(getTodayKey());
    setShowGalleryWarning(false);
  };

  const handleGalleryClick = () => {
    setShowGalleryWarning(true);
  };

  const typeChips: Array<{ value: ProgressPhoto['type']; label: string; emoji: string }> = [
    { value: 'front', label: 'Front', emoji: '🧍' },
    { value: 'side', label: 'Side', emoji: '🧍‍♂️' },
    { value: 'back', label: 'Back', emoji: '🔙' },
    { value: 'other', label: 'Other', emoji: '📷' },
  ];

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Progress Photos</h3>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="h-8 px-3 rounded-lg bg-primary/10 flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-primary">Live</span>
          </button>
          <button
            onClick={handleGalleryClick}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file, true);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file, false);
          e.target.value = '';
        }}
      />

      {/* Gallery warning */}
      <AnimatePresence>
        {showGalleryWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground leading-relaxed">
                  <strong>Live photos recommended.</strong> Gallery uploads will be marked as "unverified" since they may not reflect your current progress.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowGalleryWarning(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 py-2 rounded-lg bg-muted text-[10px] font-semibold text-foreground"
                >
                  Upload anyway
                </button>
                <button
                  onClick={() => {
                    setShowGalleryWarning(false);
                    cameraInputRef.current?.click();
                  }}
                  className="flex-1 py-2 rounded-lg bg-primary text-[10px] font-bold text-primary-foreground"
                >
                  Take Live Photo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="text-center py-6">
          <Camera className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No photos yet</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Take a live photo to start your transformation diary</p>
          <div className="flex gap-2 justify-center mt-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold flex items-center gap-1"
            >
              <Camera className="w-3 h-3" /> Take Live Photo
            </button>
            <button
              onClick={handleGalleryClick}
              className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold flex items-center gap-1"
            >
              <ImageIcon className="w-3 h-3" /> Gallery
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.slice(0, 9).map(photo => {
            const verified = !photo.caption?.includes('[unverified]');
            return (
              <button
                key={photo.id}
                onClick={() => setViewPhoto(photo)}
                className="aspect-square rounded-xl overflow-hidden relative group"
              >
                <img src={photo.dataUrl} alt={photo.caption || photo.type} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
                {/* Verified badge */}
                <span className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                  verified ? 'bg-primary/80' : 'bg-accent/80'
                }`}>
                  {verified ? (
                    <ShieldCheck className="w-2.5 h-2.5 text-primary-foreground" />
                  ) : (
                    <ShieldAlert className="w-2.5 h-2.5 text-accent-foreground" />
                  )}
                </span>
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-foreground/60 text-[8px] font-bold text-background capitalize">
                  {photo.type}
                </span>
              </button>
            );
          })}
          {/* Add more button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/30 transition-colors"
          >
            <Camera className="w-4 h-4 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">Live</span>
          </button>
        </div>
      )}

      {/* Capture sheet */}
      <AnimatePresence>
        {showCapture && previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={resetCapture}
          >
            <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-lg"
              onClick={e => e.stopPropagation()}
              style={{ maxHeight: '85vh' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-bold text-sm text-foreground">Add Progress Photo</h3>
                <button onClick={resetCapture} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                {/* Preview with watermark */}
                <div className="rounded-2xl overflow-hidden aspect-[3/4] max-h-48 mx-auto relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    isVerified ? 'bg-primary/80 text-primary-foreground' : 'bg-accent/80 text-accent-foreground'
                  }`}>
                    {isVerified ? '✓ Verified' : '⚠ Unverified'}
                  </div>
                </div>

                {/* View type */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">View type</p>
                  <div className="flex gap-1.5">
                    {typeChips.map(chip => (
                      <button
                        key={chip.value}
                        onClick={() => setCaptureType(chip.value)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-semibold transition-colors ${
                          captureType === chip.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {chip.emoji} {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Caption (optional)</p>
                  <input
                    type="text"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="e.g., Week 4 progress"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Date */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Date</p>
                  <input
                    type="date"
                    value={captureDate}
                    onChange={e => setCaptureDate(e.target.value)}
                    max={getTodayKey()}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  onClick={handleSavePhoto}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-fab active:scale-[0.98] transition-transform"
                >
                  Save Photo {isVerified ? '✓' : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen photo viewer */}
      <AnimatePresence>
        {viewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90"
            onClick={() => setViewPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-lg mx-4"
              onClick={e => e.stopPropagation()}
            >
              <img src={viewPhoto.dataUrl} alt={viewPhoto.caption || viewPhoto.type} className="w-full rounded-2xl" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent rounded-b-2xl">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded bg-primary/80 text-primary-foreground text-[10px] font-bold capitalize">
                        {viewPhoto.type}
                      </span>
                      {!viewPhoto.caption?.includes('[unverified]') ? (
                        <span className="px-2 py-0.5 rounded bg-primary/60 text-primary-foreground text-[10px] font-bold">✓ Verified</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-accent/60 text-accent-foreground text-[10px] font-bold">⚠ Unverified</span>
                      )}
                    </div>
                    {viewPhoto.caption && (
                      <p className="text-sm text-background mt-1">{viewPhoto.caption.replace(' [unverified]', '')}</p>
                    )}
                    <p className="text-[10px] text-background/60 mt-0.5">{viewPhoto.date}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(viewPhoto.id)}
                    className="w-10 h-10 rounded-xl bg-destructive/80 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-destructive-foreground" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setViewPhoto(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-foreground/50 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-background" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
