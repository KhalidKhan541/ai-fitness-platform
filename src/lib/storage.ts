import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join, extname } from "path";

export interface StorageOptions {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

export interface ImageSize {
  width: number;
  height: number;
  label: string;
}

const IMAGE_SIZES: ImageSize[] = [
  { width: 150, height: 150, label: "thumbnail" },
  { width: 400, height: 400, label: "small" },
  { width: 800, height: 800, label: "medium" },
  { width: 1200, height: 1200, label: "large" },
];

const LOCAL_STORAGE_PATH = join(process.cwd(), "public", "uploads");
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function ensureLocalStorageDir(): void {
  if (!existsSync(LOCAL_STORAGE_PATH)) {
    mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
  }
}

function generateStorageKey(
  userId: string,
  filename: string,
  folder: string = "photos"
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = extname(filename).toLowerCase();
  return `${folder}/${userId}/${timestamp}-${random}${ext}`;
}

function getContentType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

export function validateImage(file: { type: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

export async function uploadToLocal(
  buffer: Buffer,
  userId: string,
  filename: string,
  folder: string = "photos"
): Promise<UploadResult> {
  ensureLocalStorageDir();
  const key = generateStorageKey(userId, filename, folder);
  const filePath = join(LOCAL_STORAGE_PATH, key);
  const dir = join(LOCAL_STORAGE_PATH, folder, userId);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, buffer);

  return {
    url: `/uploads/${key}`,
    key,
    bucket: "local",
    size: buffer.length,
    contentType: getContentType(filename),
  };
}

export async function deleteLocal(key: string): Promise<boolean> {
  try {
    const filePath = join(LOCAL_STORAGE_PATH, key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getLocalFile(key: string): Buffer | null {
  try {
    const filePath = join(LOCAL_STORAGE_PATH, key);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath);
  } catch {
    return null;
  }
}

export async function uploadToS3(
  buffer: Buffer,
  userId: string,
  filename: string,
  folder: string = "photos"
): Promise<UploadResult> {
  const key = generateStorageKey(userId, filename, folder);
  const bucket = process.env.S3_BUCKET || "aifitness-uploads";
  const contentType = getContentType(filename);

  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const baseUrl = process.env.CLOUDFRONT_URL || `https://${bucket}.s3.amazonaws.com`;
    return {
      url: `${baseUrl}/${key}`,
      key,
      bucket,
      size: buffer.length,
      contentType,
    };
  } catch {
    return uploadToLocal(buffer, userId, filename, folder);
  }
}

export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET || "aifitness-uploads",
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function getImageSizes(): ImageSize[] {
  return [...IMAGE_SIZES];
}

export function generateImageUrl(
  key: string,
  size?: "thumbnail" | "small" | "medium" | "large"
): string {
  if (size) {
    const sizeConfig = IMAGE_SIZES.find((s) => s.label === size);
    if (sizeConfig) {
      return `/api/images/resize?key=${encodeURIComponent(key)}&w=${sizeConfig.width}&h=${sizeConfig.height}`;
    }
  }

  if (key.startsWith("http")) return key;
  return `/uploads/${key}`;
}

export function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): string {
  const bucket = process.env.S3_BUCKET || "aifitness-uploads";
  return `https://${bucket}.s3.amazonaws.com/${key}?X-Amz-Expires=${expiresIn}`;
}

export async function generateSignedUploadUrl(
  userId: string,
  filename: string,
  folder: string = "photos",
  expiresIn: number = 300
): Promise<{ uploadUrl: string; key: string }> {
  const key = generateStorageKey(userId, filename, folder);
  const bucket = process.env.S3_BUCKET || "aifitness-uploads";

  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: getContentType(filename),
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return { uploadUrl, key };
  } catch {
    return {
      uploadUrl: `/api/upload?key=${encodeURIComponent(key)}`,
      key,
    };
  }
}

export async function batchDelete(keys: string[]): Promise<{
  deleted: string[];
  failed: string[];
}> {
  const deleted: string[] = [];
  const failed: string[] = [];

  for (const key of keys) {
    const success = key.startsWith("http")
      ? await deleteFromS3(key)
      : await deleteLocal(key);

    if (success) {
      deleted.push(key);
    } else {
      failed.push(key);
    }
  }

  return { deleted, failed };
}

export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  byFolder: Record<string, { count: number; size: number }>;
}> {
  const { readdirSync, statSync } = await import("fs");
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    byFolder: {} as Record<string, { count: number; size: number }>,
  };

  try {
    const walkDir = (dir: string) => {
      if (!existsSync(dir)) return;
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          stats.totalFiles++;
          stats.totalSize += stat.size;
          const folder = fullPath.replace(LOCAL_STORAGE_PATH, "").split("/")[1] || "other";
          if (!stats.byFolder[folder]) {
            stats.byFolder[folder] = { count: 0, size: 0 };
          }
          stats.byFolder[folder].count++;
          stats.byFolder[folder].size += stat.size;
        }
      }
    };

    walkDir(LOCAL_STORAGE_PATH);
  } catch {
    // directory doesn't exist yet
  }

  return stats;
}
