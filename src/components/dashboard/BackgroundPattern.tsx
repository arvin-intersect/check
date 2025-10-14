export const BackgroundPattern = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Intersecting lines pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="intersect-pattern"
            x="0"
            y="0"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Diagonal lines creating intersections */}
            <line
              x1="0"
              y1="0"
              x2="200"
              y2="200"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary"
            />
            <line
              x1="200"
              y1="0"
              x2="0"
              y2="200"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-accent"
            />
            <line
              x1="100"
              y1="0"
              x2="100"
              y2="200"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-merge-grey"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#intersect-pattern)" />
      </svg>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-surface-dark opacity-95" />
    </div>
  );
};
