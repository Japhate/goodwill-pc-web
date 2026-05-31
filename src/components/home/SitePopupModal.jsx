import { useEffect, useMemo, useState } from "react";
import { Church, Clock, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_PREFIX = "goodwill-site-popup-dismissed";

function getPopupDismissKey(popup) {
  return `${DISMISS_PREFIX}:${popup.id}:${popup.updated_date || popup.created_date || "v1"}`;
}

function isPopupActive(popup, now = new Date()) {
  if (!popup || popup.status === "Inactive" || popup.status === "Hidden") return false;

  const startsAt = popup.start_at ? new Date(popup.start_at) : null;
  const endsAt = popup.end_at ? new Date(popup.end_at) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) return false;
  if (endsAt && Number.isNaN(endsAt.getTime())) return false;
  if (startsAt && now < startsAt) return false;
  if (endsAt && now >= endsAt) return false;

  return true;
}

export function getActivePopup(popups, now = new Date()) {
  return [...(popups || [])]
    .filter((popup) => isPopupActive(popup, now))
    .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))[0] || null;
}

export default function SitePopupModal({ popup }) {
  const dismissKey = useMemo(() => popup ? getPopupDismissKey(popup) : "", [popup]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!popup || !dismissKey) {
      setIsOpen(false);
      return;
    }

    const wasDismissed = popup.dismissible !== false
      && typeof window !== "undefined"
      && window.localStorage.getItem(dismissKey) === "true";

    setIsOpen(!wasDismissed);
  }, [dismissKey, popup]);

  if (!popup || !isOpen) return null;

  const dismiss = () => {
    if (popup.dismissible !== false && typeof window !== "undefined") {
      window.localStorage.setItem(dismissKey, "true");
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="site-popup-title">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-amber-300/70 bg-[#321d15] text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.25),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%)]" />
        {popup.dismissible !== false && (
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 z-20 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Dismiss popup"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="relative z-10 p-6 sm:p-8">
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/70 bg-amber-400/15">
              <Church className="h-9 w-9 text-amber-300" />
            </div>
          </div>

          <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.28em] text-amber-300">
            {popup.eyebrow || "Important Church Update"}
          </p>
          <h2 id="site-popup-title" className="text-center text-2xl font-bold leading-tight text-white sm:text-4xl">
            {popup.title}
          </h2>
          {popup.scripture && (
            <p className="mx-auto mt-3 max-w-xl text-center font-serif text-sm italic leading-relaxed text-amber-100 sm:text-base">
              {popup.scripture}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-red-200/70 bg-red-700 px-4 py-4 text-center shadow-lg">
            <p className="text-base font-bold leading-relaxed text-white sm:text-lg">
              {popup.message}
            </p>
          </div>

          {(popup.detail || popup.location || popup.time_label) && (
            <div className="mt-5 grid gap-3 text-sm text-amber-50 sm:grid-cols-2">
              {popup.time_label && (
                <div className="flex items-center justify-center gap-2 rounded-md bg-white/10 px-3 py-2">
                  <Clock className="h-4 w-4 text-amber-300" />
                  <span className="font-semibold">{popup.time_label}</span>
                </div>
              )}
              {popup.location && (
                <div className="flex items-center justify-center gap-2 rounded-md bg-white/10 px-3 py-2">
                  <MapPin className="h-4 w-4 text-amber-300" />
                  <span className="font-semibold">{popup.location}</span>
                </div>
              )}
              {popup.detail && (
                <p className="rounded-md bg-white/10 px-3 py-2 text-center sm:col-span-2">
                  {popup.detail}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {popup.cta_url && (
              <Button asChild className="bg-amber-500 font-bold text-black hover:bg-amber-400">
                <a href={popup.cta_url} target="_blank" rel="noopener noreferrer">
                  {popup.cta_label || "Learn More"}
                </a>
              </Button>
            )}
            {popup.dismissible !== false && (
              <Button type="button" variant="outline" onClick={dismiss} className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                I Understand
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
