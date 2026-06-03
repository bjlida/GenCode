import { useId } from "react";

export function GenCodeLogoMark({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const leftGrad = `gencode-left-${uid}`;
  const rightGrad = `gencode-right-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient
          id={leftGrad}
          x1="3"
          y1="21"
          x2="11"
          y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9333EA" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient
          id={rightGrad}
          x1="21"
          y1="3"
          x2="13"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path
        d="M4.25 9.5C4.25 6.2 6.8 3.5 10 3.5h1.2C8.8 3.5 6.75 5.8 6.75 9v6c0 3.2 2.05 5.5 4.45 5.5H10c-3.2 0-5.75-2.7-5.75-6V9.5Z"
        fill={`url(#${leftGrad})`}
      />
      <path
        d="M19.75 9.5c0-3.3-2.55-6-5.75-6h-1.2c2.4 0 4.45 2.3 4.45 5.5v6c0 3.2-2.05 5.5-4.45 5.5h1.2c3.2 0 5.75-2.7 5.75-6V9.5Z"
        fill={`url(#${rightGrad})`}
      />
      <rect
        x="9.35"
        y="9.35"
        width="5.3"
        height="5.3"
        rx="1.15"
        transform="rotate(45 12 12)"
        fill="#475569"
        className="dark:fill-slate-300"
      />
    </svg>
  );
}
