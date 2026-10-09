/**
 * Mobile menu enhancement. The menu itself is a native popover and works
 * without this script; this only closes it after a link is chosen, so
 * same-page anchors (/#work) do not leave the menu open over the content.
 */
const menu = document.getElementById('mobile-menu');

if (menu && 'hidePopover' in menu) {
  menu.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a')) {
      menu.hidePopover();
    }
  });
}
