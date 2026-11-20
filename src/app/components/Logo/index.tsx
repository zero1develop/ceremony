// Zero1develop monogram, inlined so the generated-artifact-only public/
// directory does not need to carry a branding asset.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Zero1develop"
    >
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
      />
      <text
        x="50"
        y="63"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="monospace"
        fontSize="38"
        fontWeight="700"
      >
        Z1
      </text>
    </svg>
  );
}
