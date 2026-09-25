// Reads an image file and resolves to just the base64 payload (no "data:image/...;base64," prefix),
// matching the backend's `<field>: base64` contract for selfieImage / proofOfAddressImage.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Phone photos are several MB (12MP+), far more than ID/face checks or the
// backend's request limit need. Downscales to `maxDimension` and re-encodes as
// JPEG; falls back to the untouched file if the browser can't decode it.
export async function compressImageToBase64(
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToBase64(file);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return dataUrl.split(",")[1];
  } catch {
    return fileToBase64(file);
  }
}
