import gsap from 'gsap';
import {
  TRANSITION_BEFORE_PREPARATION,
  TRANSITION_PAGE_LOAD,
  isTransitionBeforePreparationEvent,
  type TransitionBeforePreparationEvent,
} from 'astro:transitions/client';

import { initPage, initSiteOnce } from './animations';

declare global {
  interface Window {
    __chRouterInited?: boolean;
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animatePageLeave(signal?: AbortSignal) {
  if (prefersReducedMotion()) return Promise.resolve();
  if (signal?.aborted) return Promise.resolve();

  const main = document.querySelector('main');
  if (!main) return Promise.resolve();

  const hasViewTransitions = 'startViewTransition' in document;

  const paragraphLines = Array.from(
    document.querySelectorAll('[data-animation="paragraph"].--is-visible .line')
  );
  const titleChars = Array.from(
    document.querySelectorAll(
      '[data-animation="title"].--is-visible .char, [data-animation="title-in"].--is-visible .char'
    )
  );
  const opaInEls = Array.from(
    document.querySelectorAll('[data-animation="opa-in"].--is-visible')
  );

  const tl = gsap.timeline({
    defaults: { ease: 'expo.inOut' },
  });

  tl.set(main, { pointerEvents: 'none' }, 0);

  if (paragraphLines.length) {
    tl.to(
      paragraphLines,
      { yPercent: 105, duration: 0.35, stagger: 0.004 },
      0
    );
  }

  if (titleChars.length) {
    tl.to(titleChars, { yPercent: -120, duration: 0.35, stagger: 0.002 }, 0);
  }

  if (opaInEls.length) {
    tl.to(opaInEls, { autoAlpha: 0, duration: 0.25 }, 0);
  }

  if (!hasViewTransitions) {
    tl.to(main, { autoAlpha: 0, y: -8, duration: 0.35 }, 0);
  } else {
    tl.to(main, { y: -6, duration: 0.35 }, 0);
  }

  const p = new Promise<void>((resolve) => {
    tl.eventCallback('onComplete', () => resolve());
  });

  if (signal) {
    const onAbort = () => tl.kill();
    signal.addEventListener('abort', onAbort, { once: true });
    return p.finally(() => signal.removeEventListener('abort', onAbort));
  }

  return p;
}

function onBeforePreparation(ev: Event) {
  if (!isTransitionBeforePreparationEvent(ev)) return;
  const event = ev as TransitionBeforePreparationEvent;

  const originalLoader = event.loader;
  event.loader = async () => {
    await animatePageLeave(event.signal);
    await originalLoader();
  };
}

function onPageLoad() {
  initSiteOnce();
  initPage();

  const main = document.querySelector('main');
  if (main) gsap.set(main, { clearProps: 'opacity,visibility,transform,pointerEvents' });
}

// ── CLI-STYLE PRELOADER ─────────────────────────────────
function runPreloader(): Promise<void> {
  const preloader = document.getElementById('preloader');
  const barEl = document.getElementById('preloader-bar');
  const blankEl = document.getElementById('preloader-blank');
  const percentEl = document.getElementById('preloader-percent');

  // If elements don't exist or already shown this session, skip
  if (!preloader || !barEl || !blankEl || !percentEl) {
    return Promise.resolve();
  }

  if (sessionStorage.getItem('ch_preloader_shown')) {
    preloader.classList.add('--hidden');
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const TOTAL = 50;
    const DURATION = 1800;
    const start = Date.now();

    function ease(t: number): number {
      return 1 - Math.pow(1 - t, 4);
    }

    function update() {
      const t = Math.min((Date.now() - start) / DURATION, 1);
      const pct = Math.round(ease(t) * 100);
      const filled = Math.round((pct / 100) * TOTAL);
      const empty = TOTAL - filled;

      barEl!.textContent = '='.repeat(filled);
      barEl!.style.width = ((filled / TOTAL) * 100) + '%';
      blankEl!.textContent = ' '.repeat(empty);
      blankEl!.style.width = ((empty / TOTAL) * 100) + '%';

      let s = String(pct);
      while (s.length < 3) s = '\u00A0' + s;
      percentEl!.textContent = s + '%';

      if (pct >= 100) {
        clearInterval(timer);
        // Brief pause at 100%, then fade out
        setTimeout(() => {
          preloader!.classList.add('--done');
          sessionStorage.setItem('ch_preloader_shown', 'true');
          setTimeout(() => {
            preloader!.remove();
            resolve();
          }, 600);
        }, 400);
      }
    }

    // setInterval is more reliable than rAF in Safari during page load
    const timer = setInterval(update, 16);
    update(); // First frame immediately
  });
}

if (!window.__chRouterInited) {
  window.__chRouterInited = true;

  document.addEventListener(TRANSITION_BEFORE_PREPARATION, onBeforePreparation);
  document.addEventListener(TRANSITION_PAGE_LOAD, onPageLoad);

  // Initial load: run preloader first, then init page
  runPreloader().then(() => {
    onPageLoad();
  });
}

