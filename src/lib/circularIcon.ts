/**
 * Creates a circular PNG from an image URL (data URL or http).
 * Returns { dataUrl, arrayBuffer } for favicon and Tauri setIcon.
 */
export async function createCircularIcon(
  src: string,
  size: number = 64
): Promise<{ dataUrl: string; arrayBuffer: ArrayBuffer }> {
  const img = new Image();
  if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context unavailable");

  // Ensure transparent background, then clip to circle and draw
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ctx.restore();

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
  );
  const arrayBuffer = await blob.arrayBuffer();
  return { dataUrl, arrayBuffer };
}
