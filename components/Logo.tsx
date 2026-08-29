const TOOTH_PATH =
  "M50 6c-9 0-14 4-19 4s-11-4-18-4C6 6 2 14 2 24c0 14 7 24 12 34 3 6 4 13 5 20 1 8 3 16 9 16 7 0 8-13 10-21 1-5 4-9 12-9s11 4 12 9c2 8 3 21 10 21 6 0 8-8 9-16 1-7 2-14 5-20 5-10 12-20 12-34 0-10-4-18-15-18-7 0-13 4-18 4z";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 108"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d={TOOTH_PATH}
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* fingerprint swirl, crown left */}
      <g stroke="currentColor" strokeWidth="2.5" fill="none">
        <circle cx="33" cy="26" r="4.5" />
        <path d="M33 17.5a8.5 8.5 0 1 1 0 17" />
        <path d="M33 12a14 14 0 1 1 0 28" />
      </g>
      {/* fingerprint swirl, crown right */}
      <g stroke="currentColor" strokeWidth="2.5" fill="none">
        <circle cx="58" cy="24" r="4" />
        <path d="M58 16.5a7.5 7.5 0 1 0 0 15" />
      </g>
      {/* root grain, left */}
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M23 62c4 6 6 13 7 20" />
        <path d="M29 60c4 6 5 13 6 19" />
      </g>
      {/* root grain, right */}
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M77 62c-4 6-6 13-7 20" />
        <path d="M71 60c-4 6-5 13-6 19" />
      </g>
    </svg>
  );
}

export function Logo({
  locale,
  siteName,
  markClassName = "h-9 w-9",
  markColorClassName = "text-accent-500",
  textColorClassName = "text-primary-700",
  textClassName = "text-2xl",
}: {
  locale: "en" | "ar";
  siteName: string;
  markClassName?: string;
  markColorClassName?: string;
  textColorClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={`${markClassName} ${markColorClassName}`} />
      <span
        className={`${textClassName} ${textColorClassName} ${
          locale === "ar" ? "font-arabic" : "font-sans"
        } font-light lowercase tracking-tight`}
      >
        {siteName}
      </span>
    </span>
  );
}
