"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/** Counts up to `value` the first time it scrolls into view. */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const last = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    if (reduce) {
      node.textContent = format(value);
      last.current = value;
      return;
    }
    const controls = animate(last.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(Math.round(v));
      },
    });
    last.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, format]);

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : 0)}
    </span>
  );
}
