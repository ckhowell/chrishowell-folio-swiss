import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { TextPlugin } from 'gsap/TextPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin);

declare global {
  interface Window {
    __chSiteInited?: boolean;
  }
}

// ── STATE VARIABLES ─────────────────────────
// Smooth scroll instance (Lenis)
let lenis: Lenis | null = null;
// Intersection Observers for triggering animations as elements enter viewport
let paragraphObserver: IntersectionObserver | null = null;
let titleObserver: IntersectionObserver | null = null;
let opaObserver: IntersectionObserver | null = null;
// Off-screen element used to measure text width for the cursor "pill" hover effect
let pillMeasureEl: HTMLSpanElement | null = null;
// Holds the reference to the ticker callback for the "Next Project" preview animation
let nextProjectTickerCallback: (() => void) | null = null;

/**
 * Utility: Check if the user has requested reduced motion at the OS level.
 * We use this to disable complex animations and smooth scrolling if needed.
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Core Initialization: Runs only once when the site is first loaded.
 * Sets up global features like Smooth Scrolling and the Custom Cursor.
 */
export function initSiteOnce() {
  // Guard to prevent multiple initializations (e.g., during Astro View Transitions)
  if (window.__chSiteInited) return;
  window.__chSiteInited = true;

  // Initialize Smooth Scrolling (Lenis) if motion is enabled
  if (!prefersReducedMotion()) {
    lenis = new Lenis({
      duration: 1.2, // Scroll speed/timing
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easing curve
      touchMultiplier: 2,
    });

    // Link Lenis scroll events to GSAP ScrollTrigger so they stay in sync
    lenis.on('scroll', ScrollTrigger.update);

    // Use GSAP's high-performance ticker to drive the Lenis scroll animation
    gsap.ticker.add((time) => {
      lenis?.raf(time * 1000);
    });
    // Required to prevent scroll "jumps" during frame drops
    gsap.ticker.lagSmoothing(0);
  }

  // Setup the custom mouse cursor
  initCustomCursorOnce();
}

// ── PARAGRAPH REVEAL — SplitText line-by-line mask ──────────────────
function initParagraphAnimations() {
  paragraphObserver?.disconnect();

  const elements = document.querySelectorAll(
    '[data-animation="paragraph"]:not(.--is-visible)'
  );

  paragraphObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delay = parseFloat(el.dataset.animationDelay || '0');

          el.classList.add('--is-visible');
          el.style.visibility = 'visible';

          const isDestabilize = el.classList.contains('hover-destabilize');

          new SplitText(el, {
            type: isDestabilize ? 'lines, words, chars' : 'lines, words',
            autoSplit: true,
            mask: 'lines',
            linesClass: 'line',
            charsClass: isDestabilize ? 'char destabilize-char' : undefined,
            onSplit: (self: any) => {
              if (isDestabilize && self.chars) {
                self.chars.forEach((char: HTMLElement) => {
                  const rx = (Math.random() - 0.5) * 0.75; // -0.375 to 0.375 px (95% reduction of 15px)
                  const ry = (Math.random() - 0.5) * 1;
                  const rrot = (Math.random() - 1.5) * 5.0; // -0.5 to 0.5 deg (95% reduction of 20deg)
                  char.style.setProperty('--dx', `${rx}px`);
                  char.style.setProperty('--dy', `${ry}px`);
                  char.style.setProperty('--drot', `${rrot}deg`);
                });
              }

              return gsap.from(self.lines, {
                duration: 0.9,
                yPercent: 105,
                stagger: 0.04,
                delay,
                ease: 'expo.out',
              });
            },
          });

          paragraphObserver?.unobserve(el);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach((el) => paragraphObserver?.observe(el));
}

