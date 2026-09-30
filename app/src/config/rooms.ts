/**
 * Report Duck 2.1 — rooms, fields & shift presets.
 *
 * 7 rooms, each backed by its own Yjs room ("room-1" … "room-7").
 * Every room holds THREE text fields: EOS, Overlapping, Others.
 * Room NAMES are shared state (stored in the meta room's "roomnames" map),
 * so anyone can rename a room by hand and every officer sees the new name.
 */

export interface RoomConfig {
  id: string;
  /** Shown until someone refreshes / renames (or on a fresh server) */
  defaultName: string;
  /** Active tab styling: soft tinted background + matching text colour */
  active: string;
}

export const ROOMS: RoomConfig[] = [
  { id: "room-1", defaultName: "Room 1", active: "bg-red-50 text-red-700 border-red-500" },
  { id: "room-2", defaultName: "Room 2", active: "bg-blue-50 text-blue-700 border-blue-500" },
  { id: "room-3", defaultName: "Room 3", active: "bg-green-50 text-green-700 border-green-500" },
  { id: "room-4", defaultName: "Room 4", active: "bg-purple-50 text-purple-700 border-purple-500" },
  { id: "room-5", defaultName: "Room 5", active: "bg-amber-50 text-amber-700 border-amber-500" },
  { id: "room-6", defaultName: "Room 6", active: "bg-gray-50 text-gray-700 border-gray-500" },
  { id: "room-7", defaultName: "Room 7", active: "bg-teal-50 text-teal-700 border-teal-500" },
];

export const ROOM_IDS = ROOMS.map((r) => r.id);

export const DEFAULT_ROOM_NAMES = ROOMS.map((r) => r.defaultName);

/**
 * The three text fields inside every room (2.1).
 * Sizes: EOS 37.5vh (30vh +25%); Overlapping / Others 20.8vh (16vh +30%).
 * hint = small grey helper text shown next to the field label.
 */
export const ROOM_FIELDS = [
  { id: "eos", label: "EOS", textareaClass: "h-[37.5vh] min-h-[200px]", hint: "" },
  { id: "overlapping", label: "Overlapping", textareaClass: "h-[20.8vh] min-h-[110px]", hint: "" },
  {
    id: "others",
    label: "Others",
    textareaClass: "h-[20.8vh] min-h-[110px]",
    hint: "(ASGP, MTR Patrol, C/P, etc)",
  },
] as const;

export type RoomFieldId = (typeof ROOM_FIELDS)[number]["id"];

/** Room names applied by "Refresh (A-C)" */
export const AC_ROOM_NAMES = [
  "MP CW",
  "SUP CW",
  "MP SKW",
  "SUP SKW",
  "SUP SO",
  "Other 1",
  "Other 2",
];

/** Room names applied by "Refresh (D)" */
export const D_ROOM_NAMES = ["D", "D2", "D7", "H3", "Other 1", "Other 2", "Other 3"];
