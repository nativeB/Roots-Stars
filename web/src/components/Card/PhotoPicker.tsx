import { useEffect, useRef, useState } from 'react';
import { compressForUpload } from '../../lib/imageCompress';

interface PhotoPickerProps {
  /** existing remote photo URL (presigned), if the person already has one */
  initialUrl?: string | null;
  /** emoji/initial fallback shown when there's no photo */
  fallback: string;
  size?: number;
  /** called with a compressed WebP blob when the user picks/changes a photo */
  onPick: (blob: Blob) => void;
  /** called when the user removes the photo */
  onRemove?: () => void;
  busy?: boolean;
}

/**
 * A tappable avatar that lets a relative add a face. Compresses on pick and
 * shows an instant local preview — no waiting on the upload to see it. Works
 * before the person exists (the parent decides when/whether to upload the blob).
 */
export function PhotoPicker({
  initialUrl,
  fallback,
  size = 88,
  onPick,
  onRemove,
  busy,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [working, setWorking] = useState(false);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    setPreview(initialUrl ?? null);
  }, [initialUrl]);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setWorking(true);
    try {
      const blob = await compressForUpload(file);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setPreview(objectUrl.current);
      onPick(blob);
    } finally {
      setWorking(false);
    }
  }

  const showSpinner = working || busy;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/[0.04] transition hover:border-glow-gold/60"
        style={{ width: size, height: size }}
        aria-label={preview ? 'Change photo' : 'Add a photo'}
        data-testid="photo-picker"
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255,208,138,0.22), rgba(255,208,138,0.04))',
            }}
            aria-hidden
          >
            {fallback}
          </span>
        )}
        {/* hover/empty hint */}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-starlight transition ${
            preview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
        >
          {showSpinner ? '…' : preview ? 'Change' : '＋ Photo'}
        </span>
      </button>

      {preview && onRemove && (
        <button
          type="button"
          onClick={() => {
            if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
            objectUrl.current = null;
            setPreview(null);
            onRemove();
          }}
          className="text-xs text-muted underline hover:text-starlight"
        >
          Remove
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFile}
        className="hidden"
        data-testid="photo-input"
      />
    </div>
  );
}
