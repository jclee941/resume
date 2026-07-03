export async function downloadCaptchaImage(page, captchaSrc) {
  const raw = await page.evaluate(async (src) => {
    const res = await fetch(src, { credentials: 'include' });
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    return {
      base64: dataUrl.split(',')[1],
      mime: mimeMatch ? mimeMatch[1] : 'image/bmp',
    };
  }, captchaSrc);

  if (!raw.mime.includes('bmp')) return raw;

  const fs = await import('fs');
  const { execSync } = await import('child_process');
  const tmpBmp = `/tmp/jk-captcha-${Date.now()}.bmp`;
  const tmpPng = tmpBmp.replace(/\.bmp$/, '.png');
  try {
    fs.writeFileSync(tmpBmp, Buffer.from(raw.base64, 'base64'));
    execSync(`python3 -c "from PIL import Image; Image.open('${tmpBmp}').save('${tmpPng}')"`, {
      stdio: 'ignore',
    });
    const pngBuf = fs.readFileSync(tmpPng);
    return { base64: pngBuf.toString('base64'), mime: 'image/png' };
  } catch {
    return raw;
  } finally {
    fs.rmSync(tmpBmp, { force: true });
    fs.rmSync(tmpPng, { force: true });
  }
}
