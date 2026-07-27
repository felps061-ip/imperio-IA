const NAMED_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) =>
      String.fromCodePoint(Number.parseInt(number, 16)),
    )
    .replace(/&([a-z]+);/gi, (entity, name) => NAMED_ENTITIES[name] ?? entity);
}

export function stripHtml(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAttributes(tag) {
  const attributes = {};
  const pattern =
    /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of String(tag).matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = decodeHtml(
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }
  return attributes;
}

export function formFields(html) {
  const fields = new Map();

  for (const match of String(html).matchAll(/<input\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const name = attributes.name;
    const type = String(attributes.type || "text").toLowerCase();
    if (
      !name ||
      "disabled" in attributes ||
      ["button", "file", "image", "reset", "submit"].includes(type)
    ) {
      continue;
    }
    if (
      ["checkbox", "radio"].includes(type) &&
      !/\schecked(?:\s|=|>)/i.test(match[0])
    ) {
      continue;
    }
    fields.set(name, attributes.value ?? (type === "checkbox" ? "on" : ""));
  }

  for (const match of String(html).matchAll(
    /<select\b([^>]*)>([\s\S]*?)<\/select>/gi,
  )) {
    const attributes = parseAttributes(`<select ${match[1]}>`);
    if (!attributes.name || "disabled" in attributes) continue;
    const options = [...match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)];
    const selected =
      options.find((option) => /\sselected(?:\s|=|>)/i.test(option[0])) ??
      options[0];
    if (!selected) continue;
    const optionAttributes = parseAttributes(`<option ${selected[1]}>`);
    fields.set(
      attributes.name,
      optionAttributes.value ?? stripHtml(selected[2]),
    );
  }

  for (const match of String(html).matchAll(
    /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi,
  )) {
    const attributes = parseAttributes(`<textarea ${match[1]}>`);
    if (attributes.name && !("disabled" in attributes)) {
      fields.set(attributes.name, decodeHtml(match[2]));
    }
  }

  return fields;
}

export function buildPostBody(
  html,
  { eventTarget = "", eventArgument = "", values = {} } = {},
) {
  const fields = formFields(html);
  fields.set("__EVENTTARGET", eventTarget);
  fields.set("__EVENTARGUMENT", eventArgument);
  for (const [name, value] of Object.entries(values)) {
    fields.set(name, String(value ?? ""));
  }
  return new URLSearchParams([...fields.entries()]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tagById(html, id) {
  const pattern = new RegExp(
    `<(?:input|a|div|span|select|table)\\b[^>]*\\bid=(?:"|')${escapeRegExp(
      id,
    )}(?:"|')[^>]*>`,
    "i",
  );
  return String(html).match(pattern)?.[0] ?? "";
}

export function controlName(html, id) {
  const tag = tagById(html, id);
  return parseAttributes(tag).name ?? "";
}

export function selectOptions(html, id) {
  const pattern = new RegExp(
    `<select\\b([^>]*)\\bid=(?:"|')${escapeRegExp(
      id,
    )}(?:"|')([^>]*)>([\\s\\S]*?)<\\/select>`,
    "i",
  );
  const match = String(html).match(pattern);
  if (!match) return [];
  return [...match[3].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(
    (option) => {
      const attributes = parseAttributes(`<option ${option[1]}>`);
      return {
        value: attributes.value ?? stripHtml(option[2]),
        label: stripHtml(option[2]),
        selected: /\sselected(?:\s|=|>)/i.test(option[0]),
      };
    },
  );
}

export function hrefById(html, id) {
  return parseAttributes(tagById(html, id)).href ?? "";
}

export function findIdEnding(html, suffix, tagName = "[a-z]+") {
  return findIdsEnding(html, suffix, tagName)[0] ?? "";
}

export function findIdsEnding(html, suffix, tagName = "[a-z]+") {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*\\bid=(?:"|')([^"']*${escapeRegExp(
      suffix,
    )})(?:"|')[^>]*>`,
    "gi",
  );
  return [...String(html).matchAll(pattern)].map((match) => match[1]);
}

export function findIdMatching(html, expression, tagName = "[a-z]+") {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*\\bid=(?:"|')([^"']+)(?:"|')[^>]*>`,
    "gi",
  );
  for (const match of String(html).matchAll(pattern)) {
    expression.lastIndex = 0;
    if (expression.test(match[1])) return match[1];
  }
  return "";
}

export function postbackTargetForId(html, id) {
  const source = String(html);
  const tag = tagById(source, id);
  const decodedTag = decodeHtml(tag).replace(/\\(['"])/g, "$1");
  const direct =
    decodedTag.match(/__doPostBack\(\s*['"]([^'"]+)['"]/i)?.[1] ??
    decodedTag.match(
      /WebForm_PostBackOptions\(\s*['"]([^'"]+)['"]/i,
    )?.[1] ??
    decodedTag.match(/,\s*['"]([^'"]*\$[^'"]+)['"]\s*,/i)?.[1];
  if (direct) return direct;

  const index = tag ? source.indexOf(tag) : -1;
  if (index < 0) return "";
  const nearby = decodeHtml(
    source.slice(Math.max(0, index - 1800), index + 900),
  );
  const targets = [
    ...nearby.matchAll(/['"]([^'"]*(?:\$btn|\$bt)[^'"]*)['"]/gi),
  ];
  return targets.at(-1)?.[1] ?? "";
}

export function inputDetails(html, id) {
  const tag = tagById(html, id);
  const attributes = parseAttributes(tag);
  return {
    id,
    name: attributes.name ?? "",
    value: attributes.value ?? "on",
    disabled: /\sdisabled(?:\s|=|>)/i.test(tag),
    postbackTarget: postbackTargetForId(html, id),
  };
}

function tableHtmlById(html, id) {
  const source = String(html);
  const startPattern = new RegExp(
    `<table\\b[^>]*\\bid=(?:"|')${escapeRegExp(id)}(?:"|')[^>]*>`,
    "i",
  );
  const startMatch = startPattern.exec(source);
  if (!startMatch) return "";
  const start = startMatch.index;
  const end = source.indexOf("</table>", start);
  return end < 0 ? "" : source.slice(start, end + 8);
}

function normalizeHeader(value) {
  return stripHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function parseC6Offers(html, tableId, termId) {
  const table = tableHtmlById(html, tableId);
  if (!table) return [];
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (row) =>
      [...row[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(
        (cell) => stripHtml(cell[1]),
      ),
  );
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const indexFor = (...aliases) =>
    headers.findIndex((header) =>
      aliases.some((alias) => header.includes(normalizeHeader(alias))),
    );
  const indexes = {
    table: indexFor("tabela"),
    description: indexFor("descrição tabela", "descricao tabela"),
    monthlyRate: indexFor("tx. jr", "taxa"),
    installment: indexFor("vlr parc", "valor parcela"),
    clientValue: indexFor("vlr cli", "valor cliente"),
  };
  const termOption =
    selectOptions(html, termId).find((option) => option.selected) ??
    selectOptions(html, termId)[0];
  const term = termOption?.label || termOption?.value || "108";
  const at = (row, index) => (index >= 0 ? row[index] ?? "" : "");

  return rows
    .slice(1)
    .map((row) => ({
      table: at(row, indexes.table),
      description: at(row, indexes.description),
      monthlyRate: at(row, indexes.monthlyRate),
      installment: at(row, indexes.installment),
      clientValue: at(row, indexes.clientValue),
      term,
    }))
    .filter(
      (row) =>
        !normalizeHeader(Object.values(row).join(" ")).includes(
          "nao existem dados para exibicao",
        ) && Object.values(row).some(Boolean),
    );
}

export function textById(html, id) {
  const pattern = new RegExp(
    `<(?:span|a|td|label)\\b[^>]*\\bid=(?:"|')${escapeRegExp(
      id,
    )}(?:"|')[^>]*>([\\s\\S]*?)<\\/(?:span|a|td|label)>`,
    "i",
  );
  return stripHtml(String(html).match(pattern)?.[1] ?? "");
}
