import { DATA_URLS } from "./config.js";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (values[index] ?? "").trim();
    });
    return record;
  });
}

async function fetchCsv(url, name) {
  const response = await fetch(`${url}&cacheBust=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`${name}: HTTP ${response.status}`);
  }

  const text = await response.text();
  if (/^\s*</.test(text)) {
    throw new Error(`${name}: se recibió HTML en lugar de CSV`);
  }
  return parseCsv(text);
}

export async function loadRawData() {
  const entries = Object.entries(DATA_URLS);
  const loaded = await Promise.all(
    entries.map(async ([key, url]) => [key, await fetchCsv(url, key)])
  );
  return Object.fromEntries(loaded);
}
