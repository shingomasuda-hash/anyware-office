"use client";

import { useMemo } from "react";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import { deriveBoard, type JoinableMeeting } from "./boardDerive";
import { EMPTY_BOARD, type BoardData } from "./boardTypes";

/**
 * The bridge between the office's repositories and the surfaces hanging
 * on the walls inside the campus. It lives outside the Canvas on
 * purpose: React context does not cross the react-three-fiber
 * reconciler boundary, so the data is read here and handed down as a
 * plain prop.
 *
 * Nothing private crosses this line — only what is already shown in the
 * area panels to the same signed-in member.
 */
export function useBoardData(): { board: BoardData; joinable: JoinableMeeting | null } {
  const state = useOfficeDataContext();
  return useMemo(
    () =>
      state.status === "ready"
        ? deriveBoard(state.data, new Date())
        : { board: EMPTY_BOARD, joinable: null },
    [state],
  );
}
