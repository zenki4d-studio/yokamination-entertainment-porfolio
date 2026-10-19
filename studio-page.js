(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  if (header) {
    const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
  }

  const carousel = document.querySelector('[data-team-carousel]');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('[data-team-slide]')];
  if (!slides.length) return;

  const counter = carousel.querySelector('[data-team-count]');
  const status = carousel.querySelector('[data-team-status]');
  const format = value => String(value).padStart(2, '0');
  let currentIndex = Math.max(0, slides.findIndex(slide => !slide.hidden));

  function select(index, updateHash = false) {
    const focusedSlide = slides.find(slide => slide.contains(document.activeElement));
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== currentIndex;
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${slide.dataset.name}, ${slideIndex + 1} of ${slides.length}`);
    });

    const active = slides[currentIndex];
    if (focusedSlide && focusedSlide !== active) carousel.focus({ preventScroll: true });
    if (counter) counter.textContent = `${format(currentIndex + 1)} / ${format(slides.length)}`;
    if (status) status.textContent = `${active.dataset.name}, ${currentIndex + 1} of ${slides.length}`;
    if (updateHash && active.id) {
      // Replacing the URL preserves focus and scroll position without adding history entries.
      history.replaceState(history.state, '', `#${active.id}`);
    }
  }

  function selectFromHash() {
    const index = slides.findIndex(slide => `#${slide.id}` === location.hash);
    if (index !== -1) select(index);
  }

  carousel.querySelector('[data-team-prev]')?.addEventListener('click', () => select(currentIndex - 1, true));
  carousel.querySelector('[data-team-next]')?.addEventListener('click', () => select(currentIndex + 1, true));
  carousel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;

    let index;
    if (event.key === 'ArrowLeft') index = currentIndex - 1;
    else if (event.key === 'ArrowRight') index = currentIndex + 1;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = slides.length - 1;
    else return;

    event.preventDefault();
    select(index, true);
  });

  select(currentIndex);
  selectFromHash();
  window.addEventListener('hashchange', selectFromHash);
})();
