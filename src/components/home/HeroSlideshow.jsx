import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Video, Clock, Navigation, Pause, Play } from "lucide-react";
import { HeroSlide } from "@/entities/HeroSlide";
import { AnnouncementsEvents } from "@/entities/AnnouncementsEvents";
import { LandingImage } from "@/entities/LandingImage";
import { HomeBannerMessages } from "@/entities/HomeBannerMessages";
import { getPublicAnnouncements, getPublicHeroSlides } from "@/lib/publicAnnouncements";
import { getResponsiveImage, getResponsiveImageProps } from "@/lib/responsiveImages";
import { format } from "date-fns";
import { createSpecialServiceHeroSlide, getActiveSpecialServiceNotice } from "@/lib/specialServiceNotice";

const SLIDE_INTERVAL = 10000;
const YOUTUBE_LIVE_STATUS_POLL_MS = 60 * 1000;
const DEFAULT_YOUTUBE_LIVE_BANNER_MESSAGE = "📺 We’re Live! Come share this moment with us. Click the LIVE button to join.";

// Bible Study: pin the Zoom slide every Wednesday from 6:00 PM to 7:00 PM.
const BIBLE_STUDY_ZOOM = "https://us06web.zoom.us/j/82013337566?pwd=mULnQC1Zjg5GWkoTTKGvx3PyAFaCeZ.1";
const BIBLE_STUDY_START_HOUR = 18; // 6:00 PM
const BIBLE_STUDY_START_MIN = 0;
const BIBLE_STUDY_END_HOUR = 19;   // 7:00 PM
const BIBLE_STUDY_END_MIN = 0;
const SHOW_HERO_EXTERNAL_ACTION_BUTTON = true;
const SHOW_BIBLE_STUDY_COUNTDOWN_OVERLAY = true;
const PERMANENT_WELCOME_HERO_ID = "hero-1";
const PERMANENT_WELCOME_HERO_IMAGE = "/images/hero/goodwill-presbyterian-church-hero.png";
const ABOUT_PAGE_URL = "/About";
const DEFAULT_LANDING_IMAGE = {
  id: "landing-image",
  image_url: PERMANENT_WELCOME_HERO_IMAGE,
  alt_text: "Welcome to Goodwill Presbyterian Church",
  link_url: ABOUT_PAGE_URL,
  link_label: "Learn More",
  is_landing_image: true,
  is_active: true,
};

function readDocumentMeta(name) {
  if (typeof document === "undefined") return "";
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() || "";
}

function getInitialLandingImage() {
  const imageUrl = readDocumentMeta("goodwill:landing-image-url");
  if (!imageUrl) return DEFAULT_LANDING_IMAGE;

  return {
    ...DEFAULT_LANDING_IMAGE,
    image_url: imageUrl,
    alt_text: readDocumentMeta("goodwill:landing-image-alt") || DEFAULT_LANDING_IMAGE.alt_text,
    link_url: readDocumentMeta("goodwill:landing-image-link-url") || DEFAULT_LANDING_IMAGE.link_url,
    link_label: readDocumentMeta("goodwill:landing-image-link-label") || DEFAULT_LANDING_IMAGE.link_label,
    is_landing_image: true,
  };
}

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function isPermanentWelcomeHeroSlide(slide) {
  if (!slide) return false;

  const altText = String(slide.alt_text || "").toLowerCase();

  return slide.is_landing_image === true
    || slide.id === PERMANENT_WELCOME_HERO_ID
    || slide.image_url === PERMANENT_WELCOME_HERO_IMAGE
    || (altText.includes("welcome") && altText.includes("goodwill"));
}

function isZoomBibleStudySlide(slide) {
  if (!slide) return false;

  return slide.is_zoom_bible_study === true
    || slide.alt_text?.toLowerCase().includes("bible study")
    || slide.alt_text?.toLowerCase().includes("zoom")
    || slide.link_url?.includes("zoom.us")
    || slide.image_url?.toLowerCase().includes("zoom");
}

function isTimedBibleStudyBanner(banner) {
  return banner?.is_bible_study_live_banner === true;
}

function isAutomaticYoutubeLiveBanner(banner) {
  return banner?.is_youtube_live_banner === true;
}

function getLiveScheduledBannerMessage(slide = {}, event = {}) {
  return String(event.live_banner_message || slide.live_banner_message || "").trim();
}

function isPrioritySlideActive(slide, now) {
  if (!slide?.is_priority_announcement) return false;

  const startsAt = slide.priority_start ? new Date(slide.priority_start) : null;
  const endsAt = slide.priority_end ? new Date(slide.priority_end) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) return false;
  if (endsAt && Number.isNaN(endsAt.getTime())) return false;
  if (startsAt && now < startsAt) return false;
  if (endsAt && now >= endsAt) return false;

  return true;
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getExplicitScheduledEventForSlide(slide, announcements = []) {
  if (!slide) return null;

  if (slide.announcement_id) {
    const linked = announcements.find((item) => String(item.id) === String(slide.announcement_id));
    if (linked) return linked;
  }

  return slide.date || slide.time || slide.end_time || slide.frequency ? slide : null;
}

function hasCompleteLiveSchedule(event) {
  if (!event?.date || !event?.time || !event?.end_time) return false;

  const normalizedStatus = String(event.status || event.slide_status || "").toLowerCase();
  return !["hidden", "inactive", "draft"].includes(normalizedStatus);
}

function getVirtualJoinLabel(platform) {
  const cleanPlatform = String(platform || "").trim();
  if (!cleanPlatform) return "Join Online";

  const normalizedPlatform = cleanPlatform.toLowerCase();
  if (normalizedPlatform.includes("zoom")) return "Join Zoom";
  if (normalizedPlatform.includes("google") || normalizedPlatform.includes("meet")) return "Join Google Meet";
  if (normalizedPlatform.includes("teams")) return "Join Microsoft Teams";
  if (normalizedPlatform.includes("youtube")) return "Watch on YouTube";
  if (normalizedPlatform.includes("facebook")) return "Watch on Facebook";

  return `Join ${cleanPlatform}`;
}

