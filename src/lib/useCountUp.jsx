import { useState, useEffect, useRef } from "react";

/**
 * useCountUp — animates a number from 0 to `target` over `duration` ms.
 * Uses requestAnimationFrame for smooth 60fps counting.
 * Respects prefers-reduced-motion (returns target instantly).
 *
 * @param {number} target - final value
 * @param {number} duration - animation duration in ms (default 800)
 * @returns {number} current animated value
 */
export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    // Check reduced motion
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || target === 0) {
      setValue(target);
      return;
    }

    const animate = (timestamp) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    startRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

/**
 * CountUpText — convenience component that renders the animated count.
 * Useful for stat displays where you just want <CountUpText value={42} />
 */
export function CountUpText({ value, duration, suffix = "", prefix = "" }) {
  const animated = useCountUp(value, duration);
  return <>{prefix}{animated}{suffix}</>;
}
