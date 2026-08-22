export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  /** Active tab styling: soft tinted background + matching text colour */
  active: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "eos",
    label: "EOS",
    icon: "📋",
    color: "border-red-500",
    active: "bg-red-50 text-red-700 border-red-500",
  },
  {
    id: "overlapping",
    label: "Overlapping",
    icon: "🔄",
    color: "border-blue-500",
    active: "bg-blue-50 text-blue-700 border-blue-500",
  },
  {
    id: "asgp",
    label: "ASGP",
    icon: "🎲",
    color: "border-green-500",
    active: "bg-green-50 text-green-700 border-green-500",
  },
  {
    id: "mtr-patrol",
    label: "MTR Patrol",
    icon: "🚇",
    color: "border-purple-500",
    active: "bg-purple-50 text-purple-700 border-purple-500",
  },
  {
    id: "cnap-check",
    label: "Snap Check",
    icon: "✅",
    color: "border-amber-500",
    active: "bg-amber-50 text-amber-700 border-amber-500",
  },
  {
    id: "others",
    label: "Others",
    icon: "📌",
    color: "border-gray-500",
    active: "bg-gray-50 text-gray-700 border-gray-500",
  },
];

/** Rooms filled after "Refresh for A-C" */
export const AC_REFRESH_ROOMS = ["eos", "overlapping"] as const;

/** Exact contents of Downloads/Refresh for A-C.txt */
export const AC_REFRESH_TEMPLATE = `MP CW




SUP CW




MP SKW




SUP SKW




SUP SO




`;

/** Rooms filled after "Refresh for D" */
export const D_REFRESH_ROOMS = ["eos"] as const;

/** Exact contents of Downloads/Refresh for D.txt */
export const D_REFRESH_TEMPLATE = `D


D2


D7


H3


`;

/** Exact contents of Downloads/底部模板.txt */
export const BOTTOM_TEMPLATE = `60368
1 SS, 1 SQ, 2 EP, 2 ID, 2 RL

63112
3 SQ, 2 EP, 3 ID, 2 SCH, 2 SF, 2 IN
`;

/** Exact contents of Downloads/ASGP 底部模版.txt */
export const ASGP_TEMPLATE = `0800-0815 XXXX XXXX Estate`;

/** Exact contents of Downloads/MTR 底部模版.txt */
export const MTR_TEMPLATE = `0800-0815 XX Station 1 SS`;

/** Exact contents of Downloads/Snap Check底部模版.txt */
export const SNAP_TEMPLATE = `1 車 1 人`;
