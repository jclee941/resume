import { crc32, inflateRawSync } from 'node:zlib';

const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1; // 1980-01-01, keeps the output deterministic

/**
 * @param {number[]} values
 * @param {number[]} widths
 * @returns {Buffer}
 */
function fields(values, widths) {
  const buffer = Buffer.alloc(widths.reduce((a, b) => a + b, 0));
  let at = 0;
  values.forEach((value, index) => {
    if (widths[index] === 4) buffer.writeUInt32LE(value, at);
    else buffer.writeUInt16LE(value, at);
    at += widths[index];
  });
  return buffer;
}

/**
 * Deterministic ZIP archive using the stored (uncompressed) method.
 * @param {Array<[string, string | Buffer]>} entries name and content pairs, in order
 * @returns {Buffer}
 */
export function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const data = Buffer.from(content);
    const nameBytes = Buffer.from(name, 'utf8');
    const common = [20, 0, 0, DOS_TIME, DOS_DATE, crc32(data), data.length, data.length];
    const local = Buffer.concat([
      Buffer.from('PK\x03\x04', 'latin1'),
      fields([...common, nameBytes.length, 0], [2, 2, 2, 2, 2, 4, 4, 4, 2, 2]),
      nameBytes,
      data,
    ]);
    centrals.push(
      Buffer.concat([
        Buffer.from('PK\x01\x02', 'latin1'),
        fields(
          [20, ...common, nameBytes.length, 0, 0, 0, 0, 0, offset],
          [2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4]
        ),
        nameBytes,
      ])
    );
    locals.push(local);
    offset += local.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.concat([
    Buffer.from('PK\x05\x06', 'latin1'),
    fields(
      [0, 0, entries.length, entries.length, directory.length, offset, 0],
      [2, 2, 2, 2, 4, 4, 2]
    ),
  ]);
  return Buffer.concat([...locals, directory, end]);
}

/** @returns {Buffer} a valid one-paragraph DOCX */
export function placeholderDocx() {
  const rels = 'http://schemas.openxmlformats.org/package/2006/relationships';
  return zip([
    [
      '[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ],
    [
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${rels}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ],
    [
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Fixture placeholder</w:t></w:r></w:p></w:body></w:document>',
    ],
  ]);
}

/**
 * Read every file entry of a ZIP archive that uses the stored or deflate method.
 * @param {Buffer} archive
 * @returns {Array<[string, Buffer]>} name and content pairs, in archive order
 */
export function unzip(archive) {
  const end = archive.lastIndexOf(Buffer.from('PK\x05\x06', 'latin1'));
  if (end < 0) throw new Error('not a zip archive');
  const count = archive.readUInt16LE(end + 10);
  const entries = [];
  let at = archive.readUInt32LE(end + 16);
  for (let index = 0; index < count; index += 1) {
    const method = archive.readUInt16LE(at + 10);
    const size = archive.readUInt32LE(at + 20);
    const nameLength = archive.readUInt16LE(at + 28);
    const extraLength = archive.readUInt16LE(at + 30);
    const commentLength = archive.readUInt16LE(at + 32);
    const local = archive.readUInt32LE(at + 42);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const raw = archive.subarray(start, start + size);
    if (method !== 0 && method !== 8) throw new Error(`unsupported zip method ${method}`);
    if (!name.endsWith('/')) entries.push([name, method === 8 ? inflateRawSync(raw) : raw]);
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
