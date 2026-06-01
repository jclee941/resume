/**
 * Guestbook (방명록) client module.
 *
 * Fetches existing entries from GET /api/guestbook and renders them, and wires
 * the form to POST /api/guestbook. All user-supplied text is rendered with
 * textContent (never innerHTML), so stored values cannot inject markup — the
 * guestbook is XSS-safe by construction on the client side.
 *
 * Anti-spam is handled server-side (honeypot + IP-hash rate limit + length
 * caps); the form simply forwards the hidden honeypot field.
 */

const API = '/api/guestbook';

function detectLocale() {
  const path = window.location.pathname;
  if (path.startsWith('/en')) return 'en';
  if (path.startsWith('/ja')) return 'ja';
  return 'ko';
}

function formatTimestamp(ms) {
  try {
    const d = new Date(ms);
    return d.toLocaleString(detectLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Build a single guestbook list item with XSS-safe DOM construction.
 * @param {{id:number,name:string,message:string,created_at:number}} entry
 * @returns {HTMLLIElement}
 */
function renderEntry(entry) {
  const li = document.createElement('li');
  li.className = 'guestbook-entry';
  li.dataset.id = String(entry.id);

  const header = document.createElement('div');
  header.className = 'guestbook-entry__header';

  const name = document.createElement('span');
  name.className = 'guestbook-entry__name';
  name.textContent = entry.name; // textContent → no HTML injection
  header.appendChild(name);

  const time = document.createElement('time');
  time.className = 'guestbook-entry__time';
  time.dateTime = new Date(entry.created_at).toISOString();
  time.textContent = formatTimestamp(entry.created_at);
  header.appendChild(time);

  const message = document.createElement('p');
  message.className = 'guestbook-entry__message';
  message.textContent = entry.message; // textContent → safe

  li.appendChild(header);
  li.appendChild(message);
  return li;
}

async function loadEntries(listEl) {
  try {
    const res = await fetch(`${API}?limit=50`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    listEl.replaceChildren();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'guestbook-entry guestbook-entry--empty';
      empty.textContent = '아직 방명록이 없습니다. 첫 메시지를 남겨보세요!';
      listEl.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    entries.forEach((e) => frag.appendChild(renderEntry(e)));
    listEl.appendChild(frag);
  } catch (err) {
    console.warn('[Guestbook] load failed:', err);
  }
}

export function initGuestbook() {
  const form = document.getElementById('guestbook-form');
  const listEl = document.getElementById('guestbook-list');
  const statusEl = document.getElementById('guestbook-status');
  if (!form || !listEl) return;

  loadEntries(listEl);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nameInput = document.getElementById('guestbook-name');
    const messageInput = document.getElementById('guestbook-message');
    const websiteInput = document.getElementById('guestbook-website');
    const submitBtn = form.querySelector('.guestbook-submit');

    const name = ((nameInput && nameInput.value) || '').trim();
    const message = ((messageInput && messageInput.value) || '').trim();
    if (!name || !message) {
      if (statusEl) statusEl.textContent = '이름과 메시지를 모두 입력해주세요.';
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = '';

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message,
          locale: detectLocale(),
          website: websiteInput ? websiteInput.value : '', // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data.entry) {
        // Prepend new entry (newest first), removing any empty placeholder.
        const placeholder = listEl.querySelector('.guestbook-entry--empty');
        if (placeholder) placeholder.remove();
        listEl.insertBefore(renderEntry(data.entry), listEl.firstChild);
        form.reset();
        if (statusEl) statusEl.textContent = '메시지가 등록되었습니다. 감사합니다!';
      } else if (res.status === 429) {
        if (statusEl) statusEl.textContent = data.error || '잠시 후 다시 시도해주세요.';
      } else {
        if (statusEl) statusEl.textContent = data.error || '등록에 실패했습니다.';
      }
    } catch (err) {
      console.warn('[Guestbook] submit failed:', err);
      if (statusEl) statusEl.textContent = '네트워크 오류가 발생했습니다.';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
