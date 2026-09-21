import React, { useEffect, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number; // ms, default 800
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function CountUp({
  end,
  duration = 800,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // If prefers-reduced-motion, immediately set end value
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(end);
      return;
    }

    let start = 0;
    const startTime = performance.now();
    let animationFrameId: number;

    function easeOutExpo(x: number): number {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    function updateCount(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const currentVal = start + (end - start) * easedProgress;

      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    }

    animationFrameId = requestAnimationFrame(updateCount);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration]);

  const formatted = decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
