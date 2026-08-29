import Image from "next/image";

export function Logo({
  variant = "color",
  className = "h-10 w-auto",
  priority = false,
}: {
  variant?: "color" | "bone";
  className?: string;
  priority?: boolean;
}) {
  const src =
    variant === "bone"
      ? "/brand/dentera-logo-bone.png"
      : "/brand/dentera-logo-color.png";

  return (
    <Image
      src={src}
      alt="Dentera"
      width={784}
      height={328}
      priority={priority}
      className={className}
    />
  );
}

export function LogoIcon({
  className = "h-9 w-9",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/dentera-icon.png"
      alt="Dentera"
      width={500}
      height={500}
      priority={priority}
      className={className}
    />
  );
}
