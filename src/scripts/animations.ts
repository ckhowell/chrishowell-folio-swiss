import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

// ── LENIS SMOOTH SCROLL ─────────────────────────────────────────────
const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ── PARAGRAPH REVEAL — SplitText line-by-line mask ──────────────────
function initParagraphAnimations() {
  const elements = document.querySelectorAll(
    '[data-animation="paragraph"]:not(.--is-visible)'
  );

  const observer = new IntersectionObserver(
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

          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

// ── TITLE REVEAL — SplitText character-by-character mask ────────────
function initTitleAnimations() {
  const elements = document.querySelectorAll(
    '[data-animation="title"]:not(.--is-visible), [data-animation="title-in"]:not(.--is-visible)'
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;

          el.classList.add('--is-visible');
          el.style.visibility = 'visible';

          new SplitText(el, {
            type: 'words, chars',
            autoSplit: true,
            mask: 'chars',
            charsClass: 'char',
            onSplit: (self: any) => {
              return gsap.from(self.chars, {
                duration: 1,
                yPercent: -120,
                scale: 1.2,
                stagger: 0.01,
                ease: 'expo.out',
              });
            },
          });

          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => observer.observe(el));
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
  const elements = document.querySelectorAll(
    '[data-animation="opa-in"]:not(.--is-visible)'
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('--is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => observer.observe(el));
}

// ── CUSTOM CURSOR — Mouse-following dot (basecreate lerp) ───────────
function initCustomCursor() {
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

  // Show cursor on first mouse move inside main
  document.querySelector('main')?.addEventListener(
    'mousemove',
    () => {
      cursor.classList.add('--init');
    },
    { once: true }
  );

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

  let tickerTween: gsap.core.Tween | null = null;
  let pillTimeline: gsap.core.Timeline | null = null;

  // Hidden measurement container — avoids flash from toggling pill visibility
  const measureEl = document.createElement('span');
  measureEl.style.cssText =
    'position:absolute;visibility:hidden;white-space:nowrap;font-size:0.75rem;' +
    'font-weight:500;text-transform:uppercase;letter-spacing:0.05em;padding-right:2rem;';
  document.body.appendChild(measureEl);

  // All elements with data-cursor-text
  const hoverTargets = document.querySelectorAll('[data-cursor-text]');

  hoverTargets.forEach((target) => {
    target.addEventListener('mouseenter', () => {
      const label = (target as HTMLElement).dataset.cursorText || '';

      // Set text content on both spans
      texts.forEach((t) => (t.textContent = label));

      // Measure via offscreen element — no pill flash
      measureEl.textContent = label;
      const singleWidth = measureEl.offsetWidth;
      const pillWidth = singleWidth + 24;

      // Kill any existing animations
      if (pillTimeline) pillTimeline.kill();
      if (tickerTween) tickerTween.kill();

      // Start ticker IMMEDIATELY (text is invisible, already scrolling)
      const speed = Math.max(label.length * 0.3, 2);
      gsap.set(textWrap, { x: 0, opacity: 0 });
      tickerTween = gsap.to(textWrap, {
        x: -singleWidth,
        duration: speed,
        ease: 'none',
        repeat: -1,
      });

      // ── Animate pill IN — text is already scrolling when it fades in ──
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
            scaleX: 1,
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
      if (tickerTween) tickerTween.kill();

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
            scaleX: 0,
            duration: 0.25,
          },
          '<'
        )
        // 4. Reset ticker position
        .set(textWrap, { x: 0 })
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
  const link = document.querySelector('.next-project__link') as HTMLElement;
  const preview = document.querySelector('.next-project__preview') as HTMLElement;
  if (!section || !link || !preview) return;

  let mouseX = 0;
  let mouseY = 0;
  let previewX = 0;
  let previewY = 0;
  let isHovering = false;
  let tickerCallback: (() => void) | null = null;

  // Offset so image appears beside cursor, not centered on it
  const offsetX = -preview.offsetWidth * 0.5;
  const offsetY = -preview.offsetHeight * 0.5;

  // Track mouse within section
  section.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  link.addEventListener('mouseenter', () => {
    isHovering = true;
    preview.classList.add('--active');

    // Start GSAP ticker for smooth following
    if (!tickerCallback) {
      tickerCallback = () => {
        const dt = 1.0 - Math.pow(0.85, gsap.ticker.deltaRatio());

        previewX += (mouseX - previewX) * dt;
        previewY += (mouseY - previewY) * dt;

        // Velocity-based rotation (horizontal speed → subtle tilt)
        const vx = mouseX - previewX;
        const rotation = vx * 0.08;

        gsap.set(preview, {
          x: previewX + offsetX,
          y: previewY + offsetY,
          rotation: rotation,
        });
      };
      gsap.ticker.add(tickerCallback);
    }
  });

  link.addEventListener('mouseleave', () => {
    isHovering = false;
    preview.classList.remove('--active');

    // Remove ticker after transition completes
    setTimeout(() => {
      if (!isHovering && tickerCallback) {
        gsap.ticker.remove(tickerCallback);
        tickerCallback = null;
      }
    }, 600);
  });

  // Snap position on first enter to avoid flying in from corner
  section.addEventListener('mouseenter', (e) => {
    previewX = e.clientX;
    previewY = e.clientY;
  });
}

// ── INITIALIZE ───────────────────────────────────────────────────────
initParagraphAnimations();
initTitleAnimations();
initGalleryAnimations();
initOpaInAnimations();
initCustomCursor();
initPillHover();
initProjectHoverEffects();
initNextProjectPreview();
