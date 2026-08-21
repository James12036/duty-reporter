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
