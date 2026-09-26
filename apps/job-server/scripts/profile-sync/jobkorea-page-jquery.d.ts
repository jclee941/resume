// JobKorea's resume editor page ships jQuery. The page.evaluate() and
// page.waitForFunction() callbacks under scripts/profile-sync run inside that
// page and use its global `$`; this declares only the calls they make.
interface JobKoreaFormField {
  name: string;
  value: string;
}

interface JobKoreaJQuery {
  readonly length: number;
  readonly [index: number]: HTMLElement;
  filter(
    predicate: (this: HTMLElement, index: number, element: HTMLElement) => boolean
  ): JobKoreaJQuery;
  find(selector: string): JobKoreaJQuery;
  first(): JobKoreaJQuery;
  parent(): JobKoreaJQuery;
  is(selector: string): boolean;
  text(): string;
  serializeArray(): JobKoreaFormField[];
}

interface JobKoreaJqXHR {
  readonly statusText: string;
  fail(callback: (xhr: JobKoreaJqXHR) => void): JobKoreaJqXHR;
}

interface JobKoreaJQueryStatic {
  (selector: string | HTMLElement): JobKoreaJQuery;
  post(
    url: string,
    data: Record<string, unknown> | JobKoreaFormField[],
    success: (response: Record<string, unknown>) => void
  ): JobKoreaJqXHR;
}

declare const $: JobKoreaJQueryStatic;
