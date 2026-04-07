"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export type ReportScrollRotateHeroProps = {
  images: string[];
  alt: string;
  title?: ReactNode;
};

/** Shorter = less scrolling to complete the full rotation. */
const SCRUB_SECTION_MIN_VH = 125;

const imgLayerClass =
  "pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-center opacity-100 [backface-visibility:hidden] [transform:translateZ(0)]";

function getViewportHeight() {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

/** Load and decode every frame so first scroll never swaps to an undecoded bitmap (avoids flash). */
function preloadImageFrames(srcs: string[]) {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const im = new Image();
          im.onload = () => {
            if (typeof im.decode === "function") {
              im.decode().then(resolve).catch(resolve);
            } else {
              resolve();
            }
          };
          im.onerror = () => resolve();
          im.src = src;
        }),
    ),
  );
}

export function ReportScrollRotateHero({
  images,
  alt,
  title,
}: ReportScrollRotateHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  /** Matches initial <img src={images[0]}> so we do not rewrite src on mount (avoids reload flicker). */
  const lastIdxRef = useRef<number>(0);
  const [framesReady, setFramesReady] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  /** One opaque frame at a time — no crossfade (blending makes in-betweens look lighter/washed out). */
  const applyFrameIndex = useCallback(
    (idx: number) => {
      const img = imgRef.current;
      if (!img) return;
      if (lastIdxRef.current === idx) return;
      img.src = images[idx]!;
      lastIdxRef.current = idx;
    },
    [images],
  );

  const updateFrame = useCallback(() => {
    if (reduceMotion || images.length <= 1) return;
    if (!framesReady) return;
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = getViewportHeight();
    const scrollRange = rect.height - vh;
    if (scrollRange <= 0) return;
    let progress = -rect.top / scrollRange;
    if (rect.top > 0) progress = 0;
    progress = Math.min(1, Math.max(0, progress));
    const idx = Math.round(progress * (images.length - 1));
    applyFrameIndex(idx);
  }, [applyFrameIndex, framesReady, images.length, reduceMotion]);

  useEffect(() => {
    if (images.length <= 1) {
      setFramesReady(true);
      return;
    }
    if (reduceMotion) {
      setFramesReady(true);
      return;
    }
    let cancelled = false;
    setFramesReady(false);
    preloadImageFrames(images).then(() => {
      if (!cancelled) setFramesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [images, reduceMotion]);

  useLayoutEffect(() => {
    if (reduceMotion || images.length <= 1) return;
    let raf = 0;
    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateFrame);
    };
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onScrollOrResize);
    vv?.addEventListener("scroll", onScrollOrResize);
    onScrollOrResize();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      vv?.removeEventListener("resize", onScrollOrResize);
      vv?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [updateFrame, reduceMotion, images.length, framesReady]);

  if (images.length === 0) return null;

  const scrubHeightStyle =
    !reduceMotion && images.length > 1
      ? { minHeight: `${SCRUB_SECTION_MIN_VH}vh` as const }
      : undefined;

  const firstSrc = images[0]!;

  return (
    <section
      ref={sectionRef}
      className="w-full"
      style={scrubHeightStyle}
      aria-label={title ? undefined : alt}
    >
      <div className="sticky top-0 flex w-full flex-col bg-background">
        <div className="relative isolate h-[min(70vh,560px)] w-full overflow-hidden border-b-2 border-foreground bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- frame sequence: discrete frames, full opacity; next/image not ideal for rapid src swaps */}
          <img
            ref={reduceMotion || images.length <= 1 ? undefined : imgRef}
            src={firstSrc}
            alt={alt}
            className={imgLayerClass}
            draggable={false}
            decoding="async"
            fetchPriority="high"
          />
          {title ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-6 pt-24 sm:px-6">
              <div className="mx-auto max-w-6xl text-lg font-bold uppercase leading-snug tracking-wide text-foreground sm:text-xl">
                {title}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
