import { Phone } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";
import { telHref } from "@/lib/phone";

/**
 * Booking happens by phone: every "book" button is a tap-to-call link to
 * the booking number set in Control Panel → Texts & Numbers.
 */
export function CallButton({
  dict,
  label,
  variant = "primary",
  showNumber = true,
  className = "",
}: {
  dict: Dictionary;
  label?: string;
  variant?: "primary" | "accent" | "outline";
  showNumber?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "btn-primary",
    accent: "btn-accent",
    outline: "btn-outline",
  }[variant];

  return (
    <a href={telHref(dict.booking.phone)} className={`${styles} ${className}`}>
      <Phone className="h-4 w-4" />
      <span>{label ?? dict.booking.button}</span>
      {showNumber && (
        <span dir="ltr" className="font-bold tabular-nums">
          {dict.booking.phone}
        </span>
      )}
    </a>
  );
}
