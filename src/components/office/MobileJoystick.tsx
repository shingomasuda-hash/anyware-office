"use client";

import { useRef, useState } from "react";

const RADIUS = 44;

export default function MobileJoystick({
  onVector,
}: {
  onVector: (x: number, y: number) => void;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const updateFromPointer = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    onVector(dx / RADIUS, dy / RADIUS);
  };

  const release = () => {
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onVector(0, 0);
  };

  return (
    <div
      ref={baseRef}
      data-testid="joystick"
      role="application"
      aria-label="Virtual joystick. Drag to move your avatar."
      className="absolute bottom-8 left-5 z-20 h-28 w-28 touch-none rounded-full border border-zinc-300/60 bg-white/40 shadow-inner backdrop-blur-sm dark:border-zinc-600/60 dark:bg-zinc-800/40"
      onPointerDown={(e) => {
        pointerId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerId.current !== e.pointerId) return;
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-zinc-700/85 shadow-md dark:bg-zinc-200/85"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  );
}
