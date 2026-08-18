"use client";

import { useEffect, useState } from "react";
import {
  getRepositories,
  repositoryErrorMessage,
  type ResourceLink,
} from "@/lib/repositories";

/**
 * Documents hanging off the office — spreadsheets, folders, forms.
 *
 * Loaded on its own rather than through useOfficeData, because the
 * table behind it arrives with a migration the office applies by hand.
 * Folding it into the main load would mean one missing table takes down
 * every panel; here the worst case is a desk that says what is missing.
 */
export interface DeskLinksState {
  status: "loading" | "ready" | "error";
  links: ResourceLink[];
  /** the table has not been created yet */
  pending: boolean;
  message?: string;
}

export function useDeskLinks(): DeskLinksState {
  const [state, setState] = useState<DeskLinksState>({
    status: "loading",
    links: [],
    pending: false,
  });

  useEffect(() => {
    let cancelled = false;
    getRepositories()
      .resourceLinks.list()
      .then(({ links, pending }) => {
        if (!cancelled) setState({ status: "ready", links, pending });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            links: [],
            pending: false,
            message: repositoryErrorMessage(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
