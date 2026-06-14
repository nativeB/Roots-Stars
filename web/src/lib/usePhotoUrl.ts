import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * Fetch a short-lived presigned GET URL for a person's photo. Returns null when
 * the person has no photo or storage isn't configured. Lazy + per-person.
 */
export function usePhotoUrl(personId: string | null, hasPhoto: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!personId || !hasPhoto) return;
    void api
      .photoUrl(personId)
      .then((r) => {
        if (!cancelled) setUrl(r.url);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [personId, hasPhoto]);

  return url;
}
