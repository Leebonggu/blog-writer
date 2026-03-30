"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, onChange, maxImages = 20 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = maxImages - images.length;
    const filesToProcess = fileArray.slice(0, remaining);

    const promises = filesToProcess.map((file) => resizeImage(file, 1024));

    Promise.all(promises).then((newImages) => {
      onChange([...images, ...newImages]);
    });
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // File drop (new images)
    if (e.dataTransfer.files.length > 0 && dragIndex === null) {
      processFiles(e.dataTransfer.files);
      return;
    }

    // Reorder drop
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = [...images];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, moved);
      onChange(reordered);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (dragIndex === null) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    if (dragIndex === null) {
      setIsDragging(false);
    }
  };

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onChange(reordered);
  };

  // Image item drag handlers
  const handleItemDragStart = (e: DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleItemDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        이미지 ({images.length}/{maxImages})
      </label>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <p className="text-gray-500 text-sm">
          이미지를 드래그하거나 클릭하여 업로드 (최대 {maxImages}장)
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => handleItemDragStart(e, i)}
              onDragOver={(e) => handleItemDragOver(e, i)}
              onDragEnd={handleItemDragEnd}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragIndex !== null && dragIndex !== i) {
                  const reordered = [...images];
                  const [moved] = reordered.splice(dragIndex, 1);
                  reordered.splice(i, 0, moved);
                  onChange(reordered);
                }
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              className={`relative group cursor-grab active:cursor-grabbing transition-all ${
                dragIndex === i ? "opacity-40 scale-95" : ""
              } ${dragOverIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-green-500 ring-offset-1" : ""}`}
            >
              <img
                src={img}
                alt={`이미지 ${i + 1}`}
                className="w-full h-20 object-cover rounded-lg pointer-events-none"
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
              {/* Index badge */}
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                {i + 1}
              </span>
              {/* Arrow buttons */}
              <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveImage(i, i - 1);
                    }}
                    className="bg-black/60 text-white rounded w-5 h-5 text-xs flex items-center justify-center hover:bg-black/80"
                  >
                    ←
                  </button>
                )}
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveImage(i, i + 1);
                    }}
                    className="bg-black/60 text-white rounded w-5 h-5 text-xs flex items-center justify-center hover:bg-black/80"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-xs text-gray-400">드래그하거나 화살표 버튼으로 순서를 변경할 수 있어요</p>
      )}
    </div>
  );
}
