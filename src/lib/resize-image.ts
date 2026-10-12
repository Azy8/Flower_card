// ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด: ไฟล์เล็กลง โหลดเร็วบนมือถือลูกค้า
// และตัดข้อมูล EXIF (เช่น พิกัด GPS) ออกไปด้วย เพราะวาดใหม่ผ่าน canvas

const MAX_SIDE = 1600;

export async function resizeImage(
  file: File
): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNSUPPORTED");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));

  // บางเบราว์เซอร์ (Safari รุ่นเก่า) ไม่รองรับ WebP → ใช้ JPEG แทน
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };

  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("ENCODE_FAILED");
  return { blob: jpeg, ext: "jpg" };
}
