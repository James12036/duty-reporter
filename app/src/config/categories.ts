export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "eos",
    label: "EOS",
    icon: "📋",
    color: "border-red-500",
  },
  {
    id: "overlapping",
    label: "Overlapping",
    icon: "🔄",
    color: "border-blue-500",
  },
  {
    id: "asgp",
    label: "ASGP",
    icon: "🎲",
    color: "border-green-500",
  },
  {
    id: "mtr-patrol",
    label: "MTR Patrol",
    icon: "🚇",
    color: "border-purple-500",
  },
];
