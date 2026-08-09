"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AreaId, DemoRole } from "@/types/office";
import type { OfficeGame } from "@/lib/game/engine";
import { getDataSource } from "@/lib/repositories";
import { OfficeDataProvider } from "@/hooks/useOfficeData";
import { useOfficeRealtime } from "@/hooks/useOfficeRealtime";
import { useSessionRole } from "@/lib/auth/SessionProvider";
import AreaPanel from "@/components/panels/AreaPanel";
import DataSourceBadge from "./DataSourceBadge";
import DebugOverlay from "./DebugOverlay";
import DemoRoleSwitcher from "./DemoRoleSwitcher";
import InteractionPrompt from "./InteractionPrompt";
import MiniMap from "./MiniMap";
import MobileJoystick from "./MobileJoystick";
import OfficeCanvas from "./OfficeCanvas";
import OfficeHUD from "./OfficeHUD";
import RealtimeHUD from "./RealtimeHUD";

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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export default function OfficeShell() {
  const gameRef = useRef<OfficeGame | null>(null);
  const [currentArea, setCurrentArea] = useState<AreaId | null>(null);
  const [openArea, setOpenArea] = useState<AreaId | null>(null);
  const [demoRole, setDemoRole] = useState<DemoRole>("guest");
  const sessionRole = useSessionRole();
  const isMobile = useIsMobile();

  // SUPABASE mode: the viewer's role comes from the real auth session
  // (anonymous = guest). DEMO mode keeps the dev-only role switcher.
  const source = getDataSource();
  const role: DemoRole = source === "SUPABASE" ? sessionRole : demoRole;

  // STEP 3: presence + movement for authenticated members/admins.
  const realtime = useOfficeRealtime(gameRef, currentArea);

  const openPanel = useCallback(() => {
    setOpenArea((prev) => prev ?? currentArea);
  }, [currentArea]);

  const closePanel = useCallback(() => setOpenArea(null), []);

  // Freeze avatar movement while a panel is open.
  useEffect(() => {
    gameRef.current?.setInputEnabled(openArea === null);
  }, [openArea]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        setOpenArea(null);
      } else if ((e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey) {
        setOpenArea((prev) => prev ?? currentArea);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentArea]);

  const handleJoystick = useCallback((x: number, y: number) => {
    gameRef.current?.setJoystick(x, y);
  }, []);

  return (
    <OfficeDataProvider>
      <div className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[#e8e8e5] dark:bg-zinc-950">
        <OfficeCanvas gameRef={gameRef} onAreaChange={setCurrentArea} />

        <OfficeHUD area={currentArea} />
        <MiniMap gameRef={gameRef} currentArea={currentArea} />
        <RealtimeHUD realtime={realtime} />
        {source === "DEMO" ? (
          <DemoRoleSwitcher role={demoRole} onChange={setDemoRole} />
        ) : null}
        <DebugOverlay gameRef={gameRef} realtimeStats={realtime.statsSource} />
        <DataSourceBadge source={source} />

        {currentArea && openArea === null ? (
          <InteractionPrompt
            area={currentArea}
            mobile={isMobile}
            onOpen={openPanel}
          />
        ) : null}

        {isMobile ? <MobileJoystick onVector={handleJoystick} /> : null}

        {openArea ? (
          <AreaPanel areaId={openArea} role={role} onClose={closePanel} />
        ) : null}
      </div>
    </OfficeDataProvider>
  );
}
