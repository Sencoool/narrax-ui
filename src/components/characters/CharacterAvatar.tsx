import { useEffect, useState } from 'react';
import { characterService } from '../../services/characterService';

interface CharacterAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
}

export function CharacterAvatar({ name, imageUrl, size = 36 }: CharacterAvatarProps) {
  const [loaded, setLoaded] = useState<{ path: string; blobUrl: string } | null>(null);

  useEffect(() => {
    if (!imageUrl) return;
    let active = true;
    let blobUrl: string | null = null;
    characterService.getImage(imageUrl)
      .then((blob) => {
        if (!active) return;
        blobUrl = URL.createObjectURL(blob);
        setLoaded({ path: imageUrl, blobUrl });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [imageUrl]);

  const src = imageUrl && loaded?.path === imageUrl ? loaded.blobUrl : null;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        background: 'var(--color-blue-600)',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.42,
      }}
    >
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.charAt(0).toUpperCase()}
    </div>
  );
}
