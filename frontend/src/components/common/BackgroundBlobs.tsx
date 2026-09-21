import React from "react";
import { useTheme } from "../../context/ThemeContext";

export default function BackgroundBlobs() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 transition-colors duration-300">
      {/* Deep gradient base mesh */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: isDark
            ? "#0a0a0a"
            : "radial-gradient(ellipse at 50% -10%, #e0e7ff 0%, #f1f5f9 40%, #f8fafc 100%)",
          opacity: 1,
        }}
      />

      {/* Light Mode Blobs (rendered only in light mode for the airy feel) */}
      {!isDark && (
        <>
          {/* Blob 1: Top Left Ambient Glow */}
          <div
            className="absolute -top-[15%] -left-[10%] w-[650px] h-[650px] rounded-full blur-[120px] animate-blob-slow transition-all duration-300"
            style={{
              background: "radial-gradient(circle, rgba(165, 180, 252, 0.5) 0%, rgba(199, 210, 254, 0.3) 60%, transparent 80%)",
              opacity: 0.6,
            }}
          />

          {/* Blob 2: Center Right Glow */}
          <div
            className="absolute top-[30%] -right-[15%] w-[700px] h-[700px] rounded-full blur-[140px] animate-blob-reverse transition-all duration-300"
            style={{
              background: "radial-gradient(circle, rgba(221, 214, 254, 0.55) 0%, rgba(243, 232, 255, 0.35) 60%, transparent 80%)",
              opacity: 0.5,
            }}
          />

          {/* Blob 3: Bottom Center Glow */}
          <div
            className="absolute -bottom-[20%] left-[25%] w-[600px] h-[600px] rounded-full blur-[130px] animate-blob-pulse transition-all duration-300"
            style={{
              background: "radial-gradient(circle, rgba(199, 210, 254, 0.45) 0%, rgba(224, 231, 255, 0.3) 60%, transparent 80%)",
              opacity: 0.5,
            }}
          />

          {/* Subtle Grid Overlay for Depth in Light Mode */}
          <div 
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundImage: "radial-gradient(rgba(15, 23, 42, 0.12) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              opacity: 0.05,
            }}
          />
        </>
      )}
    </div>
  );
}