// ── TITLE REVEAL — Primitive Graphics Block Render ────────────
function initTitleAnimations() {
  titleObserver?.disconnect();

  const elements = document.querySelectorAll(
    '[data-animation="title"]:not(.--is-visible), [data-animation="title-in"]:not(.--is-visible)'
  );

  titleObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;

          el.classList.add('--is-visible');
          el.style.visibility = 'visible';

          // Split into characters
          new SplitText(el, {
            type: 'chars',
            charsClass: 'char',
            onSplit: (self: any) => {
              const chars = self.chars;

              // Initially hide all characters
              gsap.set(chars, { opacity: 0 });

              // Stagger the reveal of characters
              chars.forEach((charEl: HTMLElement, i: number) => {
                const isWhitespace = charEl.textContent === ' ' || !charEl.textContent;

                // If it's a space, just make it visible immediately and skip the block effect
                if (isWhitespace) {
                  gsap.set(charEl, { opacity: 1 });
                  return;
                }

                // Temporary object to track the animation state
                const state = { val: 0 };
                const originalChar = charEl.textContent;

                gsap.to(state, {
                  val: 1,
                  duration: 0.15,
                  delay: i * 0.05 + 0.1, // Stagger left-to-right rapidly
                  onStart: () => {
                    // Start by showing a solid block
                    charEl.style.opacity = '1';
                    charEl.textContent = '█';
                  },
                  onComplete: () => {
                    // Turn it back into the real letter instantly
                    charEl.textContent = originalChar;
                  }
                });
              });
            },
          });

          titleObserver?.unobserve(el);
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => titleObserver?.observe(el));
}

// ── GALLERY IMAGE REVEAL — Staggered fade-up ────────────────────────
function initGalleryAnimations() {
  const galleries = document.querySelectorAll('.project-gallery');
  if (!galleries.length) return;

  galleries.forEach((gallery) => {
    const images = gallery.querySelectorAll('img');
    if (!images.length) return;

    images.forEach((img) => {
      gsap.set(img, { autoAlpha: 0, yPercent: 15 });

      ScrollTrigger.create({
        trigger: img,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(img, {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: 'power3.out',
          });
        },
      });
    });
  });
}

// ── OPACITY-IN ANIMATIONS (CSS transition based) ─────────────────────
function initOpaInAnimations() {
  opaObserver?.disconnect();

  const elements = document.querySelectorAll(
    '[data-animation="opa-in"]:not(.--is-visible)'
  );

  opaObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('--is-visible');
          opaObserver?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => opaObserver?.observe(el));
}

// ── CUSTOM CURSOR — Mouse-following dot (basecreate lerp) ───────────
function initCustomCursorOnce() {
  if (!window.matchMedia('(hover: hover)').matches) return;

  const cursor = document.querySelector('.custom-cursor') as HTMLElement;
  if (!cursor) return;

  let mouseX = -100;
  let mouseY = -100;
  let posX = -100;
  let posY = -100;

  // Track mouse position
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Hide when mouse leaves the browser window
  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('--init');
  });
  document.addEventListener('mouseenter', () => {
    cursor.classList.add('--init');
  });

  // GSAP ticker — simple lerp matching basecreate: pos += (target - pos) / 5
  gsap.ticker.add(() => {
    posX += (mouseX - posX) / 5;
    posY += (mouseY - posY) / 5;

    gsap.set(cursor, { left: posX, top: posY });
  });
}

function bindCursorInitToMain() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const cursor = document.querySelector('.custom-cursor') as HTMLElement;
  if (!cursor) return;

  document.querySelector('main')?.addEventListener(
    'mousemove',
    () => cursor.classList.add('--init'),
    { once: true }
  );
}
// Force reset the cursor when navigating away from a page
export function resetCustomCursor() {
  const cursor = document.querySelector('.custom-cursor');
  if (!cursor) return;

  const dot = cursor.querySelector('.cursor-dot') as HTMLElement;
  const pill = cursor.querySelector('.cursor-pill') as HTMLElement;
  const pillBg = cursor.querySelector('.cursor-pill-bg') as HTMLElement;
  const textWrap = cursor.querySelector('.cursor-text-wrap') as HTMLElement;

  if (dot && pill && pillBg && textWrap) {
    // Kill any running tweens on the cursor children
    gsap.killTweensOf([dot, pill, pillBg, textWrap]);

    // Reset to default CSS properties
    gsap.set(dot, { scale: 1, clearProps: 'all' });
    gsap.set(pill, { width: 0, opacity: 0, clearProps: 'all' });
    gsap.set(pillBg, { scale: 0, clearProps: 'all' });
    gsap.set(textWrap, { opacity: 0, clearProps: 'all' });
  }
}

