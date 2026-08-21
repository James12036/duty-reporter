"use client";

/**
 * Report Duck mascot — toy rubber duck, navy + gold accents.
 */
export default function DuckLogo({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
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
        <linearGradient id="duckBody" x1="20" y1="20" x2="110" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="55%" stopColor="#F5C842" />
          <stop offset="100%" stopColor="#D4A853" />
        </linearGradient>
        <linearGradient id="duckBelly" x1="50" y1="70" x2="90" y2="115" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF6C8" />
          <stop offset="100%" stopColor="#F3D98A" />
        </linearGradient>
        <linearGradient id="beak" x1="18" y1="48" x2="48" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF9A3C" />
          <stop offset="100%" stopColor="#E06A16" />
        </linearGradient>
        <filter id="duckShadow" x="-10%" y="-5%" width="130%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#1e3a5f" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* ground blob */}
      <ellipse cx="64" cy="116" rx="34" ry="6" fill="#1e3a5f" opacity="0.08" />

      <g filter="url(#duckShadow)">
        {/* body */}
        <ellipse cx="70" cy="82" rx="38" ry="30" fill="url(#duckBody)" />
        {/* belly */}
        <ellipse cx="74" cy="90" rx="22" ry="16" fill="url(#duckBelly)" />
        {/* wing */}
        <ellipse cx="92" cy="84" rx="14" ry="10" fill="#E8B63A" transform="rotate(18 92 84)" />
        <path
          d="M84 80c8 2 16 4 18 12"
          fill="none"
          stroke="#C9922E"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* head */}
        <circle cx="52" cy="48" r="26" fill="url(#duckBody)" />

        {/* navy toy sailor hat */}
        <path d="M32 38c4-16 20-22 36-14 4 2 8 6 10 10-16-6-32-4-46 4z" fill="#1e3a5f" />
        <ellipse cx="50" cy="36" rx="22" ry="6" fill="#16293f" />
        <rect x="46" y="18" width="10" height="16" rx="3" fill="#1e3a5f" />
        <rect x="46" y="18" width="10" height="5" rx="2.5" fill="#d4a853" />

        {/* beak */}
        <ellipse cx="30" cy="56" rx="14" ry="8" fill="url(#beak)" />
        <path d="M18 56h24" stroke="#C75A12" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />

        {/* eye */}
        <circle cx="48" cy="48" r="7.5" fill="#fff" />
        <circle cx="50" cy="49" r="4.2" fill="#0f1c2c" />
        <circle cx="51.6" cy="47.4" r="1.5" fill="#fff" />

        {/* cheek */}
        <ellipse cx="58" cy="58" rx="5" ry="3.2" fill="#FF8A6B" opacity="0.45" />

        {/* gold toy button */}
        <circle cx="62" cy="78" r="4.5" fill="#d4a853" />
        <circle cx="62" cy="78" r="2" fill="#fff6d6" />
      </g>
    </svg>
  );
}
