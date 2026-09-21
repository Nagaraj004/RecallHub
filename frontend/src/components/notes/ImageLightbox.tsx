import React, { useEffect } from "react";
import { X, Download, Maximize2 } from "../icons";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt = "Enlarged preview", onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!src) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Open in new tab / Download"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close viewer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Enlarged Image */}
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/15 select-none"
        />
      </div>
    </div>
  );
}
