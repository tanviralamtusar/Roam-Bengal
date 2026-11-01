import { useEffect, useState } from "react";
import { mediaSrcSet } from "@/lib/media-sizes";

/**
 * Every image in reference design/ is a placeholder: a gradient-filled frame, a visible
 * "📷 images/foo.jpg" label, and <img onerror="this.style.display='none'">.
 *
 * This reproduces that behaviour with two differences the PRD calls for (§12):
 *   - `alt` is required, not optional
 *   - the empty-state renders in development only, styled as an intentional "no image
 *     yet" label (small friendly copy) rather than a raw debug label, with the expected
 *     file path shown small underneath for content-ops reference
 */

export const FRAME_GRADIENTS = {
  green: "linear-gradient(160deg,#22B57A,#0B6B47)",
  deepGreen: "linear-gradient(160deg,#1E5F3B,#0B2818)",
  orange: "linear-gradient(160deg,#F0791E,#C4390E)",
  brown: "linear-gradient(160deg,#8C6A3D,#5A3E1B)",
  teal: "linear-gradient(160deg,#3E7A6E,#123D30)",
  gold: "linear-gradient(160deg,#F2B705,#8C6A3D)",
} as const;

export type FrameGradient = keyof typeof FRAME_GRADIENTS;

/**
 * `sizes` for full-bleed photos cropped to cover a box taller than a phone is wide. A
 * landscape photo is then drawn wider than the screen (the homepage hero is ~790px tall
 * on a phone, so a 3:2 photo spans ~1190px), and `100vw` would pick a file too small
 * to stay sharp.
 */
export const HERO_SIZES = "(max-width: 1200px) 1200px, 100vw";
/** Page banners, ~480–500px tall on a phone. */
export const BANNER_SIZES = "(max-width: 800px) 800px, 100vw";

/** Stable gradient per slug, so a tour keeps the same fallback colour across pages. */
export function gradientFor(seed: string): FrameGradient {
  const keys = Object.keys(FRAME_GRADIENTS) as FrameGradient[];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return keys[Math.abs(hash) % keys.length]!;
}

interface PhotoFrameProps {
  src?: string | null;
  alt: string;
  title?: string;
  gradient?: FrameGradient;
  /** Raw CSS gradient, for the one-off frames the reference styles inline. */
  gradientCss?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Hero images should not be lazy — it delays LCP. */
  priority?: boolean;
  /**
   * How wide the photo is drawn, for picking a resized upload (`srcset`). The default,
   * the full viewport, is never too small for a frame inside the page — pass something
   * narrower for small frames, or wider for a tall `object-cover` frame that crops a
   * landscape photo.
   */
  sizes?: string;
  /** Shown in dev when `src` is empty, mirroring the reference placeholder label. */
  placeholderLabel?: string;
  /** Disable the development placeholder for decorative/background frames. */
  showPlaceholder?: boolean;
  children?: React.ReactNode;
}

export function PhotoFrame({
  src,
  alt,
  title,
  gradient = "green",
  gradientCss,
  className = "",
  style,
  priority = false,
  sizes = "100vw",
  placeholderLabel,
  showPlaceholder = true,
  children,
}: PhotoFrameProps) {
  const [failed, setFailed] = useState(false);
  const srcSet = mediaSrcSet(src);
  // A previously-broken `src` must not keep failing a later, corrected one — the live
  // admin preview swaps `src` on this same mounted instance instead of reloading.
  useEffect(() => setFailed(false), [src]);
  const showImage = Boolean(src) && !failed;

  // The frame needs a positioned box for the absolute <img>, but Tailwind emits
  // `.relative` after `.absolute`, so hardcoding it would silently beat a caller's
  // `absolute`/`fixed` no matter the class order. Only add it when nothing else sets one.
  const positioned = /(?:^|\s)(?:absolute|fixed|sticky)(?:\s|$)/.test(className);

  // With no photo, collapse to a short strip with no gradient instead of the full frame.
  // Positioned frames fill a parent (banners, backgrounds) and keep their size and gradient.
  const collapsed = !showImage && showPlaceholder && !positioned;

  return (
    <div
      className={`${positioned ? "" : "relative"} overflow-hidden ${className}`}
      style={{
        background: gradientCss ?? FRAME_GRADIENTS[gradient],
        ...style,
        ...(collapsed ? { background: "none", aspectRatio: "auto", height: "6rem" } : null),
      }}
    >
      {import.meta.env.DEV && !showImage && showPlaceholder ? (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center px-1.5 text-center leading-tight ${
            collapsed ? "text-muted" : "text-white/80"
          }`}
        >
          <span className="text-[0.5rem] font-medium tracking-wide">No image yet</span>
          {placeholderLabel ? (
            <span
              className={`text-[0.45rem] font-normal tracking-wide ${
                collapsed ? "text-muted/70" : "text-white/50"
              }`}
            >
              {placeholderLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {showImage ? (
        <img
          src={src!}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          title={title || undefined}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {children}
    </div>
  );
}
