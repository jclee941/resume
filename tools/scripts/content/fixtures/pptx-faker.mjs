import { placeholderJpeg, placeholderPng } from './binaries.mjs';
import { fakeText } from './text-faker.mjs';
import { unzip, zip } from './zip.mjs';

const RUN_TEXT = /(<a:t>)([^<]*)(<\/a:t>)/g;
const PROPERTY_TEXT = />([^<>]+)</g;

/**
 * Fake a PPTX: slide and notes text and document properties become fake text; embedded images
 * become tiny placeholders. Slide structure, shape names, layouts, and themes stay, so tools that
 * fill the template find what they expect.
 * @param {Buffer} archive
 * @returns {Buffer}
 */
export function fakePptx(archive) {
  return zip(
    unzip(archive).map(([name, data]) => {
      if (/^ppt\/(?:slides|notesSlides)\/[^/]+\.xml$/.test(name)) {
        const xml = data
          .toString('utf8')
          .replace(RUN_TEXT, (_, open, text, close) => open + fakeText(text) + close);
        return [name, xml];
      }
      if (/^docProps\/[^/]+\.xml$/.test(name)) {
        const xml = data
          .toString('utf8')
          .replace(PROPERTY_TEXT, (_, text) => `>${fakeText(text)}<`);
        return [name, xml];
      }
      if (/^ppt\/media\/.+\.png$/i.test(name)) return [name, placeholderPng()];
      if (/^docProps\/thumbnail\.jpe?g$/i.test(name)) return [name, placeholderJpeg()];
      return [name, data];
    })
  );
}
