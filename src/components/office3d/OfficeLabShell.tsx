"use client";

import { Component, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { OfficeGame } from "@/lib/game/engine";
import { useOfficeRealtime } from "@/hooks/useOfficeRealtime";
import { OfficeDataProvider } from "@/hooks/useOfficeData";
import { useCurrentUser } from "@/lib/auth/SessionProvider";
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
  const user = useCurrentUser();
  const isMobile = useIsMobile();

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
  // like the 2D engine.
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      let elapsed = Math.min((now - last) / 1000, 0.3);
      last = now;
      while (elapsed > 0) {
        const step = Math.min(elapsed, 0.05);
        sim.update(step);
        elapsed -= step;
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [sim]);

  const overlayOpen = cardUserId !== null || editorOpen;
  useEffect(() => {
    sim.setInputEnabled(!overlayOpen);
  }, [sim, overlayOpen]);

  const handleJoystick = useCallback(
    (x: number, y: number) => sim.setJoystick(x, y),
    [sim],
  );
  const openEditor = useCallback(() => {
    setCardUserId(null);
    setEditorOpen(true);
  }, []);
  const handleSelectPerson = useCallback((userId: string) => {
    setCardUserId(userId);
  }, []);

  if (supported === false) {
    return (
      <LabFallback detail="このブラウザ/端末ではWebGLを利用できません。" />
    );
  }

  return (
    <OfficeDataProvider>
      <div className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[#dce9f2]">
        {supported && user ? (
          <CanvasErrorBoundary>
            <div className="absolute inset-0" data-testid="office-lab-canvas">
              <Office3DCanvas
                sim={sim}
                user={user}
                myStatus={realtime.myStatus}
                roster={realtime.roster}
                onPickPerson={handleSelectPerson}
                onPickSelf={() => setCardUserId(user.id)}
                onReady={() => setReady(true)}
              />
            </div>
          </CanvasErrorBoundary>
        ) : null}

        {!ready ? (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#dce9f2]"
            data-testid="lab-loading"
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700" />
            <p className="text-xs font-semibold tracking-[0.25em] text-zinc-500">
              ENTERING ANYWARE OFFICE…
            </p>
          </div>
        ) : null}

        <OfficeHUD area={currentArea} />
        <MiniMap gameRef={gameRef} currentArea={currentArea} />
        <RealtimeHUD
          realtime={realtime}
          onSelectPerson={handleSelectPerson}
          onOpenProfile={openEditor}
        />

        {/* lab badge + escape hatch back to the stable office */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5">
          <span className="rounded bg-zinc-900/80 px-2 py-1 text-[9px] font-bold tracking-[0.2em] text-zinc-100 backdrop-blur">
            OFFICE LAB · 3D PREVIEW
          </span>
          <Link
            href="/office"
            className="rounded bg-white/80 px-2 py-1 text-[9px] font-semibold tracking-[0.15em] text-zinc-600 backdrop-blur transition-colors hover:bg-white"
          >
            2D OFFICE
          </Link>
        </div>

        {isMobile ? <MobileJoystick onVector={handleJoystick} /> : null}

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
