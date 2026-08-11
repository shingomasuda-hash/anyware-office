"use client";

import { Component, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { OfficeGame } from "@/lib/game/engine";
import { useOfficeRealtime } from "@/hooks/useOfficeRealtime";
import { OfficeDataProvider } from "@/hooks/useOfficeData";
import { useCurrentUser, useSessionRole } from "@/lib/auth/SessionProvider";
import AreaPanel from "@/components/panels/AreaPanel";
import InteractionPrompt from "@/components/office/InteractionPrompt";
import type { AreaId } from "@/types/office";
import MiniMap from "@/components/office/MiniMap";
import MobileJoystick from "@/components/office/MobileJoystick";
import OfficeHUD from "@/components/office/OfficeHUD";
import ProfileCard from "@/components/office/ProfileCard";
import ProfileEditor from "@/components/office/ProfileEditor";
import RealtimeHUD from "@/components/office/RealtimeHUD";
import { LabSim } from "./LabSim";
import Office3DCanvas from "./Office3DCanvas";

// /office-lab shell (STEP 4.9). Reuses the STEP 3/4 hooks + HUD stack
// unchanged; only the renderer differs (LabSim + R3F world instead of
// the 2D canvas engine). The production /office is untouched.

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      "(max-width: 767px), (pointer: coarse) and (max-width: 1024px)",
    );
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export function LabFallback({ detail }: { detail: string }) {
  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-400">
        ANYWARE OFFICE LAB
      </p>
      <h1 className="text-xl font-semibold tracking-tight">
        3D Office is not supported on this device
      </h1>
      <p className="max-w-sm text-sm leading-6 text-zinc-500">{detail}</p>
      <Link
        href="/office"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Open the 2D Office
      </Link>
    </main>
  );
}

class CanvasErrorBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <LabFallback detail="3D初期化に失敗しました。通常のOfficeをご利用ください。" />
      );
    }
    return this.props.children;
  }
}

