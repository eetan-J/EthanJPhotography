import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { UPLOAD_DIR } from "@/lib/uploads";
import path from "path";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No image received." }, { status: 400 });
    const ext = TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "Please use a JPG, PNG, WebP or AVIF image." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is larger than 8MB. Please use a smaller file." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
    return NextResponse.json({ url: `/api/media/${filename}` });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}