// ── PILL HOVER — Pill animation + ticker on thumbnail hover ─────────
function initPillHover() {
  if (!window.matchMedia('(hover: hover)').matches) return;

  const cursor = document.querySelector('.custom-cursor');
  if (!cursor) return;

  const dot = cursor.querySelector('.cursor-dot') as HTMLElement;
  const pill = cursor.querySelector('.cursor-pill') as HTMLElement;
  const pillBg = cursor.querySelector('.cursor-pill-bg') as HTMLElement;
  const textWrap = cursor.querySelector('.cursor-text-wrap') as HTMLElement;
  const texts = cursor.querySelectorAll('.cursor-text');

  if (!dot || !pill || !pillBg || !textWrap || texts.length < 2) return;

  let pillTimeline: gsap.core.Timeline | null = null;

  // Hidden measurement container — avoids flash from toggling pill visibility
  if (!pillMeasureEl) {
    pillMeasureEl = document.createElement('span');
    pillMeasureEl.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;font-size:0.75rem;' +
      'font-weight:500;text-transform:uppercase;letter-spacing:0.05em;padding-right:0.5rem;';
    document.body.appendChild(pillMeasureEl);
  }

  // All elements with data-cursor-text
  const hoverTargets = document.querySelectorAll('[data-cursor-text]');

  hoverTargets.forEach((target) => {
    target.addEventListener('mouseenter', () => {
      const label = (target as HTMLElement).dataset.cursorText || '';

      // Set text content on both spans
      texts.forEach((t) => (t.textContent = label));

      // Measure via offscreen element — no pill flash
      pillMeasureEl!.textContent = label;
      const pillWidth = 56; // 3.5rem to match height for a perfect circle

      // Kill any existing animations
      if (pillTimeline) pillTimeline.kill();

      gsap.set(textWrap, { opacity: 0 });

      // ── Animate pill IN ──
      pillTimeline = gsap.timeline();
      pillTimeline
        // 1. Shrink the dot
        .to(dot, {
          scale: 0,
          duration: 0.2,
          ease: 'power2.in',
        })
        // 2. Expand the pill with spring overshoot
        .to(
          pill,
          {
            width: pillWidth,
            opacity: 1,
            duration: 0.45,
            ease: 'back.out(1.4)',
          },
          '<0.05'
        )
        // 3. Scale in the dark background from center
        .to(
          pillBg,
          {
            scale: 1,
            duration: 0.35,
            ease: 'power3.out',
          },
          '<'
        )
        // 4. Fade in the text (ticker is already running)
        .to(
          textWrap,
          {
            opacity: 1,
            duration: 0.2,
            ease: 'power2.out',
          },
          '-=0.15'
        );
    });

    target.addEventListener('mouseleave', () => {
      // Kill running animations
      if (pillTimeline) pillTimeline.kill();

      // ── Animate pill OUT ──
      pillTimeline = gsap.timeline();
      pillTimeline
        // 1. Fade out text
        .to(textWrap, { opacity: 0, duration: 0.15 })
        // 2. Collapse the pill
        .to(
          pill,
          {
            width: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'power3.in',
          },
          '<0.05'
        )
        // 3. Scale out the background
        .to(
          pillBg,
          {
            scale: 0,
            duration: 0.25,
          },
          '<'
        )
        // 5. Bounce the dot back
        .to(
          dot,
          {
            scale: 1,
            duration: 0.35,
            ease: 'back.out(2)',
          },
          '-=0.2'
        );
    });
  });
}

