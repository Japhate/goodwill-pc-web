import HeritageSealLoader from "@/components/HeritageSealLoader";

export default function PageLoadingScreen({
  className = "",
  backgroundClassName = "bg-[#f8f1e5]",
  compact = false,
  fixed = false,
  label = "Loading page",
}) {
  const positionClass = fixed ? "fixed inset-0 z-[9999]" : compact ? "" : "min-h-screen";

  return (
    <div
      className={`${positionClass} flex items-center justify-center ${backgroundClassName} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <HeritageSealLoader size="small" />
    </div>
  );
}
