import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

export default function LazyBackgroundVideo({
  src,
  type = "video/mp4",
  className = "",
  rootMargin = "600px",
}) {
  const videoRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!src || prefersReducedMotion()) return undefined;

    const video = videoRef.current;
    if (!video || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [rootMargin, src]);

  useEffect(() => {
    if (!shouldLoad) return;

    const video = videoRef.current;
    video?.load();
    video?.play?.().catch(() => {});
  }, [shouldLoad]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay={shouldLoad}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    >
      {shouldLoad && <source src={src} type={type} />}
    </video>
  );
}
