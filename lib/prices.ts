import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { readBlobJson, writeBlobJson } from "./privateBlob";
import { getSettings } from "./db";
import type { Dictionary } from "./dictionaries";
import type { Locale } from "./i18n";
import type { PriceListLabels } from "@/components/PriceListView";

// The clinic's internal price list, for staff only. It's uploaded as an
// Excel file in the control panel and kept in the private store (never in
// the code, which is public), and shown on a private link like the
// coordination directory.

export type PriceItem = { code: string; nameEn: string; nameAr: string; price: number };
export type PriceSection = { nameEn: string; nameAr: string; items: PriceItem[] };
export type PriceList = { sections: PriceSection[]; updatedAt: string };

const PRICES_PATH = "data/prices.json";
const CACHE_TAG = "dentera-prices";
const LOCAL_PATH = path.join(process.cwd(), "data", "prices.local.json");

/** True when `key` matches the price list link saved in the control panel. */
export async function isValidPricesKey(key: string): Promise<boolean> {
  const saved = (await getSettings()).pricesKey;
  if (!saved || !key) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readPriceList(): Promise<PriceList | null> {
  if (!isBlobConfigured()) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8")) as PriceList;
    } catch {
      return null;
    }
  }
  return (await readBlobJson<PriceList>(PRICES_PATH))?.data ?? null;
}

const readPriceListCached = unstable_cache(readPriceList, [CACHE_TAG], { tags: [CACHE_TAG] });

/** The saved price list (null until one is uploaded). */
export async function getPriceList(): Promise<PriceList | null> {
  return isBlobConfigured() ? readPriceListCached() : readPriceList();
}

/** Replaces the whole price list. */
export async function savePriceList(list: PriceList): Promise<void> {
  if (isBlobConfigured()) await writeBlobJson(PRICES_PATH, list);
  else fs.writeFileSync(LOCAL_PATH, JSON.stringify(list, null, 2));
  revalidateTag(CACHE_TAG);
}

// --- Excel import ---

function decodeXml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** The first worksheet's cells, as rows of { column letter: text }. */
function readFirstSheet(file: Uint8Array): Record<string, string>[] {
  const zip = unzipSync(file, {
    filter: (f) =>
      f.name === "xl/sharedStrings.xml" ||
      f.name === "xl/workbook.xml" ||
      f.name === "xl/_rels/workbook.xml.rels" ||
      /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name),
  });
  const text = (name: string) => (zip[name] ? strFromU8(zip[name]) : "");

  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decodeXml(m[1])
  );
  // The first sheet in the workbook's order (not necessarily sheet1.xml).
  const firstId = text("xl/workbook.xml").match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const target = firstId
    ? text("xl/_rels/workbook.xml.rels").match(
        new RegExp(`<Relationship\\b[^>]*Id="${firstId}"[^>]*Target="([^"]+)"`)
      )?.[1] ??
      text("xl/_rels/workbook.xml.rels").match(
        new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstId}"`)
      )?.[1]
    : undefined;
  const sheetName = target ? `xl/${target.replace(/^\/?xl\//, "").replace(/^\//, "")}` : "";
  const sheet = text(sheetName) || text("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("no-sheet");

  return [...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells: Record<string, string> = {};
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = c[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!col) continue;
      const type = c[1].match(/\bt="(\w+)"/)?.[1];
      const body = c[2] ?? "";
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s" && raw !== undefined) value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr") value = decodeXml(body.match(/<is>([\s\S]*?)<\/is>/)?.[1] ?? "");
      else if (raw !== undefined) value = decodeXml(raw);
      value = value.replace(/\s+/g, " ").trim();
      if (value) cells[col] = value;
    }
    return cells;
  });
}

/**
 * Reads the price list from an Excel file in the clinic's format: columns
 * A code, B English name, C price, D Arabic name. A row with no code and
 * text in B and C starts a section (B English, C Arabic). Anything else
 * (titles, the header row, signatures) is skipped.
 */
export function parsePriceWorkbook(file: Uint8Array): PriceList {
  const sections: PriceSection[] = [];
  for (const row of readFirstSheet(file)) {
    const code = row.A ?? "";
    const price = Number((row.C ?? "").replace(/[,\s]/g, ""));
    if (/^\d+$/.test(code) && Number.isFinite(price) && (row.B || row.D)) {
      if (sections.length === 0) sections.push({ nameEn: "", nameAr: "", items: [] });
      sections[sections.length - 1].items.push({
        code,
        nameEn: row.B ?? "",
        nameAr: row.D ?? "",
        price,
      });
    } else if (!code && row.B && row.C && !Number.isFinite(Number(row.C))) {
      sections.push({ nameEn: row.B, nameAr: row.C, items: [] });
    }
  }
  const kept = sections.filter((s) => s.items.length > 0);
  if (kept.reduce((n, s) => n + s.items.length, 0) === 0) throw new Error("no-items");
  return { sections: kept, updatedAt: new Date().toISOString() };
}

/** The price list page's texts, from the site dictionary. */
export function priceListLabels(dict: Dictionary, locale: Locale, list: PriceList): PriceListLabels {
  const a = dict.admin;
  return {
    updatedAt: new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Riyadh",
    }).format(new Date(list.updatedAt)),
    search: a.pricesSearch,
    allSections: a.pricesAllSections,
    code: a.pricesCode,
    currency: a.pricesCurrency,
    results: a.pricesResults,
    noMatches: a.pricesNoMatches,
    updated: a.pricesUpdated,
  };
}
