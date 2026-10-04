const GRADIENTS = [
  "from-primary-500 to-primary-700",
  "from-ink-700 to-ink-900",
  "from-primary-600 to-ink-900",
  "from-accent-600 to-accent-800",
  "from-primary-700 to-accent-700",
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const cleaned = name.replace(/^Dr\.\s*|^د\.\s*/u, "");
  const parts = cleaned.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  className = "h-16 w-16 text-lg",
}: {
  name: string;
  className?: string;
}) {
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${gradient} ${className}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
