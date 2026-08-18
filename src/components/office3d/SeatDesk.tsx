"use client";

import { useMemo, useState } from "react";
import type { ResourceLink } from "@/lib/repositories";
import { useDeskLinks } from "@/hooks/useDeskLinks";
import { useBoardData } from "./world/officeBoard";
import type { Seat } from "./world/seats";

/**
 * THE DESK YOU SAT DOWN AT.
 *
 * Checking in has to be worth doing. Once you are in a seat this is
 * everything you would reach for without standing up again: the
 * meeting you are here for, and the documents the office keeps.
 *
 * It is plain DOM on purpose — buttons and links, focusable, readable
 * by a screen reader, and it opens real URLs in a real tab. Nothing
 * about the 3D world should make an office worse to actually use.
 */

const KIND_LABEL: Record<string, string> = {
  sheet: "SHEET",
  doc: "DOC",
  folder: "FOLDER",
  form: "FORM",
  other: "LINK",
};

const KIND_TINT: Record<string, string> = {
  sheet: "border-emerald-300/40 text-emerald-100",
  doc: "border-sky-300/40 text-sky-100",
  folder: "border-amber-300/40 text-amber-100",
  form: "border-fuchsia-300/40 text-fuchsia-100",
  other: "border-zinc-300/30 text-zinc-200",
};

const clock = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--:--"
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const safe = (url: string) => /^https?:\/\//i.test(url.trim());

function LinkChip({ link }: { link: ResourceLink }) {
  if (!safe(link.url)) return null;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="desk-link"
      className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border bg-[#101a28]/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] backdrop-blur transition-colors hover:bg-[#17263a]/90 ${
        KIND_TINT[link.kind] ?? KIND_TINT.other
      }`}
    >
      <span className="opacity-60">{KIND_LABEL[link.kind] ?? "LINK"}</span>
      <span className="max-w-[13rem] truncate text-white/90">{link.label}</span>
    </a>
  );
}

export default function SeatDesk({
  seat,
  onStand,
  isMobile,
}: {
  seat: Seat;
  onStand: () => void;
  isMobile: boolean;
}) {
  const { joinables } = useBoardData();
  const desk = useDeskLinks();
  const [open, setOpen] = useState(true);

  // Anything attached to a meeting you can actually join comes first —
  // sitting down for a meeting and hunting for its sheet is exactly the
  // errand this is meant to remove.
  const links = useMemo(() => {
    const ids = new Set(joinables.map((m) => m.id));
    const mine = desk.links.filter((l) => l.meeting_id && ids.has(l.meeting_id));
    const rest = desk.links.filter((l) => !(l.meeting_id && ids.has(l.meeting_id)));
    return [...mine, ...rest];
  }, [desk.links, joinables]);

  const primary = joinables[0] ?? null;
  const others = joinables.slice(1, 4);

  return (
    <div
      data-testid="seat-desk"
      data-seat-id={seat.id}
      className="pointer-events-none absolute inset-x-0 bottom-20 z-30 flex justify-center px-3 md:bottom-24"
    >
      <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1420]/88 shadow-[0_8px_40px_rgba(4,10,20,0.55)] backdrop-blur-md">
        {/* header: where you are, and the way out */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
          <span
            data-testid="checked-in"
            data-seat-id={seat.id}
            className="truncate text-[11px] font-semibold tracking-[0.16em] text-emerald-200"
          >
            CHECKED IN · {seat.label.toUpperCase()}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Collapse the desk" : "Expand the desk"}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-zinc-300 transition-colors hover:bg-white/10"
            >
              {open ? "HIDE" : "DESK"}
            </button>
            <button
              type="button"
              data-testid="seat-action"
              onClick={onStand}
              aria-label="Stand up and check out"
              className="rounded-full border border-cyan-200/30 bg-[#16233a]/80 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-cyan-100 transition-colors hover:bg-[#1d3050]/90"
            >
              {isMobile ? "STAND" : "E · STAND UP"}
            </button>
          </div>
        </div>

        {open ? (
          <div className="max-h-[42vh] space-y-3 overflow-y-auto border-t border-white/10 px-3 py-3 md:max-h-none">
            {/* the meeting you are here for */}
            {primary ? (
              <section>
                <p className="mb-1.5 text-[10px] font-semibold tracking-[0.2em] text-zinc-500">
                  MEETING
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={primary.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="join-meeting"
                    aria-label={`Join ${primary.title} in ${primary.room}`}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-[#0b6ec4]/90 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-white transition-colors hover:bg-[#0d80e0]"
                  >
                    JOIN
                    <span className="max-w-[16rem] truncate font-medium tracking-normal">
                      {primary.title}
                    </span>
                  </a>
                  <span className="text-[11px] text-zinc-400">
                    {clock(primary.startAt)}–{clock(primary.endAt)} · {primary.room}
                  </span>
                </div>
                {others.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {others.map((m) => (
                      <li key={m.id}>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[11px] text-zinc-300 transition-colors hover:text-white"
                        >
                          <span className="tabular-nums text-zinc-500">
                            {clock(m.startAt)}
                          </span>
                          <span className="max-w-[18rem] truncate">{m.title}</span>
                          <span className="text-sky-300">JOIN</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {/* the documents */}
            <section>
              <p className="mb-1.5 text-[10px] font-semibold tracking-[0.2em] text-zinc-500">
                SHEETS &amp; DOCS
              </p>
              {desk.status === "loading" ? (
                <p className="text-[11px] text-zinc-500">読み込み中…</p>
              ) : desk.status === "error" ? (
                <p className="text-[11px] text-rose-300">{desk.message}</p>
              ) : desk.pending ? (
                <p className="text-[11px] leading-5 text-amber-200/80">
                  リンク用のテーブルがまだ作成されていません。
                  <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-[10px] text-amber-100">
                    supabase/migrations/step5_agenda_links.sql
                  </code>
                  を適用すると、ここにスプレッドシートが並びます。
                </p>
              ) : links.length === 0 ? (
                <p className="text-[11px] text-zinc-500">
                  まだリンクがありません（Admin → Links から追加できます）。
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {links.map((l) => (
                    <LinkChip key={l.id} link={l} />
                  ))}
                </div>
              )}
            </section>

            {primary === null && desk.status === "ready" && !desk.pending && links.length === 0 ? (
              <p className="text-[11px] text-zinc-500">
                この席からすぐに開けるものは今のところありません。
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
