import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env, r2Configured } from '../env.js';

/** S3 client pointed at Cloudflare R2. Lazily created; only used when configured. */
let client: S3Client | null = null;
function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/** Namespaced key keeps every family's photos isolated. */
export function photoKeyFor(familyId: string, personId: string): string {
  return `families/${familyId}/people/${personId}/${randomUUID()}.webp`;
}

export async function presignPutUrl(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2(), cmd, { expiresIn: 60 });
}

export async function presignGetUrl(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key });
  return getSignedUrl(r2(), cmd, { expiresIn: 60 * 10 });
}

export { r2Configured };
