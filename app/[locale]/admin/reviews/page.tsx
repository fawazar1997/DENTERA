import { headers } from "next/headers";
import { CheckCircle2, Link2, Star } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getActiveBranches, getSettings } from "@/lib/db";
import {
  getGoogleConnection,
  getReviewsData,
  isGoogleConfigured,
  listGoogleLocations,
  type GoogleLocation,
} from "@/lib/googleReviews";
import {
  disconnectGoogleAction,
  saveGoogleLocationsAction,
  saveShownReviewsAction,
  syncGoogleReviewsAction,
} from "@/lib/reviewActions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ReviewsPicker } from "@/components/admin/ReviewsPicker";
import { requireAdminPage } from "@/lib/adminSession";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

const NOTICES = ["connected", "denied", "failed", "state_mismatch", "not_configured"] as const;

function Step({
  title,
  done,
  children,
}: {
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-extrabold text-ink-950">
        {done && <CheckCircle2 className="h-5 w-5 text-primary-500" />}
        {title}
      </h2>
      <div className="mt-3 text-sm text-ink-600">{children}</div>
    </section>
  );
}

export default async function AdminReviewsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { google?: string };
}) {
  await requireAdminPage(params.locale);
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const t = dict.admin;
  const ar = locale === "ar";

  const configured = isGoogleConfigured();
  const [connection, data, settings, branches] = await Promise.all([
    getGoogleConnection().catch(() => null),
    getReviewsData(),
    getSettings(),
    getActiveBranches(),
  ]);
  let locations: GoogleLocation[] = [];
  let locationsError = "";
  if (connection) {
    try {
      locations = await listGoogleLocations();
    } catch (error) {
      locationsError = error instanceof Error ? error.message : String(error);
    }
  }

  const host = headers().get("x-forwarded-host") ?? headers().get("host") ?? "";
  const proto = headers().get("x-forwarded-proto")?.split(",")[0] ?? "https";
  const redirectUri = `${proto}://${host}/api/admin/google/callback`;
  const branchNames = Object.fromEntries(branches.map((b) => [b.id, ar ? b.nameAr : b.nameEn]));
  const linked = settings.googleLocations ?? {};
  const notice = NOTICES.find((n) => n === searchParams.google);
  const when = (iso: string) =>
    new Date(iso).toLocaleString(ar ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    });

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{t.reviews}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{t.reviewsSubtitle}</p>

      {notice && (
        <p className="mt-6 rounded-xl bg-primary-100 px-4 py-3 text-sm font-bold text-ink-900">
          {t[`reviewsNotice_${notice}`]}
        </p>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Step title={t.reviewsStepSetup} done={configured}>
          <p>{configured ? t.reviewsConfigured : t.reviewsNotConfigured}</p>
          <p className="mt-3 font-bold text-ink-900">{t.reviewsRedirectUri}</p>
          <code dir="ltr" className="mt-1 block break-all rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-900">
            {redirectUri}
          </code>
        </Step>

        <Step title={t.reviewsStepConnect} done={Boolean(connection)}>
          {connection ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                {t.reviewsConnectedAs} <span dir="ltr" className="font-bold text-ink-900">{connection.email ?? "Google"}</span>
              </p>
              <form action={disconnectGoogleAction}>
                <button type="submit" className="btn-outline px-4 py-2 text-sm">
                  {t.reviewsDisconnect}
                </button>
              </form>
            </div>
          ) : (
            <>
              <p>{t.reviewsConnectHint}</p>
              {configured && (
                <a href={`/api/admin/google/connect?locale=${locale}`} className="btn-primary mt-4 inline-flex">
                  <Link2 className="h-4 w-4" />
                  {t.reviewsConnect}
                </a>
              )}
            </>
          )}
        </Step>

        {connection && (
          <Step title={t.reviewsStepLink} done={Object.keys(linked).length > 0}>
            {locationsError ? (
              <p className="rounded-lg bg-accent-100 px-3 py-2 font-bold text-ink-900">
                {t.reviewsLocationsError} <span dir="ltr">{locationsError}</span>
              </p>
            ) : locations.length === 0 ? (
              <p>{t.reviewsNoLocations}</p>
            ) : (
              <form action={saveGoogleLocationsAction} className="space-y-3">
                {branches.map((branch) => (
                  <label key={branch.id} className="block">
                    <span className="label">{ar ? branch.nameAr : branch.nameEn}</span>
                    <select name={`location_${branch.id}`} defaultValue={linked[branch.id] ?? ""} className="input">
                      <option value="">{t.reviewsChooseLocation}</option>
                      {locations.map((location) => (
                        <option key={location.name} value={location.name}>
                          {location.title}
                          {location.address ? ` — ${location.address}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <SubmitButton label={t.save} savedLabel={t.saved} />
              </form>
            )}
          </Step>
        )}

        {connection && (
          <Step title={t.reviewsStepSync} done={Boolean(data.syncedAt)}>
            <p>
              {data.syncedAt ? `${t.reviewsLastSync}: ${when(data.syncedAt)}` : t.reviewsNeverSynced} {t.reviewsAutoSync}
            </p>
            {data.summaries.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {data.summaries.map((s) => (
                  <li key={s.branchId} className="flex items-center gap-2 font-bold text-ink-900">
                    <Star className="h-4 w-4 fill-primary-500 text-primary-500" />
                    {branchNames[s.branchId] ?? s.branchId}: {s.averageRating?.toFixed(1) ?? "—"} ·{" "}
                    {s.totalReviewCount ?? data.reviews.filter((r) => r.branchId === s.branchId).length} {t.reviewsCount}
                  </li>
                ))}
              </ul>
            )}
            {data.lastError && (
              <p className="mt-3 rounded-lg bg-accent-100 px-3 py-2 font-bold text-ink-900">
                {t.reviewsSyncError} <span dir="ltr">{data.lastError}</span>
              </p>
            )}
            <form action={syncGoogleReviewsAction} className="mt-4">
              <SubmitButton label={t.reviewsSyncNow} savedLabel={t.saved} />
            </form>
          </Step>
        )}
      </div>

      {data.reviews.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-extrabold text-ink-950">{t.reviewsStepPick}</h2>
          <form action={saveShownReviewsAction} className="mt-4">
            <ReviewsPicker
              reviews={data.reviews}
              initialShown={settings.shownReviews ?? []}
              branchNames={branchNames}
              locale={locale}
              labels={{
                shownTitle: t.reviewsShownTitle,
                shownEmpty: t.reviewsShownEmpty,
                all: t.reviewsAll,
                allBranches: t.reviewsAllBranches,
                allStars: t.reviewsAllStars,
                starsAtLeast: t.reviewsStarsAtLeast,
                withText: t.reviewsWithText,
                search: t.reviewsSearch,
                show: t.reviewsShow,
                more: t.reviewsMore,
                none: t.reviewsNone,
                anonymous: t.reviewsAnonymous,
                reply: t.reviewsReply,
                remove: t.reviewsRemove,
                moveUp: t.moveUp,
                moveDown: t.moveDown,
                save: t.save,
                saved: t.saved,
              }}
            />
          </form>
        </section>
      )}
    </div>
  );
}