// ── PROJECT HOVER EFFECTS — Class toggling + color overlay + title sync ──
function initProjectHoverEffects() {
  if (!window.matchMedia('(hover: hover)').matches) return;

  const hoverGroup = document.querySelector('.projects-hover-group');
  if (!hoverGroup) return;

  const items = hoverGroup.querySelectorAll('.projects__item');
  const titles = document.querySelectorAll('.projects-titles .projects__title');
  const colorOverlay = document.querySelector('.color-overlay') as HTMLElement;

  // Shared activate/deactivate helpers
  function activateProject(index: string) {
    const item = hoverGroup!.querySelector(`.projects__item[data-project-index="${index}"]`);
    const link = item?.querySelector('.projects__link') as HTMLElement;

    // Add --no-hover to ALL items, then swap hovered one
    items.forEach((li) => {
      li.classList.add('--no-hover');
      li.classList.remove('--hover');
    });
    if (item) {
      item.classList.remove('--no-hover');
      item.classList.add('--hover');
    }

    // Background color overlay
    if (colorOverlay && link) {
      const bgColor = link.dataset.backgroundColor;
      if (bgColor) {
        colorOverlay.style.backgroundColor = bgColor;
        colorOverlay.classList.add('--active');
      }
    }

    // Right-column title highlight
    titles.forEach((t) => t.classList.remove('--is-active'));
    const match = document.querySelector(
      `.projects-titles .projects__title[data-project-index="${index}"]`
    );
    if (match) match.classList.add('--is-active');
  }

  function deactivateAll() {
    items.forEach((li) => {
      li.classList.remove('--no-hover');
      li.classList.remove('--hover');
    });

    if (colorOverlay) {
      colorOverlay.classList.remove('--active');
      colorOverlay.removeAttribute('style');
    }

    titles.forEach((t) => t.classList.remove('--is-active'));
  }

  // ── Image thumb hover ──
  items.forEach((item) => {
    const thumb = item.querySelector('.projects__thumb') as HTMLElement;
    if (!thumb) return;

    const index = item.getAttribute('data-project-index') || '';

    thumb.addEventListener('mouseenter', () => activateProject(index));
    thumb.addEventListener('mouseleave', () => deactivateAll());
  });

  // ── Right-column title hover ──
  titles.forEach((title) => {
    const index = title.getAttribute('data-project-index') || '';

    title.addEventListener('mouseenter', () => activateProject(index));

    title.addEventListener('mouseleave', () => deactivateAll());
  });
}
// ── NEXT PROJECT PREVIEW — Mouse-following thumbnail on hover ────────
function initNextProjectPreview() {
  if (!window.matchMedia('(hover: hover)').matches) return;

  const section = document.querySelector('.next-project') as HTMLElement;
  const links = Array.from(
    document.querySelectorAll('.next-project__link[data-preview-src]')
  ) as HTMLElement[];
  const preview = document.querySelector('.next-project__preview') as HTMLElement;
  const previewImg = preview?.querySelector(
    '.next-project__preview-img'
  ) as HTMLImageElement | null;
  if (!section || links.length === 0 || !preview || !previewImg) return;

  let mouseX = 0;
  let mouseY = 0;
  let previewX = 0;
  let previewY = 0;
  let activeLink: HTMLElement | null = null;
  let tickerCallback: (() => void) | null = null;

  // Offset so image appears beside cursor, not centered on it
  const offsetX = -preview.offsetWidth * 0.5;
  const offsetY = -preview.offsetHeight * 0.5;

  // Track mouse within section
  section.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  links.forEach((link) => {
    link.addEventListener('mouseenter', () => {
      activeLink = link;

      const nextSrc = link.dataset.previewSrc;
      if (nextSrc && previewImg.src !== nextSrc) {
        previewImg.src = nextSrc;
      }

      preview.classList.add('--active');

      if (!tickerCallback) {
        tickerCallback = () => {
          const dt = 1.0 - Math.pow(0.85, gsap.ticker.deltaRatio());

          previewX += (mouseX - previewX) * dt;
          previewY += (mouseY - previewY) * dt;

          const vx = mouseX - previewX;
          const rotation = vx * 0.08;

          gsap.set(preview, {
            x: previewX + offsetX,
            y: previewY + offsetY,
            rotation,
          });
        };
        gsap.ticker.add(tickerCallback);
        nextProjectTickerCallback = tickerCallback;
      }
    });

    link.addEventListener('mouseleave', () => {
      if (activeLink === link) {
        activeLink = null;
        preview.classList.remove('--active');
      }

      setTimeout(() => {
        if (!activeLink && tickerCallback) {
          gsap.ticker.remove(tickerCallback);
          tickerCallback = null;
          nextProjectTickerCallback = null;
        }
      }, 600);
    });
  });

  // Snap position on first enter to avoid flying in from corner
  section.addEventListener('mouseenter', (e) => {
    previewX = e.clientX;
    previewY = e.clientY;
  });
}

export function cleanupPage() {
  paragraphObserver?.disconnect();
  paragraphObserver = null;

  titleObserver?.disconnect();
  titleObserver = null;

  opaObserver?.disconnect();
  opaObserver = null;

  if (nextProjectTickerCallback) {
    gsap.ticker.remove(nextProjectTickerCallback);
    nextProjectTickerCallback = null;
  }

  ScrollTrigger.getAll().forEach((t) => t.kill());
}

// Header scroll animation removed per user request to keep nav items visible

