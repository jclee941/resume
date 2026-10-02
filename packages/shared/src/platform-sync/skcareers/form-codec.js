/**
 * @typedef {{ name: string; value: string }} FormField
 * @typedef {Record<string, string | string[]>} FormObject
 */

const FIELD_TAG = /<(input|select|textarea)\b([^>]*)>/gi;
const SKIPPED_INPUT_TYPES = new Set(['file', 'submit', 'button', 'image', 'reset']);

/**
 * The fields a browser submits for this markup, in document order, with jQuery
 * serializeArray rules: disabled controls, file inputs and unchecked radios or checkboxes are
 * left out, and a select without a selected option submits its first option.
 * @param {string} markup
 * @returns {FormField[]}
 */
export function collectFormFields(markup) {
  /** @type {FormField[]} */
  const fields = [];
  for (const match of markup.matchAll(FIELD_TAG)) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const name = attribute(attrs, 'name');
    if (!name || hasFlag(attrs, 'disabled')) continue;
    const end = (match.index ?? 0) + match[0].length;
    if (tag === 'select') fields.push({ name, value: selectedOption(markup, end) });
    else if (tag === 'textarea') {
      fields.push({
        name,
        value: decodeEntities(markup.slice(end, markup.indexOf('</textarea>', end))),
      });
    } else {
      const type = (attribute(attrs, 'type') ?? 'text').toLowerCase();
      if (SKIPPED_INPUT_TYPES.has(type)) continue;
      if ((type === 'radio' || type === 'checkbox') && !hasFlag(attrs, 'checked')) continue;
      fields.push({ name, value: attribute(attrs, 'value') ?? (type === 'checkbox' ? 'on' : '') });
    }
  }
  return fields;
}

/**
 * serializeFormJSON from the site's common script: a name seen more than once becomes an
 * array in document order.
 * @param {FormField[]} fields
 * @returns {FormObject}
 */
export function toFormObject(fields) {
  /** @type {FormObject} */
  const form = {};
  for (const { name, value } of fields) {
    const existing = form[name];
    if (existing === undefined) form[name] = value;
    else form[name] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return form;
}

/**
 * The fields of the resume form (`form1`) on an editor page, or null when the page has none.
 * Item templates sit outside `form1`, so they are not part of the result.
 * @param {string} markup
 * @returns {FormObject | null}
 */
export function readResumeForm(markup) {
  const start = markup.indexOf('<form id="form1"');
  if (start === -1) return null;
  const end = markup.indexOf('</form>', start);
  return toFormObject(collectFormFields(markup.slice(start, end === -1 ? undefined : end)));
}

/**
 * GetJsonToEncParam from the site's common script, the `p` parameter of every save: arrays
 * are joined with a full-width comma, `&` and `=` inside values become their full-width
 * forms, the pairs are URI-encoded and base64-encoded, and `+` becomes `~univ~`.
 * @param {FormObject} form
 * @returns {string}
 */
export function encodeFormParam(form) {
  const pairs = Object.entries(form)
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      const text = Array.isArray(value)
        ? value.map((item) => item.replace(/\uFF0C/g, ',')).join('\uFF0C')
        : String(value);
      return `${key}=${text.replace(/&/g, '\uFF06').replace(/=/g, '\uFF1D')}`;
    });
  return btoa(encodeURIComponent(pairs.join('&'))).replace(/\+/g, '~univ~');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * @param {string} attrs
 * @param {string} name
 * @returns {string | undefined}
 */
function attribute(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  if (!match) return undefined;
  return decodeEntities(match[1] ?? match[2] ?? '');
}

/**
 * @param {string} markup
 * @param {number} from index just past the opening <select> tag
 * @returns {string}
 */
function selectedOption(markup, from) {
  const options = [
    ...markup.slice(from, markup.indexOf('</select>', from)).matchAll(/<option\b([^>]*)>/gi),
  ];
  const chosen = options.find((option) => hasFlag(option[1], 'selected')) ?? options[0];
  return chosen ? (attribute(chosen[1], 'value') ?? '') : '';
}

/**
 * Whether a tag carries a bare attribute such as `disabled`; a quoted value such as
 * class="disabled" does not count.
 * @param {string} attrs
 * @param {string} flag
 * @returns {boolean}
 */
function hasFlag(attrs, flag) {
  const bare = attrs.replace(/"[^"]*"|'[^']*'/g, '""');
  return new RegExp(`(?:^|\\s)${flag}(?=[\\s=/]|$)`, 'i').test(bare);
}
