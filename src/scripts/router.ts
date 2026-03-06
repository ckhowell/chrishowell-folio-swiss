import gsap from 'gsap';
import {
  TRANSITION_BEFORE_PREPARATION,
  TRANSITION_PAGE_LOAD,
  isTransitionBeforePreparationEvent,
  type TransitionBeforePreparationEvent,
} from 'astro:transitions/client';

import { initPage, initSiteOnce, resetCustomCursor } from './animations';

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

  // Force reset custom cursor immediately on navigation
  resetCustomCursor();

  if (paragraphLines.length) {
    tl.to(
      paragraphLines,
      { yPercent: 105, duration: 0.35, stagger: 0.004 },
      0
    );
  }

  if (titleChars.length) {
    tl.to(titleChars, { yPercent: -120, autoAlpha: 0, duration: 0.35, stagger: 0.002 }, 0);
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
  // Clean up preloader on every page load (View Transitions re-create the element)
  handlePreloader();

  initSiteOnce();
  initPage();

  const main = document.querySelector('main');
  if (main) gsap.set(main, { clearProps: 'opacity,visibility,transform,pointerEvents' });
}

// ── PRELOADER CLEANUP ─────────────────────────────────
// CSS handles the animation; JS only does cleanup + sessionStorage
function handlePreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  // If already shown this session, skip immediately
  if (sessionStorage.getItem('ch_preloader_shown')) {
    preloader.classList.add('--skip');
    return;
  }

  // Mark as shown and schedule DOM removal after CSS animation completes
  sessionStorage.setItem('ch_preloader_shown', 'true');
  // CSS animation: 1.8s fill + 0.4s pause + 0.5s fade = 2.7s total
  setTimeout(() => {
    preloader.remove();
  }, 3000);
}

if (!window.__chRouterInited) {
  window.__chRouterInited = true;

  document.addEventListener(TRANSITION_BEFORE_PREPARATION, onBeforePreparation);
  document.addEventListener(TRANSITION_PAGE_LOAD, onPageLoad);

  // Initial load
  onPageLoad();
}