// ── FEATURED WORK SCROLL ANIMATION ────────────────────────────────────
function initFeaturedWorkScroll() {
  const spotlightSection = document.querySelector('.spotlight') as HTMLElement;
  if (!spotlightSection) return;

  const projectIndex = document.querySelector('.project-index h1') as HTMLElement;
  const projectImgs = document.querySelectorAll('.project-img');
  const projectImagesContainer = document.querySelector('.project-images') as HTMLElement;
  const projectNames = document.querySelectorAll('.project-name-link');
  const projectNamesContainer = document.querySelector('.project-names') as HTMLElement;
  const totalProjectCount = projectNames.length;

  if (!projectIndex || !projectImagesContainer || !projectNamesContainer || totalProjectCount === 0) return;

  const spotlightSectionHeight = spotlightSection.offsetHeight;
  const spotlightSectionPadding = parseFloat(getComputedStyle(spotlightSection).padding);

  // Calculate dynamic header height offset so project names stop below the header
  const header = document.querySelector('.header') as HTMLElement;
  const headerHeight = header ? header.offsetHeight : 80; // fallback to 80px if header not found
  const headerOffset = headerHeight + 150; // add 150px visual buffer below header

  const projectIndexHeight = projectIndex.offsetHeight;
  const containerHeight = projectNamesContainer.offsetHeight;
  const imagesHeight = projectImagesContainer.offsetHeight;

  const moveDistanceIndex = spotlightSectionHeight - spotlightSectionPadding * 2 - projectIndexHeight;
  const moveDistanceNames = Math.max(0, window.innerHeight - headerOffset - containerHeight - spotlightSectionPadding);

  const moveDistanceImages = window.innerHeight - imagesHeight;



  ScrollTrigger.create({
    trigger: '.spotlight',
    start: 'top top',
    end: `+=${window.innerHeight * 5}px`,
    pin: true,
    pinSpacing: true,
    scrub: 1,
    anticipatePin: 1,
    onUpdate: (self) => {
      const progress = self.progress;

      // Calculate currentIndex slightly differently.
      // We want it to be 1 at progress=0, and totalProjectCount at progress=1.
      const rawIndex = progress * totalProjectCount;
      // We effectively use Math.floor, but handle the very end (progress=1) carefully.
      const targetIndex = Math.min(Math.max(1, Math.floor(rawIndex) + 1), totalProjectCount);
      // Wait, let's just make it simpler so the user sees the active image.
      // A slightly smoother way to calculate index based on imgActivationThreshold:
      // When an image crosses the threshold, it becomes the "active" one.
      // Easiest is to just calculate it directly from the progress, since we distribute names/images evenly.
      const currentIndex = progress === 1 ? totalProjectCount : Math.floor(progress * totalProjectCount) + 1;

      projectIndex.textContent = `01/${String(currentIndex).padStart(2, '0')}`;

      gsap.set(projectIndex, { y: progress * moveDistanceIndex });
      gsap.set(projectImagesContainer, { y: progress * moveDistanceImages });

      // Use progress-based activation instead of getBoundingClientRect
      // to avoid feedback loops when margin changes shift image positions
      const imgRawIndex = progress * (totalProjectCount - 1);
      const activeIndex = Math.round(imgRawIndex);

      projectImgs.forEach((img, index) => {
        if (index === activeIndex) {
          img.classList.add('is-active');
        } else {
          img.classList.remove('is-active');
        }
      });

      projectNames.forEach((link, index) => {
        const linkEl = link as HTMLElement;
        const pEl = linkEl.querySelector('p') as HTMLElement;
        const startProgress = index / totalProjectCount;
        const endProgress = (index + 1) / totalProjectCount;
        const projectProgress = Math.max(
          0,
          Math.min(1, (progress - startProgress) / (endProgress - startProgress))
        );

        gsap.set(linkEl, { y: -projectProgress * moveDistanceNames });

        // Find the .project-meta inside this link wrapper
        const metaEl = linkEl.querySelector('.project-meta');

        if (projectProgress > 0 && projectProgress < 1) {
          if (pEl) gsap.set(pEl, { color: '#000' });
          metaEl?.classList.add('is-visible');
        } else {
          if (pEl) gsap.set(pEl, { color: '#a0a0a0' });
          metaEl?.classList.remove('is-visible');
        }
      });
    },
  });

  gsap.set([projectIndex, projectImagesContainer, ...Array.from(projectImgs), ...Array.from(projectNames)], {
    force3D: true,
  });
}

export function initPage() {
  cleanupPage();

  bindCursorInitToMain();
  initParagraphAnimations();
  initTitleAnimations();
  initGalleryAnimations();
  initOpaInAnimations();
  initPillHover();
  initProjectHoverEffects();
  initNextProjectPreview();
  initFeaturedWorkScroll();

  // Reset smooth scroll to the top of the page immediately upon routing
  // to prevent it jumping midway down from the previous scroll state
  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
  }

  ScrollTrigger.refresh();
}

initSiteOnce();
initPage();
