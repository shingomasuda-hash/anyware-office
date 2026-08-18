/**
 * What the wall surfaces are told about the office.
 *
 * Kept apart from the texture builders so that the shape of the data
 * carries no dependency on three.js: the shell, the tests and the
 * repositories all speak this, and none of them should have to load a
 * renderer to do it.
 *
 * Rows arrive already flattened rather than as repository types — the
 * 3D world does not get to know how the office fetches things.
 */

export interface BoardMeeting {
  id: string;
  title: string;
  client: string;
  startAt: string;
  endAt: string;
  room: string;
  status: string;
  hasUrl: boolean;
}

export interface BoardProject {
  title: string;
  client: string;
  status: string;
  progress: number;
}

/** Board data threaded from the shell into the 3D world. */
export interface BoardData {
  meetings: BoardMeeting[];
  projects: BoardProject[];
}

export const EMPTY_BOARD: BoardData = { meetings: [], projects: [] };
