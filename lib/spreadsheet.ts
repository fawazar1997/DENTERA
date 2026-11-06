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
