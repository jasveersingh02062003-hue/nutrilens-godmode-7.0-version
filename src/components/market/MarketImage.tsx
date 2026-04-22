import { useState } from 'react';

interface MarketImageProps {
  itemId?: string;
  emoji: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

import { getFoodImage } from '@/lib/food-images';

const SIZE_MAP = {
  sm: 'w-9 h-9 rounded-lg',
  md: 'w-12 h-12 rounded-xl',
  lg: 'w-14 h-14 rounded-2xl',
};

const EMOJI_SIZE = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export default function MarketImage({ itemId, emoji, alt, size = 'md', className = '' }: MarketImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageUrl = itemId ? getFoodImage(itemId) : null;

  if (!imageUrl || error) {
    return (
      <div className={`${SIZE_MAP[size]} bg-muted flex items-center justify-center ${className}`}>
        <span className={EMOJI_SIZE[size]}>{emoji}</span>
      </div>
    );
  }

  return (
    <div className={`${SIZE_MAP[size]} overflow-hidden bg-muted flex-shrink-0 ${className}`}>
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={size === 'sm' ? 36 : size === 'md' ? 48 : 56}
        height={size === 'sm' ? 36 : size === 'md' ? 48 : 56}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
