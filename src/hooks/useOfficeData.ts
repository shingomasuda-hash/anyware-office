"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getRepositories,
  repositoryErrorMessage,
  type Announcement,
  type BusinessSection,
  type DataSource,
  type GreenDeal,
  type LocalProject,
  type Meeting,
  type MeetingRoom,
  type Profile,
  type Project,
  type SectionMetric,
  type TableMenuItem,
  type TableStoreMetric,
} from "@/lib/repositories";

// Office → useOfficeData → repositories. Panels never touch supabase-js
// or mock stores directly; they read this context.

export interface OfficeData {
  announcements: Announcement[];
  sections: BusinessSection[];
  sectionMetrics: SectionMetric[];
  projects: Project[];
  staff: Profile[];
  meetingRooms: MeetingRoom[];
  meetings: Meeting[];
  storeMetrics: TableStoreMetric[];
  menuItems: TableMenuItem[];
  greenDeals: GreenDeal[];
  localProjects: LocalProject[];
}

export type OfficeDataState =
  | { status: "loading"; source: DataSource }
  | { status: "error"; source: DataSource; message: string }
  | { status: "ready"; source: DataSource; data: OfficeData };

export function useOfficeData(): OfficeDataState {
  const [state, setState] = useState<OfficeDataState>({
    status: "loading",
    source: "DEMO",
  });

  useEffect(() => {
    const repos = getRepositories();
    let cancelled = false;
    setState({ status: "loading", source: repos.source });

    Promise.all([
      repos.announcements.list(),
      repos.businessSections.list(),
      repos.sectionMetrics.list(),
      repos.projects.list(),
      repos.profiles.list(),
      repos.meetingRooms.list(),
      repos.meetings.list(),
      repos.tableStoreMetrics.list(),
      repos.tableMenuItems.list(),
      repos.greenDeals.list(),
      repos.localProjects.list(),
    ])
      .then(
        ([
          announcements,
          sections,
          sectionMetrics,
          projects,
          staff,
          meetingRooms,
          meetings,
          storeMetrics,
          menuItems,
          greenDeals,
          localProjects,
        ]) => {
          if (cancelled) return;
          setState({
            status: "ready",
            source: repos.source,
            data: {
              announcements,
              sections,
              sectionMetrics,
              projects,
              staff,
              meetingRooms,
              meetings,
              storeMetrics,
              menuItems,
              greenDeals,
              localProjects,
            },
          });
        },
      )
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          source: repos.source,
          message: repositoryErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

const OfficeDataContext = createContext<OfficeDataState | null>(null);

export function OfficeDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = useOfficeData();
  return createElement(OfficeDataContext.Provider, { value: state }, children);
}

export function useOfficeDataContext(): OfficeDataState {
  const state = useContext(OfficeDataContext);
  if (!state) {
    throw new Error("useOfficeDataContext requires OfficeDataProvider");
  }
  return state;
}
