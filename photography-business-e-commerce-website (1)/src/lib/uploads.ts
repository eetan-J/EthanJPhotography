import path from "path";

/** Writable directory for customer-facing product images uploaded from the studio. */
export const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

export const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif",
};