/**
 * "Copy address" buttons. Hidden in the HTML and revealed only when the
 * Clipboard API is available, so the button never appears without working.
 * Uses textContent (not innerHTML), which is safe under Trusted Types.
 */
const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-copy]');

if (navigator.clipboard && window.isSecureContext) {
  for (const button of buttons) {
    button.hidden = false;
    const label = button.querySelector<HTMLElement>('[data-copy-label]');
    const status = button.closest('.contact-channels')?.querySelector<HTMLElement>('[data-copy-status]');
    const original = label?.textContent ?? 'Copy address';

    button.addEventListener('click', async () => {
      const value = button.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(value);
        if (label) label.textContent = 'Copied';
        if (status) status.textContent = `Copied ${value} to the clipboard.`;
      } catch {
        if (status) status.textContent = 'Copy failed. Select the address and copy it manually.';
      }
      window.setTimeout(() => {
        if (label) label.textContent = original;
      }, 2000);
    });
  }
}
