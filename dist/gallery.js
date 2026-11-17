import { caseStudies } from './cases-data.js?v=20261117-cases';

export const caseGalleries = Object.fromEntries(caseStudies.map(study => [study.galleryId, { title: study.category, items: study.images }]));

export function getGalleryFrame(caseId, index = 0) {
  const gallery = Object.hasOwn(caseGalleries, caseId) ? caseGalleries[caseId] : null;
  if (!gallery) return null;
  const total = gallery.items.length;
  const position = Math.max(0, Math.min(total - 1, Number.isInteger(index) ? index : 0));
  return { title: gallery.title, item: gallery.items[position], index: position, total, hasPrevious: position > 0, hasNext: position < total - 1 };
}

export function initializeCaseGalleries() {
  const dialog = document.getElementById('case-gallery');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const image = document.getElementById('gallery-image');
  const loading = document.getElementById('gallery-loading');
  const error = document.getElementById('gallery-error');
  const previous = document.getElementById('gallery-previous');
  const next = document.getElementById('gallery-next');
  let activeId = '';
  let activeIndex = 0;
  let opener;

  image.addEventListener('load', () => { loading.hidden = true; image.hidden = false; });
  image.addEventListener('error', () => { loading.hidden = true; error.hidden = false; });

  function render(index) {
    const frame = getGalleryFrame(activeId, index);
    if (!frame) return;
    activeIndex = frame.index;
    document.getElementById('gallery-title').textContent = frame.title;
    document.getElementById('gallery-caption').textContent = frame.item.caption;
    document.getElementById('gallery-count').textContent = `Снимок ${frame.index + 1} из ${frame.total}`;
    document.getElementById('gallery-original').href = frame.item.src;
    const focusedControl = document.activeElement;
    previous.disabled = !frame.hasPrevious;
    next.disabled = !frame.hasNext;
    if ((focusedControl === previous && previous.disabled) || (focusedControl === next && next.disabled)) {
      const availableControl = !previous.disabled ? previous : !next.disabled ? next : document.getElementById('gallery-close');
      availableControl.focus({ preventScroll: true });
    }
    dialog.querySelector('.gallery-arrows').hidden = frame.total < 2;
    image.hidden = true;
    error.hidden = true;
    loading.hidden = false;
    image.alt = frame.item.alt;
    image.src = frame.item.src;
    // Cached images may already be complete without another load event.
    if (image.complete && image.naturalWidth > 0) { loading.hidden = true; image.hidden = false; }
  }

  document.querySelectorAll('a[data-gallery]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!getGalleryFrame(link.dataset.gallery)) return;
      event.preventDefault();
      activeId = link.dataset.gallery;
      opener = link;
      render(Number(link.dataset.galleryIndex) || 0);
      document.documentElement.classList.add('gallery-open');
      dialog.showModal();
    });
  });
  previous.addEventListener('click', () => render(activeIndex - 1));
  next.addEventListener('click', () => render(activeIndex + 1));
  document.getElementById('gallery-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    const positions = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: getGalleryFrame(activeId).total - 1 };
    if (!Object.hasOwn(positions, event.key)) return;
    event.preventDefault();
    render(positions[event.key]);
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('gallery-open');
    opener?.focus({ preventScroll: true });
  });
}
