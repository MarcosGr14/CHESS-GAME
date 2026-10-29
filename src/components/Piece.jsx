// Original vector silhouettes, all drawn on the same 64 × 64 grid.
const shapes = {
  p: (
    <>
      <circle cx="32" cy="17" r="8" />
      <path d="M25 26h14l-3 7c-1 6 0 10 5 15H23c5-5 6-9 5-15ZM21 49h22l3 7H18Z" />
    </>
  ),
  r: (
    <>
      <path d="M17 9h7v8h5V9h6v8h5V9h7v15l-7 5 2 19H22l2-19-7-5ZM19 49h26l3 7H16Z" />
      <path d="M24 25h16M24 44h16" fill="none" />
    </>
  ),
  n: (
    <>
      <path d="m20 13 8 2 8-6 4 7c8 7 7 14 3 22l-3 10H21c1-10 5-16 13-20l-7-1-7 6-7-5 8-10ZM19 49h26l3 7H16Z" />
      <path d="m28 19 3 1m6 8c5-6 1-11-1-13" fill="none" />
    </>
  ),
  b: (
    <>
      <path d="M32 7c-5 6-14 11-12 20 1 5 5 8 12 8s11-3 12-8c2-9-7-14-12-20ZM26 36h12l-2 6 7 6H21l7-6ZM20 49h24l4 7H16Z" />
      <path d="m35 16-7 12M25 32h14" fill="none" />
    </>
  ),
  q: (
    <>
      <path d="m15 19 10 9 7-15 7 15 10-9-7 24H22ZM22 44h20v4H22ZM19 49h26l3 7H16Z" />
      <circle cx="14" cy="16" r="3" />
      <circle cx="32" cy="10" r="3" />
      <circle cx="50" cy="16" r="3" />
      <path d="M24 37h16" fill="none" />
    </>
  ),
  k: (
    <>
      <path d="M29 6h6v6h6v6h-6v6h-6v-6h-6v-6h6Z" />
      <path d="M22 24c-7 0-9 6-6 11l8 9h16l8-9c3-5 1-11-6-11-5 0-8 3-10 6-2-3-5-6-10-6ZM22 44h20v4H22ZM19 49h26l3 7H16Z" />
      <path d="M24 38h16" fill="none" />
    </>
  ),
};

export default function Piece({ type, color, className = '', style }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`piece piece-${color} ${className}`}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="var(--piece-fill)"
        stroke="var(--piece-stroke)"
        strokeWidth="1.65"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {shapes[type]}
      </g>
    </svg>
  );
}
