"use client";

import Cropper from "react-easy-crop";
import { useCallback, useMemo, useState } from "react";

function getCroppedImg(imageSrc: string, crop: { x: number; y: number }, zoom: number, aspect: number): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const image = new Image();
      image.src = imageSrc;
      await image.decode();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));

      const naturalW = image.naturalWidth;
      const naturalH = image.naturalHeight;

      const cropPx = {
        x: (crop.x * naturalW) / 100,
        y: (crop.y * naturalH) / 100,
        w: (100 / zoom) * (naturalW / 100),
        h: (100 / zoom) * (naturalH / 100),
      };

      // Target 3:4 cover
      const targetW = 900; const targetH = 1200;
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(
        image,
        cropPx.x, cropPx.y, cropPx.w, cropPx.h,
        0, 0, targetW, targetH
      );
      canvas.toBlob((b) => {
        if (!b) reject(new Error("no blob")); else resolve(b);
      }, "image/jpeg", 0.9);
    } catch (e) { reject(e); }
  });
}

export default function CropDialog({ image, onCancel, onConfirm }: { image: string; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const aspect = useMemo(() => 3 / 4, []);

  const confirm = useCallback(async () => {
    const blob = await getCroppedImg(image, { x: crop.x, y: crop.y }, zoom, aspect);
    onConfirm(blob);
  }, [image, crop, zoom, aspect, onConfirm]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-[color:var(--background)] rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="relative h-[60vh]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            cropShape="rect"
            objectFit="contain"
            showGrid={false}
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-3 border-t border-black/10 dark:border-white/10">
          <button onClick={onCancel} className="px-3 py-2 rounded-md bg-black/5 dark:bg-white/10">取消</button>
          <button onClick={confirm} className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">确定</button>
        </div>
      </div>
    </div>
  );
} 