"use client";

import React from "react";

export default function ConfirmDialog({
	open,
	title,
	description,
	confirmText = "确定",
	cancelText = "取消",
	onConfirm,
	onCancel,
	variant = "danger",
}: {
	open: boolean;
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	variant?: "danger" | "default";
}) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
			<div className="bg-[color:var(--background)] rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
				<div className="text-base font-semibold text-black dark:text-white mb-2">{title}</div>
				{description && <div className="text-sm text-black/70 dark:text-white/70 mb-4">{description}</div>}
				<div className="flex justify-end gap-2">
					<button onClick={onCancel} className="px-3 py-2 rounded-md bg-black/5 dark:bg-white/10 text-black dark:text-white">{cancelText}</button>
					<button
						onClick={onConfirm}
						className={
							"px-3 py-2 rounded-md " +
							(variant === "danger"
								? "bg-red-600 text-white hover:opacity-90"
								: "bg-black text-white dark:bg-white dark:text-black hover:opacity-90")
						}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
} 