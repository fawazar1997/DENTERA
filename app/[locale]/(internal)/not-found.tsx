// Wrong or revoked directory link: a bare 404 that reveals nothing.
export default function InternalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <p className="text-6xl font-extrabold text-primary-500">404</p>
      <p className="text-ink-600">Page not found — الصفحة غير موجودة</p>
    </div>
  );
}