export default function OfficeLabShell() {
  const simRef = useRef<LabSim | null>(null);
  if (simRef.current === null) simRef.current = new LabSim();
  const sim = simRef.current;
  // Structural stand-in for OfficeGame — LabSim implements the exact
  // hook-facing surface (getSnapshot / remoteSource / setLocalIdentity).
  const gameRef = simRef as unknown as React.MutableRefObject<OfficeGame | null>;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [currentArea, setCurrentArea] = useState<AreaId | null>(null);
  const [cardUserId, setCardUserId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [openArea, setOpenArea] = useState<AreaId | null>(null);
  const user = useCurrentUser();
  const sessionRole = useSessionRole();
  const isMobile = useIsMobile();
  // The lab route is member/admin only, so the viewer's role always
  // comes from the real auth session.
  const role = sessionRole;

  const realtime = useOfficeRealtime(gameRef, currentArea);

  useEffect(() => {
    setSupported(webglSupported());
  }, []);

  useEffect(() => {
    sim.onAreaChange = setCurrentArea;
    sim.attach();
    setCurrentArea(sim.getSnapshot().area);
    return () => {
      sim.onAreaChange = null;
      sim.detach();
    };
  }, [sim]);

  // Fixed-timestep simulation on the wall clock — movement speed must
  // not depend on render FPS (weak GPUs render slower; they must not
  // WALK slower). Sub-steps stay ≤50ms so collision behaves exactly
  // like the 2D engine. The 1.5s catch-up ceiling covers main-thread
  // stalls from slow renderers without unbounded replay after a long
  // suspension (keys are cleared on blur, so replay is input-bounded).
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      let elapsed = Math.min((now - last) / 1000, 1.5);
      last = now;
      while (elapsed > 0) {
        const step = Math.min(elapsed, 0.05);
        sim.update(step);
        elapsed -= step;
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [sim]);

  const overlayOpen = cardUserId !== null || editorOpen || openArea !== null;
  useEffect(() => {
    sim.setInputEnabled(!overlayOpen);
  }, [sim, overlayOpen]);

  const handleJoystick = useCallback(
    (x: number, y: number) => sim.setJoystick(x, y),
    [sim],
  );

  // Touch/drag steering on the canvas: while the pointer is held past a
  // small drag/hold threshold, the avatar walks toward it (relative to
  // the avatar's on-screen anchor). Quick taps stay taps, so clicking
  // an avatar still opens the profile card.
  const steer = useRef<{
    id: number;
    startX: number;
    startY: number;
    active: boolean;
    holdTimer: number;
  } | null>(null);
  const steerVector = useCallback(
    (el: HTMLElement, clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      const ax = r.left + r.width / 2;
      const ay = r.top + r.height * 0.58; // avatar sits below screen center
      const dx = clientX - ax;
      const dy = clientY - ay;
      const len = Math.hypot(dx, dy);
      if (len < 24) {
        sim.setPointer(0, 0);
        return;
      }
      const mag = Math.min(1, len / 140);
      sim.setPointer((dx / len) * mag, (dy / len) * mag);
    },
    [sim],
  );
  const endSteer = useCallback(() => {
    const st = steer.current;
    if (st) window.clearTimeout(st.holdTimer);
    steer.current = null;
    sim.setPointer(0, 0);
  }, [sim]);
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.isPrimary) return;
      const el = e.currentTarget;
      // Hold-to-walk is a TOUCH gesture only; with a mouse, steering
      // engages exclusively through dragging, so clicks stay clicks
      // (avatar profile cards) no matter how long the button is held.
      const holdTimer =
        e.pointerType === "touch"
          ? window.setTimeout(() => {
              const st = steer.current;
              if (st && !st.active) {
                st.active = true;
                steerVector(el, st.startX, st.startY);
              }
            }, 220)
          : 0;
      steer.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
        holdTimer,
      };
    },
    [steerVector],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const st = steer.current;
      if (!st || st.id !== e.pointerId) return;
      if (!st.active) {
        if (Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 14) {
          st.active = true;
        } else {
          return;
        }
      }
      st.startX = e.clientX;
      st.startY = e.clientY;
      steerVector(e.currentTarget, e.clientX, e.clientY);
    },
    [steerVector],
  );
  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const st = steer.current;
      if (!st || st.id !== e.pointerId) return;
      endSteer();
    },
    [endSteer],
  );
  const openEditor = useCallback(() => {
    setCardUserId(null);
    setEditorOpen(true);
  }, []);
  const handleSelectPerson = useCallback((userId: string) => {
    setCardUserId(userId);
  }, []);
  const openPanel = useCallback(() => {
    setOpenArea((prev) => prev ?? currentArea);
  }, [currentArea]);

  // Same interaction contract as the 2D office: E opens the current
  // area's panel, Escape closes it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        setOpenArea(null);
      } else if ((e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey) {
        if (!overlayOpen) setOpenArea((prev) => prev ?? currentArea);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentArea, overlayOpen]);

  if (supported === false) {
    return (
      <LabFallback detail="このブラウザ/端末ではWebGLを利用できません。" />
    );
  }

  return (
    <OfficeDataProvider>
      <div className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[#e9e4f5]">
        {supported && user ? (
          <CanvasErrorBoundary>
            <div
              className="absolute inset-0"
              data-testid="office-lab-canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onPointerLeave={onPointerEnd}
            >
              <Office3DCanvas
                sim={sim}
                user={user}
                myStatus={realtime.myStatus}
                roster={realtime.roster}
                onPickPerson={handleSelectPerson}
                onPickSelf={() => setCardUserId(user.id)}
                onReady={() => setReady(true)}
                isMobile={isMobile}
              />
            </div>
          </CanvasErrorBoundary>
        ) : null}

        {!ready ? (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#e9e4f5]"
            data-testid="lab-loading"
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600" />
            <p className="text-xs font-semibold tracking-[0.25em] text-slate-500">
              ENTERING ANYWARE OFFICE…
            </p>
          </div>
        ) : null}

        <OfficeHUD area={currentArea} variant="lab" />
        <MiniMap gameRef={gameRef} currentArea={currentArea} variant="lab" />
        <RealtimeHUD
          realtime={realtime}
          onSelectPerson={handleSelectPerson}
          onOpenProfile={openEditor}
          variant="lab"
        />

        {/* lab badge + escape hatch back to the stable office */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5">
          <span className="rounded-full border border-cyan-300/30 bg-[#0d1420]/75 px-2.5 py-1 text-[9px] font-bold tracking-[0.2em] text-cyan-100 backdrop-blur-md">
            OFFICE LAB · 3D PREVIEW
          </span>
          <Link
            href="/office"
            className="rounded-full border border-white/50 bg-white/70 px-2.5 py-1 text-[9px] font-semibold tracking-[0.15em] text-slate-600 backdrop-blur-md transition-colors hover:bg-white"
          >
            2D OFFICE
          </Link>
        </div>

        {currentArea && !overlayOpen ? (
          <InteractionPrompt
            area={currentArea}
            mobile={isMobile}
            onOpen={openPanel}
            variant="lab"
          />
        ) : null}

        {isMobile ? <MobileJoystick onVector={handleJoystick} /> : null}

        {openArea ? (
          <AreaPanel areaId={openArea} role={role} onClose={() => setOpenArea(null)} />
        ) : null}

        {cardUserId ? (
          <ProfileCard
            userId={cardUserId}
            isSelf={cardUserId === user?.id}
            roster={realtime.roster}
            onClose={() => setCardUserId(null)}
            onEditProfile={cardUserId === user?.id ? openEditor : undefined}
          />
        ) : null}
        {editorOpen ? <ProfileEditor onClose={() => setEditorOpen(false)} /> : null}
      </div>
    </OfficeDataProvider>
  );
}