function getEventStartDateTime(event) {
  if (!event?.date) return null;

  const [year, month, day] = String(event.date).split("-").map(Number);
  if (!year || !month || !day) return null;

  const [hour = 0, minute = 0] = String(event.time || "00:00").split(":").map(Number);
  const start = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
  return Number.isNaN(start.getTime()) ? null : start;
}

function getEventEndDateTime(event, startDate) {
  if (!startDate) return null;

  const hasRecurringStep = Boolean(getRecurringStep(event?.frequency));
  const endDateValue = hasRecurringStep ? event?.date : (event?.end_date || event?.date);
  const [year, month, day] = String(endDateValue || "").split("-").map(Number);
  if (!year || !month || !day) return new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  if (event?.end_time) {
    const [hour = 0, minute = 0] = String(event.end_time).split(":").map(Number);
    const end = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
    return Number.isNaN(end.getTime()) ? null : end;
  }

  if (event?.end_date && event.end_date !== event.date) {
    return new Date(year, month - 1, day, 23, 59, 59);
  }

  return new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
}

function getRecurringUntilDateTime(event) {
  if (!event?.end_date) return null;

  const [year, month, day] = String(event.end_date).split("-").map(Number);
  if (!year || !month || !day) return null;

  const [hour = 23, minute = 59] = String(event.end_time || "23:59").split(":").map(Number);
  const until = new Date(year, month - 1, day, hour || 0, minute || 0, 59);
  return Number.isNaN(until.getTime()) ? null : until;
}

function getCountdownLabel(targetDate, now, targetEndDate = null) {
  if (!targetDate) return "";

  if (targetEndDate && now >= targetEndDate) return "";

  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return targetEndDate ? "Live now" : "";

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function getRecurringStep(frequency = "") {
  const normalized = String(frequency).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("daily") || normalized.includes("every day") || normalized.includes("evening")) return "daily";
  if (normalized.includes("weekday")) return "weekday";
  if (normalized.includes("weekly") || normalized.includes("every week")) return "weekly";
  if (normalized.includes("monthly") || normalized.includes("every month")) return "monthly";
  if (normalized.includes("yearly") || normalized.includes("annually") || normalized.includes("annual")) return "yearly";
  return null;
}

function advanceRecurringDate(date, step) {
  const next = new Date(date);
  if (step === "daily") {
    next.setDate(next.getDate() + 1);
  }
  if (step === "weekday") {
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  }
  if (step === "weekly") next.setDate(next.getDate() + 7);
  if (step === "monthly") next.setMonth(next.getMonth() + 1);
  if (step === "yearly") next.setFullYear(next.getFullYear() + 1);
  return next;
}

function getVirtualEventTiming(event, now) {
  const start = getEventStartDateTime(event);
  const end = getEventEndDateTime(event, start);
  if (!start || !end) return { countdown: "", isLive: false, start: null, end: null };

  const step = getRecurringStep(event?.frequency);
  let nextStart = start;
  let nextEnd = end;
  const recurringUntil = step ? getRecurringUntilDateTime(event) : null;

  if (step) {
    let guard = 0;
    while (nextEnd <= now && guard < 370) {
      nextStart = advanceRecurringDate(nextStart, step);
      nextEnd = advanceRecurringDate(nextEnd, step);
      guard += 1;
    }

    if (recurringUntil && nextStart > recurringUntil) {
      return { countdown: "", isLive: false, start: null, end: null };
    }
  }

  if (now >= nextStart && now < nextEnd) {
    return { countdown: "", isLive: true, start: nextStart, end: nextEnd };
  }

  if (now < nextStart) {
    return { countdown: getCountdownLabel(nextStart, now, nextEnd), isLive: false, start: nextStart, end: nextEnd };
  }

  return { countdown: "", isLive: false, start: null, end: null };
}

function warmHeroImage(url) {
  if (!url || typeof window === "undefined") return;

  const responsiveImage = getResponsiveImageProps(url, "100vw");
  const image = new Image();
  image.decoding = "async";
  image.src = responsiveImage.preloadHref || url;
  image.decode?.().catch(() => {});
}

function scheduleNonCriticalHeroWork(callback, delay = 1600) {
  if (typeof window === "undefined") return () => {};

  let idleHandle = null;
  const timeoutHandle = window.setTimeout(() => {
    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(callback, { timeout: 2400 });
      return;
    }

    callback();
  }, delay);

  return () => {
    window.clearTimeout(timeoutHandle);
    if (idleHandle !== null) window.cancelIdleCallback(idleHandle);
  };
}

