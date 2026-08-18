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
import type { Seat } from "./world/seats";
import { useBoardData } from "./world/officeBoard";
import Office3DCanvas from "./Office3DCanvas";
import type { ComponentProps } from "react";

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

/**
 * The canvas, with the office's own data on its walls. It has to be a
 * separate component because the data context is opened by this file's
 * own provider — and because nothing inside the Canvas can read React
 * context at all, so the board crosses as a prop.
 */
function LiveCanvas(props: Omit<ComponentProps<typeof Office3DCanvas>, "board">) {
  const { board } = useBoardData();
  return <Office3DCanvas {...props} board={board} />;
}

/**
 * JOIN ZOOM, offered only once you are actually sitting in the meeting
 * pavilion. Sitting down at the table is the moment the invitation
 * makes sense; everywhere else it is noise.
 */
function JoinMeetingButton({ seat }: { seat: Seat }) {
  const { joinable } = useBoardData();
  if (seat.areaId !== "MEETING" || !joinable) return null;
  return (
    <a
      href={joinable.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="join-meeting"
      aria-label={`Join ${joinable.title} in ${joinable.room}`}
      className="pointer-events-auto rounded-full border border-sky-300/40 bg-[#0b6ec4]/90 px-5 py-2.5 text-xs font-semibold tracking-[0.16em] text-white shadow-[0_2px_14px_rgba(8,14,24,0.45)] backdrop-blur transition-colors hover:bg-[#0d80e0]"
    >
      JOIN · {joinable.title.length > 24 ? `${joinable.title.slice(0, 24)}…` : joinable.title}
    </a>
  );
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
  const [seat, setSeat] = useState<{
    nearby: Seat | null;
    seated: Seat | null;
    taken: boolean;
  }>({ nearby: null, seated: null, taken: false });
  const user = useCurrentUser();
  const sessionRole = useSessionRole();
  const isMobile = useIsMobile();
  // The lab route is member/admin only, so the viewer's role always
  // comes from the real auth session.
  const role = sessionRole;

  const realtime = useOfficeRealtime(gameRef, currentArea);

  // Who else is sitting where. Best-effort from presence: a seat someone
  // has claimed simply stops being offered.
  useEffect(() => {
    const ids = new Set<string>();
    for (const r of realtime.roster) {
      if (!r.isSelf && r.workplaceState === "checked_in" && r.seatId) ids.add(r.seatId);
    }
    sim.setOccupiedSeats(ids);
  }, [realtime.roster, sim]);

  useEffect(() => {
    setSupported(webglSupported());
  }, []);

  useEffect(() => {
    sim.onAreaChange = setCurrentArea;
    sim.onSeatChange = setSeat;
    sim.attach();
    setCurrentArea(sim.getSnapshot().area);
    return () => {
      sim.onAreaChange = null;
      sim.onSeatChange = null;
      sim.detach();
    };
  }, [sim]);

  // The simulation is driven from the RENDER loop (Office3DCanvas), not
  // from a timer. A timer ticking at 16 ms against a frame loop running
  // at another rate lands a different number of steps in each frame,
  // which is exactly what reads as stutter. Stepping once per frame on
  // the wall clock keeps walking speed independent of FPS *and* keeps
  // every frame's motion proportional to the time it represents.

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
        if (overlayOpen) return;
        // A seat within reach owns E — sitting down is the more
        // specific action, and the area panel is always one step away.
        if (sim.isSeated()) sim.stand();
        else if (sim.seatInReach()) sim.sit();
        else setOpenArea((prev) => prev ?? currentArea);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentArea, overlayOpen, sim]);

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
              <LiveCanvas
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
        <MiniMap gameRef={gameRef} currentArea={currentArea} variant="campus" />
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

        {!overlayOpen && (seat.seated || seat.nearby) ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex flex-col items-center gap-2 px-4 md:bottom-28">
            {seat.seated ? (
              <div
                data-testid="checked-in"
                data-seat-id={seat.seated.id}
                className="rounded-full border border-emerald-300/30 bg-[#0d1420]/80 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-emerald-200 backdrop-blur"
              >
                CHECKED IN · {seat.seated.label.toUpperCase()}
              </div>
            ) : null}
            {seat.seated ? <JoinMeetingButton seat={seat.seated} /> : null}
            <button
              type="button"
              disabled={!seat.seated && seat.taken}
              data-testid="seat-action"
              aria-label={
                seat.seated
                  ? "Stand up"
                  : seat.taken
                    ? `${seat.nearby?.label} is occupied`
                    : `Sit and check in at ${seat.nearby?.label}`
              }
              onClick={() => (seat.seated ? sim.stand() : sim.sit())}
              className={
                !seat.seated && seat.taken
                  ? "pointer-events-auto rounded-full border border-zinc-400/25 bg-[#0d1420]/70 px-5 py-2.5 text-xs font-semibold tracking-[0.16em] text-zinc-400 backdrop-blur"
                  : "pointer-events-auto rounded-full border border-cyan-200/30 bg-[#0d1420]/85 px-5 py-2.5 text-xs font-semibold tracking-[0.16em] text-cyan-100 shadow-[0_2px_14px_rgba(8,14,24,0.45)] backdrop-blur transition-colors hover:bg-[#16233a]/90"
              }
            >
              {seat.seated
                ? isMobile
                  ? "STAND"
                  : "E · STAND UP"
                : seat.taken
                  ? "OCCUPIED"
                  : isMobile
                    ? "SIT"
                    : `E · SIT & CHECK IN`}
            </button>
          </div>
        ) : null}

        {currentArea && !overlayOpen && !seat.seated && !seat.nearby ? (
          <InteractionPrompt
            area={currentArea}
            mobile={isMobile}
            onOpen={openPanel}
            variant="lab"
          />
        ) : null}

        {isMobile ? (
          <div className={seat.seated ? "pointer-events-none opacity-40" : undefined}>
            <MobileJoystick onVector={handleJoystick} />
          </div>
        ) : null}

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
