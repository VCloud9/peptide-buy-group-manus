// Preconfigured storage helpers for Manus WebDev templates
import { getSupabaseAdmin } from "./supabase";

const DEFAULT_BUCKET = "coa-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

function getBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const fileBody = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const { error } = await getSupabaseAdmin()
    .storage
    .from(getBucketName())
    .upload(key, fileBody, { contentType, upsert: false });

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  return { key, url: storageReference(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: storageReference(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(getBucketName())
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(`Supabase Storage signed URL failed: ${error?.message || "empty response"}`);
  }
  return data.signedUrl;
}

export async function storageDelete(relKey: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .storage
    .from(getBucketName())
    .remove([normalizeKey(relKey)]);
  if (error) throw new Error(`Supabase Storage delete failed: ${error.message}`);
}

export function storageReference(relKey: string) {
  return `supabase-storage://${getBucketName()}/${normalizeKey(relKey)}`;
}
