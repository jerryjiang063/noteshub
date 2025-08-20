"use client";

import Cropper from "react-easy-crop";
import { useCallback, useMemo, useState } from "react";

type Area = { x: number; y: number; width: number; height: number };

async function getCroppedBlob(imageSrc: string, area: Area, targetW: number, targetH: number): Promise<Blob> {
	const image = new Image();
	image.src = imageSrc;
	await image.decode();
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("no ctx");
	canvas.width = targetW;
	canvas.height = targetH;
	ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, targetW, targetH);
	return await new Promise((resolve, reject) => {
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/jpeg", 0.9);
	});
}

export default function CropDialog({ image, onCancel, onConfirm }: { image: string; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [areaPx, setAreaPx] = useState<Area | null>(null);
	const aspect = useMemo(() => 3 / 4, []);

	const onComplete = useCallback((_area: any, areaPixels: Area) => {
		setAreaPx(areaPixels);
	}, []);

	const confirm = useCallback(async () => {
		if (!areaPx) return;
		const blob = await getCroppedBlob(image, areaPx, 900, 1200);
		onConfirm(blob);
	}, [image, areaPx, onConfirm]);

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
						onCropComplete={onComplete}
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