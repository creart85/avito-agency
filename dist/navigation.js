export function getCasePageStarts(count, visible) {
  if (count === 0) return [];
  const last = Math.max(0, count - visible);
  const starts = [];
  for (let index = 0; index < last; index += visible) starts.push(index);
  starts.push(last);
  return starts;
}

export function getAdjacentCaseStart(starts, current, direction) {
  if (direction > 0) return starts.find(start => start > current + 0.05) ?? starts.at(-1) ?? 0;
  return starts.filter(start => start < current - 0.05).at(-1) ?? starts[0] ?? 0;
}

export function initializePageNavigation() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const topButton = document.getElementById('back-to-top');
  if (topButton) {
    const updateTopButton = () => { topButton.hidden = window.scrollY <= 400; };
    window.addEventListener('scroll', updateTopButton, { passive: true });
    updateTopButton();
    topButton.addEventListener('click', () => {
      document.getElementById('hero-title')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
  }

  const track = document.getElementById('cases-track');
  if (!track) return;
  const cards = [...track.querySelectorAll('.case')];
  const controls = document.getElementById('case-controls');
  const previous = document.getElementById('cases-previous');
  const next = document.getElementById('cases-next');
  const dots = document.getElementById('case-dots');
  const counter = document.getElementById('case-counter');
  const announcement = document.getElementById('cases-announcement');
  let visible = 1;
  let starts = [0];
  let activeStart = 0;

  const step = () => cards.length > 1 ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left : track.clientWidth;
  const position = () => track.scrollLeft / (step() || 1);
  const goTo = (index, animate = true) => {
    const card = cards[index];
    if (!card) return;
    const left = track.scrollLeft + card.getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollTo({ left, behavior: animate && !reducedMotion.matches ? 'smooth' : 'auto' });
  };

  function updateControls() {
    activeStart = Math.max(0, Math.min(cards.length - visible, Math.round(position())));
    const end = Math.min(cards.length, activeStart + visible);
    previous.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    counter.textContent = `${String(activeStart + 1).padStart(2, '0')} — ${String(end).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    announcement.textContent = `Кейсы с ${activeStart + 1} по ${end} из ${cards.length}.`;
    const nearest = starts.reduce((best, start) => Math.abs(start - activeStart) < Math.abs(best - activeStart) ? start : best, starts[0]);
    dots.querySelectorAll('button').forEach(button => button.setAttribute('aria-current', String(Number(button.dataset.caseStart) === nearest)));
  }

  function refreshLayout() {
    visible = Math.min(cards.length, parseInt(getComputedStyle(track).getPropertyValue('--visible-cases'), 10) || 1);
    starts = getCasePageStarts(cards.length, visible);
    controls.hidden = starts.length <= 1;
    dots.replaceChildren(...starts.map(start => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.caseStart = String(start);
      button.setAttribute('aria-label', `Показать кейсы с ${start + 1} по ${Math.min(cards.length, start + visible)}`);
      button.setAttribute('aria-controls', 'cases-track');
      return button;
    }));
    goTo(Math.min(activeStart, Math.max(0, cards.length - visible)), false);
    updateControls();
  }

  previous.addEventListener('click', () => goTo(getAdjacentCaseStart(starts, position(), -1)));
  next.addEventListener('click', () => goTo(getAdjacentCaseStart(starts, position(), 1)));
  dots.addEventListener('click', event => {
    const button = event.target.closest('[data-case-start]');
    if (button) goTo(Number(button.dataset.caseStart));
  });
  track.addEventListener('keydown', event => {
    const directions = { ArrowLeft: -1, ArrowRight: 1 };
    if (directions[event.key]) {
      event.preventDefault();
      goTo(getAdjacentCaseStart(starts, position(), directions[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      goTo(event.key === 'Home' ? 0 : starts.at(-1));
    }
  });
  track.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('resize', refreshLayout, { passive: true });
  refreshLayout();
}