function ZoomCountdownOverlay({ event, fallbackSchedule = null }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const eventTiming = useMemo(() => getVirtualEventTiming(event, now), [event, now]);
  const start = eventTiming.start || fallbackSchedule?.start;
  const end = eventTiming.end || fallbackSchedule?.end;
  if (!start || !end) return null;

  const isOngoing = eventTiming.isLive || (now >= start && now < end);

  const msUntilStart = Math.max(0, start - now);
  const totalSeconds = Math.floor(msUntilStart / 1000);
  return (
    <div className="absolute bottom-1.5 right-1.5 z-20 flex justify-end sm:bottom-2 sm:right-3">
      <div className="flex max-w-[8.75rem] flex-col items-center gap-0.5 rounded-md border border-white/20 bg-black/70 px-1.5 py-1 shadow-xl backdrop-blur-sm sm:max-w-none sm:rounded-lg sm:px-2 sm:py-1.5">

        {/* DEFAULT: full countdown to next session */}
        {!isOngoing && (
          <>
            <div className="flex max-w-full items-center gap-0.5 truncate text-[8px] font-semibold leading-tight text-amber-300 sm:gap-1 sm:text-[10px]">
              <Clock className="h-2 w-2 flex-shrink-0 sm:h-2.5 sm:w-2.5" />
              <span className="truncate">Next: {format(start, "MMMM d")}</span>
            </div>
            <div className="flex items-center gap-1 tabular-nums sm:gap-1.5">
              {[
                { val: Math.floor(totalSeconds / 86400), label: "d" },
                { val: Math.floor((totalSeconds % 86400) / 3600), label: "h" },
                { val: Math.floor((totalSeconds % 3600) / 60), label: "m" },
                { val: totalSeconds % 60, label: "s" },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-[10px] font-bold leading-none text-red-500 sm:text-xs">{String(val).padStart(2, "0")}</span>
                  <span className="text-[7px] uppercase text-amber-300 sm:text-[9px]">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* LIVE: 6:00-7:00 PM */}
        {isOngoing && (
          <>
            <div className="flex items-center gap-1 text-[9px] font-semibold text-green-300 sm:text-[10px]">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              Live Now!
            </div>
            <a
              href={BIBLE_STUDY_ZOOM}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-semibold text-white shadow transition-all hover:bg-blue-700 sm:px-2.5 sm:py-1 sm:text-[10px]"
            >
              <Video className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Join Zoom
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function HeroSlideshow({ onReady }) {
  const [slides, setSlides] = useState([]);
  const [landingImage, setLandingImage] = useState(getInitialLandingImage);
  const [announcements, setAnnouncements] = useState([]);
  const [failedAnnouncementImageIds, setFailedAnnouncementImageIds] = useState(() => new Set());
  const [imageAspectRatios, setImageAspectRatios] = useState({});
  const [managedBanners, setManagedBanners] = useState(null);
  const [youtubeLiveStatus, setYoutubeLiveStatus] = useState({
    configured: false,
    isLive: false,
    title: "",
    url: "",
  });
  const [current, setCurrent] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isTickerClosed, setIsTickerClosed] = useState(false);
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(() => prefersReducedMotion());
  const [now, setNow] = useState(new Date());
  const [hasInitialHeroReady, setHasInitialHeroReady] = useState(false);
  const timerRef = useRef(null);
  const sectionRef = useRef(null);
  const hasReportedReadyRef = useRef(false);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isBibleStudyPinnedTime = now.getDay() === 3
    && currentMinutes >= BIBLE_STUDY_START_HOUR * 60 + BIBLE_STUDY_START_MIN
    && currentMinutes < BIBLE_STUDY_END_HOUR * 60 + BIBLE_STUDY_END_MIN;
  const activeSpecialServiceNotice = useMemo(() => getActiveSpecialServiceNotice(now), [now]);
  const specialServiceSlide = useMemo(() => {
    if (!activeSpecialServiceNotice) return null;

    return createSpecialServiceHeroSlide(activeSpecialServiceNotice);
  }, [activeSpecialServiceNotice]);
  const liveScheduledSlides = useMemo(() => {
    return slides
      .filter((slide) => slide?.is_active !== false)
      .map((slide) => {
        const event = getExplicitScheduledEventForSlide(slide, announcements);
        return {
          slide,
          event,
          timing: hasCompleteLiveSchedule(event)
            ? getVirtualEventTiming(event, now)
            : { countdown: "", isLive: false, start: null, end: null },
        };
      })
      .filter(({ timing }) => timing.isLive);
  }, [announcements, now, slides]);
  const isLiveBanner = liveScheduledSlides.length > 0;

  function isActiveManagedBanner(banner, now) {
    if (!banner) return false;
    const normalizedStatus = String(banner.status || '').toLowerCase();
    if (['inactive', 'hidden', 'draft'].includes(normalizedStatus)) return false;
    if (banner.is_special_service_banner) {
      if (banner.priority_start && banner.priority_end) {
        const start = new Date(banner.priority_start);
        const end = new Date(banner.priority_end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
        return now >= start && now < end;
      }
    }
    return normalizedStatus === 'live' || normalizedStatus === 'active';
  }

  const bannerMessages = useMemo(() => {
    if (activeSpecialServiceNotice) {
      const specialServiceMessages = Array.isArray(managedBanners)
        ? managedBanners
            .filter((banner) => banner?.is_special_service_banner === true)
            .filter((banner) => isActiveManagedBanner(banner, now))
            .map((banner) => banner.message)
            .filter(Boolean)
        : [];
      if (specialServiceMessages.length > 0) return specialServiceMessages;
    }

    if (liveScheduledSlides.length > 0) {
      return liveScheduledSlides
        .map(({ slide, event }) => getLiveScheduledBannerMessage(slide, event))
        .filter(Boolean);
    }

    if (Array.isArray(managedBanners)) {
      const messages = managedBanners
        .filter((banner) => !isTimedBibleStudyBanner(banner) && !isAutomaticYoutubeLiveBanner(banner) && isActiveManagedBanner(banner, now))
        .map((banner) => banner.message)
        .filter(Boolean);

      if (managedBanners.length > 0 || messages.length > 0) return messages;
    }

    return [];
  }, [activeSpecialServiceNotice, liveScheduledSlides, managedBanners, now]);

  const youtubeLiveBannerMessage = useMemo(() => {
    if (!youtubeLiveStatus.isLive) return "";
    if (managedBanners === null) return "";

    const managedYoutubeBanner = Array.isArray(managedBanners)
      ? managedBanners.find((banner) => isAutomaticYoutubeLiveBanner(banner))
      : null;
    const status = String(managedYoutubeBanner?.status || "active").toLowerCase();
    if (["inactive", "hidden", "draft"].includes(status)) return "";

    return String(managedYoutubeBanner?.message || "").trim() || DEFAULT_YOUTUBE_LIVE_BANNER_MESSAGE;
  }, [managedBanners, youtubeLiveStatus.isLive]);

  const displayBannerMessages = useMemo(() => {
    if (!youtubeLiveBannerMessage) return bannerMessages;

    return [youtubeLiveBannerMessage];
  }, [bannerMessages, youtubeLiveBannerMessage]);

  const hasActiveSpecialServiceBanner = Boolean(activeSpecialServiceNotice) && Array.isArray(managedBanners)
    && managedBanners
      .filter((banner) => banner?.is_special_service_banner === true)
      .some((banner) => isActiveManagedBanner(banner, now));
  const isYoutubeLiveBanner = Boolean(youtubeLiveBannerMessage && youtubeLiveStatus.url);
  const isLiveTicker = hasActiveSpecialServiceBanner || isLiveBanner || Boolean(youtubeLiveBannerMessage);
  const currentBannerMessage = displayBannerMessages[currentBannerIndex] || displayBannerMessages[0];
  const currentBannerIsYoutubeLive = isYoutubeLiveBanner && currentBannerMessage === youtubeLiveBannerMessage;

  useEffect(() => {
    if (!hasInitialHeroReady) return undefined;

    let isMounted = true;

    const loadLandingImage = async () => {
      try {
        const landingImageData = await LandingImage.list('-updated_date', 10);
        const activeLandingImage = Array.isArray(landingImageData)
          ? landingImageData.find((item) => item?.is_active !== false && item?.image_url)
          : null;

        if (!isMounted || !activeLandingImage?.image_url) return;

        warmHeroImage(activeLandingImage.image_url);
        setLandingImage({
          ...DEFAULT_LANDING_IMAGE,
          ...activeLandingImage,
          id: activeLandingImage.id || DEFAULT_LANDING_IMAGE.id,
          is_landing_image: true,
          link_url: activeLandingImage.link_url || ABOUT_PAGE_URL,
          link_label: activeLandingImage.link_label || "Learn More",
        });
      } catch {
        // Keep the server-provided or local fallback landing image.
      }
    };

    const loadSlides = async () => {
      try {
        const [data, announcementData] = await Promise.all([
          HeroSlide.list('order', 50),
          AnnouncementsEvents.list('-created_date', 200),
        ]);

        if (!isMounted) return;

        setAnnouncements(getPublicAnnouncements(announcementData, data));
        const active = getPublicHeroSlides(data, announcementData)
          .filter((slide) => !isPermanentWelcomeHeroSlide(slide));
        setSlides(active);
      } catch {
        if (!isMounted) return;

        setAnnouncements([]);
        setSlides([]);
      }
    };

    const cancelScheduledLoad = scheduleNonCriticalHeroWork(() => {
      loadLandingImage();
      loadSlides();
    });

    return () => {
      isMounted = false;
      cancelScheduledLoad();
    };
  }, [hasInitialHeroReady]);

  useEffect(() => {
    if (!hasInitialHeroReady) return undefined;

    let isMounted = true;

    const loadBanners = async () => {
      try {
        const data = await HomeBannerMessages.list('-created_date', 100);
        if (!isMounted) return;

        const live = data.filter((banner) => banner.status === "live");
        const standard = data.filter((banner) => banner.status === "active");
        const inactive = data.filter((banner) => banner.status !== "live" && banner.status !== "active");
        setManagedBanners([...live, ...standard, ...inactive]);
      } catch {
        if (!isMounted) return;

        setManagedBanners([]);
      }
    };

    const cancelScheduledLoad = scheduleNonCriticalHeroWork(loadBanners, 2200);

    return () => {
      isMounted = false;
      cancelScheduledLoad();
    };
  }, [hasInitialHeroReady]);

  useEffect(() => {
    if (!hasInitialHeroReady) return undefined;

    let isMounted = true;
    let interval = null;

    const loadYoutubeLiveStatus = async () => {
      try {
        const response = await fetch('/api/youtube/live-status', {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`Live status request failed with ${response.status}`);

        const data = await response.json();
        if (!isMounted) return;

        setYoutubeLiveStatus({
          configured: Boolean(data?.configured),
          isLive: Boolean(data?.isLive),
          title: String(data?.title || ""),
          url: String(data?.url || ""),
        });
      } catch (error) {
        if (isMounted) {
          console.warn('YouTube live status check failed', error?.message || error);
        }
      }
    };

    const cancelScheduledLoad = scheduleNonCriticalHeroWork(() => {
      loadYoutubeLiveStatus();
      interval = setInterval(loadYoutubeLiveStatus, YOUTUBE_LIVE_STATUS_POLL_MS);
    }, 2600);

    return () => {
      isMounted = false;
      cancelScheduledLoad();
      if (interval) clearInterval(interval);
    };
  }, [hasInitialHeroReady]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeSlides = useMemo(() => {
    const activePrioritySlides = slides
      .filter((slide) => isPrioritySlideActive(slide, now))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    if (activePrioritySlides.length > 0) {
      return [activePrioritySlides[0]];
    }

    if (specialServiceSlide) {
      return [specialServiceSlide];
    }

    const baseSlides = !isBibleStudyPinnedTime
      ? slides
      : (() => {
          const zoomSlides = slides.filter(isZoomBibleStudySlide);
          return zoomSlides.length > 0 ? zoomSlides : slides;
        })();

    if (isBibleStudyPinnedTime) return baseSlides;

    return landingImage?.image_url ? [landingImage, ...baseSlides] : baseSlides;
  }, [isBibleStudyPinnedTime, landingImage, now, slides, specialServiceSlide]);
  const currentSlide = activeSlides[current] || activeSlides[0];
  const nextSlide = activeSlides.length > 1
    ? activeSlides[(current + 1) % activeSlides.length]
    : null;
  const getLinkedAnnouncement = (slide) => {
    if (!slide?.announcement_id) return "";
    return announcements.find((item) => String(item.id) === String(slide.announcement_id)) || null;
  };
  const getAnnouncementForSlide = (slide) => {
    const linked = getLinkedAnnouncement(slide);
    if (linked) return linked;

    const slideTitle = normalizeMatchText(slide?.alt_text);
    if (!slideTitle) return null;

    return announcements.find((item) => {
      const announcementTitle = normalizeMatchText(item?.title);
      return announcementTitle && (
        announcementTitle === slideTitle
        || announcementTitle.includes(slideTitle)
        || slideTitle.includes(announcementTitle)
      );
    }) || null;
  };
  const getLinkedAnnouncementImage = (slide) => {
    if (slide?.announcement_id && failedAnnouncementImageIds.has(String(slide.announcement_id))) return "";
    const announcement = getLinkedAnnouncement(slide);
    return announcement?.image_upload || "";
  };
  const getSlideImageUrl = (slide) => getLinkedAnnouncementImage(slide) || slide?.image_url || "";
  const currentImageUrl = getSlideImageUrl(currentSlide);
  const nextImageUrl = getSlideImageUrl(nextSlide);
  const linkedAnnouncement = getAnnouncementForSlide(currentSlide);
  const isPermanentWelcomeHero = isPermanentWelcomeHeroSlide(currentSlide);
  const isFirstLandingSlide = current === 0 && !currentSlide?.is_priority_announcement && !isZoomBibleStudySlide(currentSlide);
  const showWelcomeHeroIntro = isPermanentWelcomeHero || isFirstLandingSlide;
  const currentResponsiveImage = getResponsiveImage(currentImageUrl);
  const currentResponsiveImageProps = getResponsiveImageProps(
    currentImageUrl,
    showWelcomeHeroIntro ? "100vw" : "(max-width: 768px) 100vw, 90vw",
  );
  const currentImageAspectRatio = imageAspectRatios[currentImageUrl] || currentResponsiveImage?.aspectRatio || "1920 / 900";
  const welcomeHeroUrl = isPermanentWelcomeHero ? ABOUT_PAGE_URL : "";
  const relatedAnnouncementId = currentSlide?.announcement_id || linkedAnnouncement?.id || "";
  const relatedAnnouncementUrl = !isPermanentWelcomeHero && relatedAnnouncementId
    ? `/Updates#announcement-${relatedAnnouncementId}`
    : "";
  const linkedLocationType = currentSlide?.location_type || linkedAnnouncement?.location_type || "physical";
  const linkedDirectionsUrl = String(currentSlide?.directions_url || linkedAnnouncement?.directions_url || "").trim();
  const linkedPhysicalLocation = String(currentSlide?.location || linkedAnnouncement?.location || "").trim();
  const directionsSlideUrl = ["physical", "both"].includes(linkedLocationType) && linkedPhysicalLocation && linkedDirectionsUrl
    ? linkedDirectionsUrl
    : "";
  const linkedVirtualPlatform = String(currentSlide?.virtual_platform || linkedAnnouncement?.virtual_platform || "").trim();
  const linkedVirtualUrl = String(currentSlide?.zoom_link || linkedAnnouncement?.zoom_link || "").trim();
  const virtualSlideUrl = ["virtual", "both"].includes(linkedLocationType) && linkedVirtualPlatform && linkedVirtualUrl
    ? linkedVirtualUrl
    : "";
  const linkedVirtualEvent = linkedAnnouncement || currentSlide;
  const linkedVirtualTiming = hasCompleteLiveSchedule(linkedVirtualEvent)
    ? getVirtualEventTiming(linkedVirtualEvent, now)
    : { countdown: "", isLive: false, start: null, end: null };
  const virtualEventIsLive = linkedVirtualTiming.isLive;
  const virtualCountdownEvent = linkedVirtualEvent?.date ? linkedVirtualEvent : currentSlide;
  const showVirtualCountdownOverlay = SHOW_BIBLE_STUDY_COUNTDOWN_OVERLAY
    && !showWelcomeHeroIntro
    && !virtualEventIsLive
    && (virtualSlideUrl || isZoomBibleStudySlide(currentSlide) || linkedVirtualUrl)
    && virtualCountdownEvent?.date;
  const explicitSlideUrl = currentSlide?.link_url || "";
  const isExplicitExternalUrl = /^https?:\/\//i.test(explicitSlideUrl);
  const internalSlideUrl = !welcomeHeroUrl && explicitSlideUrl.startsWith("/") ? explicitSlideUrl : "";
  const externalActionButtons = SHOW_HERO_EXTERNAL_ACTION_BUTTON
    ? [
        directionsSlideUrl && {
          url: directionsSlideUrl,
          label: "Get Directions",
          type: "directions",
        },
        virtualSlideUrl && {
          url: virtualSlideUrl,
          label: getVirtualJoinLabel(linkedVirtualPlatform),
          type: "virtual",
          countdown: "",
          isLive: virtualEventIsLive,
        },
        isExplicitExternalUrl && {
          url: explicitSlideUrl,
          label: currentSlide.link_label || (isZoomBibleStudySlide(currentSlide) ? "Join Zoom" : "More"),
          type: isZoomBibleStudySlide(currentSlide) ? "virtual" : "external",
          countdown: "",
          isLive: isZoomBibleStudySlide(currentSlide) ? virtualEventIsLive : false,
        },
        !isExplicitExternalUrl && !directionsSlideUrl && !virtualSlideUrl && isZoomBibleStudySlide(currentSlide) && {
          url: BIBLE_STUDY_ZOOM,
          label: "Join Zoom",
          type: "virtual",
          countdown: "",
          isLive: virtualEventIsLive,
        },
      ].filter(Boolean)
    : [];
  const externalSlideUrl = externalActionButtons[0]?.url || "";
  const showExternalSlideButton = externalActionButtons.length > 0;
  const primarySlideUrl = welcomeHeroUrl || relatedAnnouncementUrl || internalSlideUrl || externalSlideUrl;
  const primarySlideIsExternal = Boolean(primarySlideUrl && primarySlideUrl === externalSlideUrl && isExplicitExternalUrl);

  useEffect(() => {
    setCurrent(0);
  }, [activeSlides.length, isBibleStudyPinnedTime]);

  useEffect(() => {
    if (isLiveTicker) {
      setIsTickerClosed(false);
    }
  }, [isLiveTicker]);

  useEffect(() => {
    setCurrentBannerIndex(0);
  }, [displayBannerMessages.length]);

  const handleBannerCycle = () => {
    if (displayBannerMessages.length <= 1) return;
    setCurrentBannerIndex(prev => (prev + 1) % displayBannerMessages.length);
  };

  const resetTimer = () => {
    if (isSlideshowPaused || prefersReducedMotion() || activeSlides.length <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % activeSlides.length);
    }, SLIDE_INTERVAL);
  };

  useEffect(() => {
    if (isSlideshowPaused || prefersReducedMotion() || activeSlides.length <= 1) {
      clearInterval(timerRef.current);
      return undefined;
    }

    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % activeSlides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [activeSlides.length, isSlideshowPaused]);

  useEffect(() => {
    if (!nextImageUrl) return;

    warmHeroImage(nextImageUrl);
  }, [nextImageUrl]);

  useEffect(() => {
    if (!currentImageUrl) return undefined;

    warmHeroImage(currentImageUrl);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        warmHeroImage(currentImageUrl);
        if (nextImageUrl) warmHeroImage(nextImageUrl);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handleVisibilityChange);
    };
  }, [currentImageUrl, nextImageUrl]);

  const handleNext = () => {
    setCurrent(prev => (prev + 1) % activeSlides.length);
    resetTimer();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const handleBack = () => {
    setCurrent(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
    resetTimer();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const handleSlideClick = () => {
    if (!primarySlideUrl) return;

    if (primarySlideIsExternal) {
      window.open(primarySlideUrl, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = primarySlideUrl;
  };

  const handleSlideKeyDown = (event) => {
    if (!primarySlideUrl) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSlideClick();
    }
  };

  const handleCurrentImageReady = (event) => {
    const image = event?.currentTarget;
    if (image?.naturalWidth && image?.naturalHeight && currentImageUrl) {
      const nextAspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
      setImageAspectRatios((currentRatios) => (
        currentRatios[currentImageUrl] === nextAspectRatio
          ? currentRatios
          : { ...currentRatios, [currentImageUrl]: nextAspectRatio }
      ));
    }

    if (hasReportedReadyRef.current) return;
    hasReportedReadyRef.current = true;
    setHasInitialHeroReady(true);
    onReady?.();
  };

  const handleCurrentImageError = () => {
    const linkedAnnouncementImage = getLinkedAnnouncementImage(currentSlide);
    if (currentSlide?.announcement_id && linkedAnnouncementImage && linkedAnnouncementImage !== currentSlide.image_url) {
      setFailedAnnouncementImageIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(String(currentSlide.announcement_id));
        return nextIds;
      });
    }

    handleCurrentImageReady();
  };

  return (
    <section ref={sectionRef} className="relative w-full bg-white">
      <style>
        {`
          @keyframes welcomeHeroTextSettle {
            0% {
              opacity: 0;
              transform: translate3d(-36px, 16px, 0);
              filter: blur(12px);
            }
            55% {
              opacity: 1;
              transform: translate3d(0, 0, 0);
              filter: blur(0);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, -4px, 0);
              filter: blur(0);
            }
          }

          @keyframes welcomeHeroTextFloat {
            0%, 100% { transform: translate3d(0, -4px, 0); }
            25% { transform: translate3d(8px, -10px, 0); }
            50% { transform: translate3d(16px, -5px, 0); }
            75% { transform: translate3d(7px, 2px, 0); }
          }

          @keyframes welcomeHeroLineReveal {
            from {
              opacity: 0;
              transform: scaleX(0);
            }
            to {
              opacity: 1;
              transform: scaleX(1);
            }
          }

          @keyframes welcomeHeroCtaReveal {
            from {
              opacity: 0;
              transform: translate3d(-12px, 10px, 0);
            }
            to {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }

          @keyframes welcomeHeroCtaSheen {
            from { transform: translateX(-140%) skewX(-18deg); }
            to { transform: translateX(220%) skewX(-18deg); }
          }

          @keyframes welcomeHeroImageZoom {
            from { transform: scale(1); }
            to { transform: scale(1.1); }
          }

          @keyframes heroSlideImageSlowZoom {
            from { transform: scale(1); }
            to { transform: scale(1.045); }
          }

          .welcome-hero-image {
            animation: welcomeHeroImageZoom 16s ease-out forwards;
            transform-origin: center center;
            will-change: transform;
          }

          .hero-slide-image-slow-zoom {
            animation: heroSlideImageSlowZoom 28s ease-out forwards;
            transform-origin: center center;
            will-change: transform;
          }

          .welcome-hero-copy {
            animation:
              welcomeHeroTextSettle 1.45s cubic-bezier(.16, 1, .3, 1) .45s both,
              welcomeHeroTextFloat 14s ease-in-out 2.05s infinite;
            will-change: transform;
          }

          .welcome-hero-line {
            animation: welcomeHeroLineReveal .9s ease-out 1.35s both;
          }

          .welcome-hero-cta {
            animation: welcomeHeroCtaReveal .8s ease-out 1.55s both;
          }

          .welcome-hero-cta::before {
            content: "";
            position: absolute;
            top: -30%;
            bottom: -30%;
            left: 0;
            width: 38%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.58), transparent);
            filter: blur(1px);
            pointer-events: none;
            animation: welcomeHeroCtaSheen 4.8s ease-in-out 2.4s infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .welcome-hero-image,
            .hero-slide-image-slow-zoom,
            .welcome-hero-copy,
            .welcome-hero-line,
            .welcome-hero-cta,
            .welcome-hero-cta::before {
              animation: none !important;
              transform: none !important;
              filter: none !important;
            }
          }
        `}
      </style>

      {!isTickerClosed && displayBannerMessages.length > 0 && (
        <div className={`homepage-ticker relative text-white border-y ${isLiveTicker ? 'bg-red-700 border-red-200/40' : 'bg-[#3f2a1f] border-amber-300/30'}`}>
          <div className="homepage-ticker__track h-6 pr-12">
            {currentBannerIsYoutubeLive ? (
              <a
                key={`${currentBannerMessage}-${currentBannerIndex}`}
                href={youtubeLiveStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="homepage-ticker__message inline-flex h-full items-center gap-3 whitespace-nowrap text-[11px] font-bold tracking-wide underline-offset-4 hover:underline md:text-sm"
                onAnimationIteration={handleBannerCycle}
              >
                <span>{currentBannerMessage}</span>
                <span className="rounded-sm bg-white px-2 py-0.5 text-[10px] font-black tracking-wide text-red-700 shadow-sm md:text-xs">
                  LIVE
                </span>
              </a>
            ) : (
              <span
                key={`${currentBannerMessage}-${currentBannerIndex}`}
                className="homepage-ticker__message inline-flex h-full items-center whitespace-nowrap text-[11px] font-bold tracking-wide md:text-sm"
                onAnimationIteration={handleBannerCycle}
              >
                {currentBannerMessage}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsTickerClosed(true)}
            className={`absolute right-0 top-0 z-20 flex h-full w-8 items-center justify-center text-white/70 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/70 ${isLiveTicker ? 'bg-red-700' : 'bg-[#3f2a1f]'}`}
            aria-label="Close homepage banner"
          >
            <span aria-hidden="true" className="text-sm leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Slides */}
      {currentSlide && (
        <div
          className={`relative w-full overflow-hidden bg-[#f7edcf] ${primarySlideUrl ? "cursor-pointer" : ""}`}
          style={{
            aspectRatio: showWelcomeHeroIntro ? "16 / 9" : currentImageAspectRatio,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: showWelcomeHeroIntro ? "cover" : "contain",
          }}
          onClick={handleSlideClick}
          onKeyDown={handleSlideKeyDown}
          role={primarySlideUrl ? "link" : undefined}
          tabIndex={primarySlideUrl ? 0 : undefined}
          aria-label={primarySlideUrl ? `Open ${currentSlide.link_label || currentSlide.alt_text || "hero slide details"}` : undefined}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={`${currentSlide.id || currentImageUrl}-${currentImageUrl}`}
              className="absolute inset-0 h-full w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
            >
              <picture>
                {currentResponsiveImageProps.avifSrcSet && (
                  <source
                    type="image/avif"
                    srcSet={currentResponsiveImageProps.avifSrcSet}
                    sizes={currentResponsiveImageProps.sizes}
                  />
                )}
                {currentResponsiveImageProps.webpSrcSet && (
                  <source
                    type="image/webp"
                    srcSet={currentResponsiveImageProps.webpSrcSet}
                    sizes={currentResponsiveImageProps.sizes}
                  />
                )}
                <img
                  src={currentResponsiveImageProps.fallbackSrc || currentImageUrl}
                  sizes={currentResponsiveImageProps.sizes}
                  width={currentResponsiveImageProps.width}
                  height={currentResponsiveImageProps.height}
                  alt={currentSlide.alt_text || "Slide"}
                  className={`block h-full w-full ${showWelcomeHeroIntro ? "object-cover welcome-hero-image" : "object-contain hero-slide-image-slow-zoom"}`}
                  draggable={false}
                  decoding="async"
                  fetchPriority="high"
                  loading="eager"
                  onLoad={handleCurrentImageReady}
                  onError={handleCurrentImageError}
                />
              </picture>
              {showWelcomeHeroIntro && (
                <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-start bg-gradient-to-r from-black/72 via-black/34 to-transparent px-4 text-left sm:px-8 md:px-14">
                  <div className="welcome-hero-copy ml-[3vw] max-w-[min(68vw,620px)] sm:ml-[6vw] sm:max-w-[min(64vw,660px)] md:ml-[10vw] md:max-w-[min(78vw,720px)] lg:ml-[12vw]">
                    <p
                      className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-[11px] md:mb-3 md:text-base"
                    >
                      Welcome to
                    </p>
                    <h1
                      className="text-balance font-serif text-[clamp(1.7rem,7.2vw,2.55rem)] font-bold leading-[0.98] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] sm:text-[clamp(2rem,4.9vw,3rem)] md:text-6xl md:leading-tight lg:text-7xl"
                    >
                      Goodwill Presbyterian Church, USA
                    </h1>
                    <div className="welcome-hero-line mt-1.5 h-px w-20 origin-left bg-gradient-to-r from-amber-200 via-white/70 to-transparent sm:w-32 md:mt-5 md:w-48" />
                    {welcomeHeroUrl && (
                      <div className="mt-2.5 flex flex-wrap items-stretch gap-2 sm:mt-3 sm:gap-3 md:mt-7 md:gap-4">
                        <span className="pointer-events-none inline-flex items-center font-serif text-base font-semibold italic leading-none text-amber-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)] sm:text-lg md:text-3xl">
                          New Here?
                        </span>
                        <a
                          href={welcomeHeroUrl}
                          className="welcome-hero-cta pointer-events-auto group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl border border-amber-100/80 bg-gradient-to-r from-[#c58a1f] via-[#f3c45b] to-[#b87918] px-2.5 py-1 text-[11px] font-bold text-[#2d1c12] shadow-[0_14px_36px_rgba(0,0,0,0.35),0_0_28px_rgba(243,196,91,0.28)] ring-1 ring-white/30 transition-all duration-500 hover:-translate-y-0.5 hover:scale-[1.03] hover:rounded-2xl hover:from-[#f4cc69] hover:via-[#fff0a8] hover:to-[#c58a1f] hover:shadow-[0_18px_42px_rgba(0,0,0,0.42),0_0_38px_rgba(243,196,91,0.45)] focus:outline-none focus:ring-4 focus:ring-amber-200/55 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2.5 md:text-base"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="relative z-10">{currentSlide.link_label || "Learn More"}</span>
                          <ArrowUpRight className="relative z-10 h-4 w-4 shrink-0 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 md:h-5 md:w-5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Link overlay buttons */}
              {((!showWelcomeHeroIntro && welcomeHeroUrl) || relatedAnnouncementUrl || showExternalSlideButton) && (
                <div
                  className={
                    currentSlide.is_priority_announcement
                      ? "absolute bottom-3 left-1/2 z-20 hidden max-w-[calc(100%-1rem)] -translate-x-1/2 items-center justify-center gap-1.5 overflow-x-auto whitespace-nowrap md:flex"
                      : "absolute bottom-2 left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center justify-center gap-1.5 overflow-x-auto whitespace-nowrap sm:bottom-4 sm:gap-2 md:bottom-6"
                  }
                >
                  {relatedAnnouncementUrl && (
                    <a
                      href={relatedAnnouncementUrl}
                      className={
                        currentSlide.is_priority_announcement
                          ? "inline-flex items-center gap-1 rounded-xl border border-white/45 bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:-translate-y-0.5 hover:rounded-2xl hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-xl md:px-4 md:py-2 md:text-base"
                          : "inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/45 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:-translate-y-0.5 hover:rounded-xl hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-xl sm:px-3 sm:py-1.5 sm:text-sm md:rounded-xl md:px-4 md:py-2 md:text-base"
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {currentSlide.details_button_label || currentSlide.link_label || "Read More"}
                    </a>
                  )}
                  {welcomeHeroUrl && (
                    <a
                      href={welcomeHeroUrl}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/50 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:-translate-y-0.5 hover:rounded-2xl hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-xl sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm md:px-5 md:py-2.5 md:text-base"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowRight className="h-4 w-4" />
                      {currentSlide.link_label || "Learn More"}
                    </a>
                  )}
                  {externalActionButtons.map((button) => (
                    button.type === "virtual" && (button.countdown || button.isLive) ? (
                      <div key={`${button.type}-${button.url}`} className="flex shrink-0 items-center gap-1.5">
                        <a
                          href={button.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200/50 bg-blue-600/95 px-2 py-1 text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:rounded-xl hover:bg-blue-700 hover:shadow-xl sm:px-3 sm:py-1.5 sm:text-sm md:rounded-xl md:px-4 md:py-2 md:text-base"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Video className="w-4 h-4" />
                          <span>{button.label}</span>
                          {button.isLive && (
                            <span className="ml-2 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.24)] animate-pulse" aria-hidden="true" />
                          )}
                        </a>
                        {button.countdown && (
                          <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/80 bg-gradient-to-r from-white via-blue-50 to-white px-2 py-1 text-[10px] font-extrabold leading-none text-blue-950 shadow-[0_10px_26px_rgba(0,0,0,0.32),0_0_18px_rgba(59,130,246,0.32)] ring-1 ring-blue-300/70 backdrop-blur-sm sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-xs md:px-3 md:py-2">
                            <Clock className="h-3 w-3 text-blue-600 md:h-3.5 md:w-3.5" />
                            <span className="text-blue-700">Starts in</span>
                            <span className="tabular-nums text-blue-950">{button.countdown}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <a
                        key={`${button.type}-${button.url}`}
                        href={button.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          button.type === "directions"
                            ? "inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-100/80 bg-gradient-to-r from-[#b87918] via-[#f3c45b] to-[#c58a1f] px-2 py-1 text-[11px] font-bold text-[#2d1c12] shadow-[0_10px_26px_rgba(0,0,0,0.26),0_0_18px_rgba(243,196,91,0.22)] ring-1 ring-white/25 transition-all hover:-translate-y-0.5 hover:rounded-xl hover:from-[#f4cc69] hover:via-[#fff0a8] hover:to-[#c58a1f] hover:shadow-[0_14px_32px_rgba(0,0,0,0.34),0_0_26px_rgba(243,196,91,0.36)] sm:px-3 sm:py-1.5 sm:text-sm md:rounded-xl md:px-4 md:py-2 md:text-base"
                            : "inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200/50 bg-blue-600/95 px-2 py-1 text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:rounded-xl hover:bg-blue-700 hover:shadow-xl sm:px-3 sm:py-1.5 sm:text-sm md:rounded-xl md:px-4 md:py-2 md:text-base"
                        }
                        onClick={(e) => e.stopPropagation()}
                      >
                        {button.type === "directions" ? (
                          <Navigation className="w-4 h-4" />
                        ) : button.type === "virtual" ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        <span>{button.label}</span>
                      </a>
                    )
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Church name signature */}
          <div className="absolute right-3 top-2 z-20 text-right">
            <div className="leading-tight">
              <div className="text-[11px] text-amber-200 sm:text-[15px]" style={{ textShadow: '0 2px 2px rgba(0,0,0,1), 0 4px 8px rgba(0,0,0,1), 1px 1px 12px rgba(0,0,0,0.95)', fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>Goodwill</div>
              <div className="text-[5px] uppercase tracking-[0.18em] text-white sm:text-[7px]" style={{ textShadow: '0 1px 2px rgba(0,0,0,1), 0 3px 7px rgba(0,0,0,1), 1px 1px 10px rgba(0,0,0,0.95)', letterSpacing: '0.22em' }}>Presbyterian Church, USA</div>
            </div>
          </div>

          {/* Zoom Countdown Overlay — only on the Bible Study slide */}
          {showVirtualCountdownOverlay && (
            <ZoomCountdownOverlay
              event={virtualCountdownEvent}
              fallbackSchedule={null}
            />
          )}

          {activeSlides.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsSlideshowPaused((paused) => !paused);
              }}
              className="absolute bottom-3 left-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white"
              aria-label={isSlideshowPaused ? "Resume slideshow" : "Pause slideshow"}
              aria-pressed={isSlideshowPaused}
            >
              {isSlideshowPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
          )}
        </div>
      )}

      {currentSlide?.is_priority_announcement && (relatedAnnouncementUrl || showExternalSlideButton) && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-[#3f2a1f] px-4 py-2 text-center md:hidden">
          {relatedAnnouncementUrl && (
            <a
              href={relatedAnnouncementUrl}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-white/45 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-xl"
            >
              <ExternalLink className="h-4 w-4" />
              {currentSlide.details_button_label || currentSlide.link_label || "Read More"}
            </a>
          )}
          {externalActionButtons.map((button) => (
            button.type === "virtual" && (button.countdown || button.isLive) ? (
              <div key={`${button.type}-${button.url}-mobile`} className="flex items-center gap-1.5">
                <a
                  href={button.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-blue-200/70 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:bg-blue-700"
                >
                  <Video className="h-4 w-4" />
                  <span>{button.label}</span>
                  {button.isLive && (
                    <span className="ml-2 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_0_4px_rgba(239,68,68,0.24)]" aria-hidden="true" />
                  )}
                </a>
                {button.countdown && (
                  <div className="inline-flex items-center gap-1 rounded-xl border border-white/80 bg-gradient-to-r from-white via-blue-50 to-white px-2 py-1 text-[10px] font-extrabold leading-none text-blue-950 shadow-[0_8px_20px_rgba(0,0,0,0.22)] ring-1 ring-blue-300/70">
                    <Clock className="h-3 w-3 text-blue-600" />
                    <span>Starts in</span>
                    <span className="tabular-nums">{button.countdown}</span>
                  </div>
                )}
              </div>
            ) : (
              <a
                key={`${button.type}-${button.url}-mobile`}
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  button.type === "directions"
                    ? "inline-flex items-center justify-center gap-1 rounded-xl border border-amber-100/80 bg-gradient-to-r from-[#b87918] via-[#f3c45b] to-[#c58a1f] px-3 py-1.5 text-xs font-bold text-[#2d1c12] shadow-lg ring-1 ring-white/25 transition-all hover:bg-amber-400"
                    : "inline-flex items-center justify-center gap-1 rounded-full border border-blue-200/70 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:bg-blue-700"
                }
              >
                {button.type === "directions" ? (
                  <Navigation className="h-4 w-4" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                <span>{button.label}</span>
              </a>
            )
          ))}
        </div>
      )}

      {/* Prev / Next buttons */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={handleBack}
            className="absolute left-0 top-1/2 z-30 -translate-y-1/2 rounded-r-full bg-black/40 p-2 text-white transition-all hover:bg-black/70"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-full bg-black/40 p-2 text-white transition-all hover:bg-black/70"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </section>
  );
}
