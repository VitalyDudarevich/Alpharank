"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getCroppedAvatarBlob } from "@/lib/crop-image";
import { validateAvatarFile } from "@/lib/avatar";
import { Button } from "@/components/ui/button";

type AvatarCropDialogProps = {
  imageSrc: string;
  onClose: () => void;
  onSave: (file: File) => void;
  saving?: boolean;
};

export function AvatarCropDialog({
  imageSrc,
  onClose,
  onSave,
  saving = false,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedArea || processing || saving) return;
    setProcessing(true);
    try {
      const blob = await getCroppedAvatarBlob(imageSrc, croppedArea);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const validation = validateAvatarFile(file);
      if (validation) {
        toast.error(validation);
        return;
      }
      onSave(file);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Не удалось обрезать фото"
      );
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3 sm:px-8">
          <h2 id="avatar-crop-title" className="font-semibold text-zinc-100">
            Настройка фото
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-[min(72vw,320px)] w-full bg-zinc-950">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-4 border-t border-zinc-800 px-6 py-4 sm:px-8">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Масштаб</span>
              <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy || zoom <= 1}
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                aria-label="Уменьшить"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                disabled={busy}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-2 min-w-0 flex-1 accent-violet-500"
                aria-label="Масштаб"
              />
              <button
                type="button"
                disabled={busy || zoom >= 3}
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                aria-label="Увеличить"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500">
              Перетащите фото · колёсико или ползунок — масштаб
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="w-full"
              disabled={busy || !croppedArea}
              onClick={handleSave}
            >
              {busy ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
