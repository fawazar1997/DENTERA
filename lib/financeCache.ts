import { unstable_cache } from "next/cache";
import { loadDashboard as loadDashboardFresh } from "./finance";
import { loadPnl as loadPnlFresh } from "./acctPnl";
import { loadAcctTab as loadAcctTabFresh } from "./acctLoad";
import { loadOps as loadOpsFresh } from "./opsData";
import { FINANCE_DATA_TAG } from "./privateBlob";

// The dashboards' views, built once and kept until the data changes: every write under finance/,
// acct/ or ops/ (the robot's uploads, a settings save) clears the tag (lib/privateBlob.ts), so a tab
// switch reads one small cached view instead of every month's files again. Ten minutes at most as a
// safety net (doctors' names come from the site database, which doesn't clear this tag).
const options = { tags: [FINANCE_DATA_TAG], revalidate: 600 };

export const loadDashboard = unstable_cache(loadDashboardFresh, ["finance-view", "dashboard"], options);
export const loadPnl = unstable_cache(loadPnlFresh, ["finance-view", "pnl"], options);
export const loadAcctTab = unstable_cache(loadAcctTabFresh, ["finance-view", "acct-tab"], options);
export const loadOps = unstable_cache(loadOpsFresh, ["finance-view", "ops"], options);
