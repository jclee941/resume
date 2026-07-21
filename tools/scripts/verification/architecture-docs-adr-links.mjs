import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

function adrReference(value, sourceFile, adrDir) {
  const match = value?.match(/\[ADR[- ]?(\d{4})[^\]]*\]\(([^)]+)\)/i);
  if (!match) return { kind: 'none' };
  const [, labelId, href] = match;
  if (/^(?:[a-z]+:|#)/i.test(href)) return { kind: 'invalid' };
  let targetFile;
  try {
    targetFile = resolve(
      dirname(sourceFile),
      decodeURIComponent(href.split('#', 1)[0].split('?', 1)[0])
    );
  } catch (error) {
    if (error instanceof URIError) return { kind: 'invalid' };
    throw error;
  }
  if (!existsSync(targetFile)) return { kind: 'invalid' };
  const targetName = basename(targetFile).match(/^(\d{4})-.*\.md$/);
  if (!targetName || dirname(realpathSync(targetFile)) !== realpathSync(adrDir)) {
    return { kind: 'invalid' };
  }
  return { kind: 'adr', labelId, targetId: targetName[1] };
}

function mismatchDiagnostic(file, labelId, targetId) {
  return {
    code: 'adr-link-label-mismatch',
    file,
    message: `ADR link label ${labelId} does not match href target ${targetId}`,
  };
}

function supersedesValue(text) {
  const match = text.match(/^(?:- Supersedes:|\*\*Supersedes:\*\*)\s*(.+)$/im);
  return match?.[1]?.replace(/^\*\*(.*)\*\*$/, '$1').trim();
}

export function validateAdrSupersession(adrs, adrDir, diagnostics) {
  const ids = new Set(adrs.map(({ id }) => id).filter(Boolean));
  for (const adr of adrs) {
    if (!adr.id) continue;
    if (adr.status === 'Superseded') {
      const reference = adrReference(adr.rawStatus, adr.absoluteFile, adrDir);
      if (reference.kind !== 'adr' || !ids.has(reference.targetId)) {
        diagnostics.push({
          code: 'missing-supersession-target',
          file: adr.file,
          message: 'Superseded status must link an existing ADR',
        });
      } else {
        if (reference.labelId !== reference.targetId) {
          diagnostics.push(mismatchDiagnostic(adr.file, reference.labelId, reference.targetId));
        }
        if (reference.targetId <= adr.id) {
          diagnostics.push({
            code: 'invalid-supersession-direction',
            file: adr.file,
            message: 'Superseded status must point to a higher ADR ID',
          });
        }
      }
    }
    const supersedes = supersedesValue(adr.text);
    const reference = adrReference(supersedes, adr.absoluteFile, adrDir);
    if (
      reference.kind === 'invalid' ||
      (reference.kind === 'adr' && !ids.has(reference.targetId))
    ) {
      diagnostics.push({
        code: 'missing-supersedes-target',
        file: adr.file,
        message: 'Supersedes must link an existing ADR',
      });
    } else if (reference.kind === 'adr') {
      if (reference.labelId !== reference.targetId) {
        diagnostics.push(mismatchDiagnostic(adr.file, reference.labelId, reference.targetId));
      }
      if (reference.targetId >= adr.id) {
        diagnostics.push({
          code: 'invalid-supersedes-direction',
          file: adr.file,
          message: 'Supersedes must point to a lower ADR ID',
        });
      }
    }
  }
}
