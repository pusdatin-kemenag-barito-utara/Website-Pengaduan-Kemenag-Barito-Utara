import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT_URL = process.env.R2_ENDPOINT_URL;
const R2_BUCKET_NAME = process.env.R2_BUCKET_PENGADUAN || "data-pengaduan";

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT_URL || "",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadToR2(file: File, path: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: path,
    Body: buffer,
    ContentType: file.type || "application/octet-stream",
  });

  await s3Client.send(command);
  return `r2:${path}`;
}

export async function deleteFromR2(path: string) {
  const key = path.replace(/^r2:/, "");
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  return true;
}

export async function getR2SignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
  if (!path) return "";
  const key = path.replace(/^r2:/, "");
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export function isR2Path(path?: string | null): boolean {
  return !!path && path.startsWith("r2:");
}
