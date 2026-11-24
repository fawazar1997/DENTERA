import { unzipSync, strFromU8 } from "fflate";

// Reading uploaded spreadsheets (Excel .xlsx and .csv) in the control panel,
// without a library: an .xlsx is a zip of XML files.

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

/**
 * The first worksheet's cells, as rows of { column letter: text }. Numbers
 * (dates included, as Excel day serials) come back as written in the file.
 */
export function readFirstSheet(file: Uint8Array): Record<string, string>[] {
  const zip = unzipSync(file, {
    filter: (f) => /^\/?xl\/(sharedstrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/i.test(f.name),
  });
  // File names compared without case or a leading slash; XML tags without
  // their namespace prefix (some systems write <x:row>, <x:c>…).
  const files = new Map(Object.entries(zip).map(([name, bytes]) => [name.replace(/^\//, "").toLowerCase(), bytes]));
  const text = (name: string) => {
    const bytes = files.get(name.replace(/^\//, "").toLowerCase());
    return bytes ? strFromU8(bytes).replace(/<(\/?)[A-Za-z_][\w.-]*:(?=[A-Za-z_])/g, "<$1") : "";
  };

  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) =>
    decodeXml(m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, ""))
  );
  // The first sheet in the workbook's order (not necessarily sheet1.xml).
  const firstId = text("xl/workbook.xml").match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const rels = text("xl/_rels/workbook.xml.rels");
  const target = firstId
    ? rels.match(new RegExp(`<Relationship\\b[^>]*Id="${firstId}"[^>]*Target="([^"]+)"`))?.[1] ??
      rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstId}"`))?.[1]
    : undefined;
  const sheetName = target ? `xl/${target.replace(/^\/?xl\//, "").replace(/^\//, "")}` : "";
  const anySheet = [...files.keys()].filter((n) => n.startsWith("xl/worksheets/")).sort()[0] ?? "";
  const sheet = (sheetName && text(sheetName)) || text("xl/worksheets/sheet1.xml") || (anySheet && text(anySheet));
  if (!sheet) throw new Error("no-sheet");

  return [...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells: Record<string, string> = {};
    let next = 0; // cells written without a reference follow the previous one
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1].match(/\br="([A-Z]+)\d*"/)?.[1];
      const col = ref ?? columnLetters(next);
      next = columnIndex(col) + 1;
      const type = c[1].match(/\bt="(\w+)"/)?.[1];
      const body = c[2] ?? "";
      const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s" && raw !== undefined) value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr") value = decodeXml(body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/)?.[1] ?? "");
      else if (raw !== undefined) value = decodeXml(raw);
      value = value.replace(/\s+/g, " ").trim();
      if (value) cells[col] = value;
    }
    return cells;
  });
}

/** A 0-based index to column letters (0 → A, 27 → AB). */
function columnLetters(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Column letters to a 0-based index (A → 0, AB → 27). */
function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Parses CSV text (quoted fields, commas or semicolons, line breaks in quotes). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.replace(/\s+/g, " ").trim()));
}

/** An uploaded .xlsx or .csv file as rows of cells. */
export function readSpreadsheet(file: Uint8Array, fileName: string): string[][] {
  const isZip = file[0] === 0x50 && file[1] === 0x4b;
  if (isZip || /\.xlsx$/i.test(fileName)) {
    return readFirstSheet(file).map((cells) => {
      const row: string[] = [];
      for (const [col, value] of Object.entries(cells)) row[columnIndex(col)] = value;
      return Array.from(row, (v) => v ?? "");
    });
  }
  return parseCsv(new TextDecoder("utf-8").decode(file));
}
