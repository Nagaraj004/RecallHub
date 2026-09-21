import React, { useState, useRef, useEffect, ReactNode, MouseEvent } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number; // max tilt angle in deg (default 3.5)
  glareOpacity?: number;
  onClick?: () => void;
}

export default function TiltCard({
  children,
  className = "",
  maxTilt = 3.5,
  glareOpacity = 0.15,
  onClick,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("perspective(1000px) rotateX(0deg) rotateY(0deg)");
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; active: boolean }>({ x: 50, y: 50, active: false });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Disable tilt on touch devices or if reduced motion is requested
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (touch || reduced) {
      setIsTouchDevice(true);
    }
  }, []);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (isTouchDevice || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      active: true,
    });
  }

  function handleMouseLeave() {
    if (isTouchDevice) return;
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setGlarePos((prev) => ({ ...prev, active: false }));
  }

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: isTouchDevice ? undefined : transform,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Dynamic Specular Glare Reflection */}
      {!isTouchDevice && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 rounded-[inherited]"
          style={{
            opacity: glarePos.active ? glareOpacity : 0,
            background: `radial-gradient(circle 300px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.45), transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
