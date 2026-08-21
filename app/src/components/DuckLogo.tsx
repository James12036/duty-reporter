"use client";

import { useId } from "react";

/**
 * Report Duck mascot — toy duck with 鴨屎綠 (olive) body.
 */
export default function DuckLogo({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Report Duck"
    >
      <defs>
        <linearGradient id={`${uid}-body`} x1="24" y1="18" x2="108" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4C45A" />
          <stop offset="45%" stopColor="#9AA03A" />
          <stop offset="100%" stopColor="#6E7328" />
        </linearGradient>
        <linearGradient id={`${uid}-belly`} x1="52" y1="72" x2="96" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E4E6A4" />
          <stop offset="100%" stopColor="#C5C86A" />
        </linearGradient>
        <linearGradient id={`${uid}-beak`} x1="16" y1="48" x2="50" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB04A" />
          <stop offset="100%" stopColor="#E07A18" />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-12%" y="-8%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#3d4420" floodOpacity="0.28" />
        </filter>
      </defs>

      <ellipse cx="66" cy="117" rx="36" ry="6.5" fill="#3d4420" opacity="0.12" />

      <g filter={`url(#${uid}-shadow)`}>
        {/* body */}
        <ellipse cx="72" cy="84" rx="40" ry="31" fill={`url(#${uid}-body)`} />
        {/* belly highlight */}
        <ellipse cx="76" cy="92" rx="23" ry="17" fill={`url(#${uid}-belly)`} />
        {/* wing */}
        <ellipse cx="96" cy="86" rx="15" ry="11" fill="#7A812E" transform="rotate(16 96 86)" />
        <path
          d="M88 82c9 2 17 5 19 13"
          fill="none"
          stroke="#5C6122"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* head */}
        <circle cx="50" cy="46" r="28" fill={`url(#${uid}-body)`} />

        {/* tiny gold bow on the crown */}
        <path d="M44 20 L50 28 L56 20 L53 28 L56 34 L50 29 L44 34 L47 28 Z" fill="#d4a853" />
        <circle cx="50" cy="28" r="3.2" fill="#b8902e" />

        {/* beak */}
        <ellipse cx="26" cy="54" rx="16" ry="9" fill={`url(#${uid}-beak)`} />
        <path d="M14 54h24" stroke="#C45E10" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="18" cy="52" rx="3.2" ry="2" fill="#FFD08A" opacity="0.7" />

        {/* eye */}
        <circle cx="46" cy="46" r="8.2" fill="#fff" />
        <circle cx="48" cy="47.5" r="4.6" fill="#2a3010" />
        <circle cx="50" cy="45.6" r="1.7" fill="#fff" />

        {/* blush */}
        <ellipse cx="58" cy="58" rx="6" ry="3.4" fill="#C96B4A" opacity="0.35" />

        {/* gold collar button */}
        <rect x="54" y="72" width="18" height="6" rx="3" fill="#d4a853" />
        <circle cx="63" cy="75" r="2.2" fill="#fff3cc" />
      </g>
    </svg>
  );
}
