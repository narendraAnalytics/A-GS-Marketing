"use client";

import { useEffect, useRef, useState } from "react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // LinkedIn recommends images under 5MB

interface ImagePickerProps {
  imageUrl: string | null;
  uploadState: "idle" | "uploading" | "success" | "error";
  onSelect: (file: File) => void;
  onRemove: () => void;
  disabled: boolean;
}

export function ImagePicker({ imageUrl, uploadState, onSelect, onRemove, disabled }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be under 5MB (LinkedIn's recommended limit).");
      return;
    }
    setError(null);
    onSelect(file);
  };

  if (imageUrl) {
    return (
      <div className="relative overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
        {/* 4:5 portrait — current LinkedIn guidance: takes up more of the
            mobile feed than 1.91:1 landscape, compounds reach faster when
            used consistently (e.g. 1080x1350) */}
        <div className="aspect-[4/5] w-full bg-zinc-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview URL, next/image's optimizer doesn't apply here */}
          <img src={imageUrl} alt="Post attachment preview" className="h-full w-full object-cover" />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white hover:bg-black/80 disabled:opacity-50"
        >
          Remove
        </button>
        {uploadState === "uploading" && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            Uploading...
          </span>
        )}
        {uploadState === "success" && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white">
            ✓ Uploaded
          </span>
        )}
        {uploadState === "error" && (
          <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white">
            Upload failed
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          title="AI image generation is not implemented yet"
          className="cursor-not-allowed rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
        >
          ✨ Generate with AI (Coming soon)
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Upload image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function useImagePreview() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return { imageFile: file, imageUrl: url, setImageFile: setFile };
}
