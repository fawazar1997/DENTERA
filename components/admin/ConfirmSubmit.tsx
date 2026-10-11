"use client";

/** Submit button that asks for confirmation first (for destructive steps). */
export function ConfirmSubmit({
  label,
  confirmText,
  className = "btn-outline",
}: {
  label: string;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
