import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StoredObject {
  url: string;
  pathname: string;
}

export interface ListedObject extends StoredObject {
  size: number;
  uploadedAt?: Date;
  etag?: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set in the environment.`);
  return value;
}

export function readR2Config() {
  return {
    accountId: required("R2_ACCOUNT_ID"),
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    bucket: required("R2_BUCKET"),
    publicBaseUrl: required("R2_PUBLIC_BASE_URL").replace(/\/$/, ""),
  };
}

let cachedClient: S3Client | undefined;
export function r2Client(): S3Client {
  if (cachedClient) return cachedClient;
  const config = readR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function publicObjectUrl(key: string): string {
  return `${readR2Config().publicBaseUrl}/${encodeKey(key)}`;
}

export function objectKeyFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const base = new URL(`${readR2Config().publicBaseUrl}/`);
    if (parsed.origin !== base.origin) return null;
    const basePath = base.pathname.replace(/\/$/, "");
    if (!parsed.pathname.startsWith(`${basePath}/`)) return null;
    return parsed.pathname
      .slice(basePath.length + 1)
      .split("/")
      .map(decodeURIComponent)
      .join("/");
  } catch {
    return null;
  }
}

export async function putBinary(
  pathname: string,
  data: Uint8Array,
  options: { allowOverwrite?: boolean } = {},
): Promise<StoredObject> {
  const { bucket } = readR2Config();
  if (options.allowOverwrite === false) {
    try {
      await r2Client().send(new HeadObjectCommand({ Bucket: bucket, Key: pathname }));
      throw new Error(`Object already exists: ${pathname}`);
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status !== 404 && status !== 403) throw error;
    }
  }
  await r2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: pathname,
    Body: data,
    ContentType: "application/octet-stream",
  }));
  return { url: publicObjectUrl(pathname), pathname };
}

export async function copyBinary(
  fromUrl: string,
  toPathname: string,
): Promise<StoredObject> {
  const config = readR2Config();
  const sourceKey = objectKeyFromPublicUrl(fromUrl);
  if (!sourceKey) throw new Error("Source URL is not an object in the configured R2 bucket.");
  await r2Client().send(new CopyObjectCommand({
    Bucket: config.bucket,
    Key: toPathname,
    CopySource: `${config.bucket}/${encodeKey(sourceKey)}`,
    ContentType: "application/octet-stream",
    MetadataDirective: "REPLACE",
  }));
  return { url: publicObjectUrl(toPathname), pathname: toPathname };
}

export async function deleteBinary(url: string): Promise<void> {
  const key = objectKeyFromPublicUrl(url);
  if (!key) throw new Error("URL is not an object in the configured R2 bucket.");
  const { bucket } = readR2Config();
  await r2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createUploadUrl(
  pathname: string,
  expiresIn = 900,
): Promise<{ uploadUrl: string; objectUrl: string }> {
  const { bucket } = readR2Config();
  const uploadUrl = await getSignedUrl(
    r2Client(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: pathname,
      ContentType: "application/octet-stream",
    }),
    { expiresIn },
  );
  return { uploadUrl, objectUrl: publicObjectUrl(pathname) };
}

export async function listObjects(prefix: string): Promise<ListedObject[]> {
  const { bucket } = readR2Config();
  const objects: ListedObject[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await r2Client().send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const item of page.Contents ?? []) {
      if (!item.Key) continue;
      objects.push({
        pathname: item.Key,
        url: publicObjectUrl(item.Key),
        size: item.Size ?? 0,
        uploadedAt: item.LastModified,
        etag: item.ETag,
      });
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

export async function deleteObjectsByPrefix(prefix: string): Promise<number> {
  const config = readR2Config();
  let total = 0;
  for (;;) {
    const page = await r2Client().send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix,
      MaxKeys: 1000,
    }));
    const keys = (page.Contents ?? []).flatMap((item) =>
      item.Key ? [{ Key: item.Key }] : [],
    );
    if (keys.length === 0) return total;
    await r2Client().send(new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: { Objects: keys, Quiet: true },
    }));
    total += keys.length;
  }
}
