const paths = {
  profile: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 8v8" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18m6-18v18" />
    </>
  ),
  book: (
    <>
      <path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 17h16M8 4v6m8 4v6" />
      <circle cx="8" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </>
  ),
  undo: (
    <>
      <path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14" />
    </>
  ),
  flip: (
    <>
      <path d="m17 2 4 4-4 4M3 11V6h18M7 22l-4-4 4-4m14-1v5H3" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14m8-14v14" />
    </>
  ),
  play: (
    <>
      <path d="m8 4 13 8-13 8Z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V3m0 1c5-4 9 5 15 0v11c-6 5-10-4-15 0" />
    </>
  ),
  hand: (
    <>
      <path d="M4 13h4l3-3 3 2 6-3M2 10l3 8 4-1m13-9-3 9-4-1m-6 0 4 4 5-3M8 8l4-3 7 4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L20 5" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M6 18 18 6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: (
    <>
      <path d="M20.8 13.2A9 9 0 0 1 10.8 3.2a9 9 0 1 0 10 10Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 4 5 8 8 9 3-1 8-5 8-9V6ZM8 12l3 3 5-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m4 11v-3a6 6 0 0 0-4-5" />
    </>
  ),
  chevron: (
    <>
      <path d="m9 5 7 7-7 7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.1" />
    </>
  ),
};

export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.board}
    </svg>
  );
}
