import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Video, Clock, Navigation } from "lucide-react";
import { localApi } from "@/api/localApiClient";
import { format } from "date-fns";
import { DEFAULT_HOMEPAGE_BANNER_MESSAGES, LIVE_BIBLE_STUDY_BANNER_MESSAGE } from "@/lib/homepageBanners";
import { createSpecialServiceHeroSlide, getActiveSpecialServiceNotice } from "@/lib/specialServiceNotice";

// Fallback slides if no slides are in the database
const FALLBACK_SLIDES = [
  {
    image_url: "/images/hero/goodwill-presbyterian-church-hero.png",
    alt_text: "Welcome to Goodwill Presbyterian Church",
    link_url: "/About",
    link_label: "Learn More",
  },
  {
    image_url: "/images/hero/zoom-meeting-hero.png",
    alt_text: "Join us every Wednesday at 6:30 PM for Zoom Bible Study",
    link_url: "https://us06web.zoom.us/j/82013337566?pwd=mULnQC1Zjg5GWkoTTKGvx3PyAFaCeZ.1",
    link_label: "Join Zoom",
    is_zoom_bible_study: true,
  },
  {
    image_url: "/images/hero/pentecost-sunday-hero.png",
    alt_text: "Pentecost Sunday",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/juneteenth-celebration-hero.png",
    alt_text: "Juneteenth Celebration",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/celebrating-achievements.png",
    alt_text: "Celebrating Achievements",
    link_url: "",
    link_label: "",
    announcement_id: "celebrations-accomplishments-thanksgiving-recognition",
  },
  {
    image_url: "/images/hero/chancel-choir-spring-concert.png",
    alt_text: "Chancel Choir Spring Concert",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/christian-education-youth-ministry.png",
    alt_text: "Christian Education and Youth Ministry",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/devotional-booklet.png",
    alt_text: "Devotional Booklet Distribution",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/dr-lawson-fortune-phd.png",
    alt_text: "Congratulations to Dr. Lawson Fortune",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/health-focused-hero.png",
    alt_text: "Health-Focused Ministry",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/health-prayer-focus.png",
    alt_text: "Health and Prayer Focus for June",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/johnson-c-smith-university-day.png",
    alt_text: "Johnson C. Smith University Day",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/honoring-our-educators-hero.png",
    alt_text: "Honoring Our Educators",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/juneteenth-celebration-2.png",
    alt_text: "Juneteenth Worship Celebration",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/may-birthdays.png",
    alt_text: "May Birthdays",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/midlands-gives.png",
    alt_text: "Midlands Gives",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/online-worshipers-hero.png",
    alt_text: "Online Worshipers Prayer, Care and Connection",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/scholarship-fund.png",
    alt_text: "College and Higher Education Scholarship Fund",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/summer-summit.png",
    alt_text: "Summer Summit",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/vacation-bible-school.png",
    alt_text: "Vacation Bible School",
    link_url: "",
    link_label: "",
  },
];

const SLIDE_INTERVAL = 10000;

const LIVE_SERVICE_BANNER_MESSAGE = "\u{1F534} Our Live service is happening now, click the Live button to join.";
// Bible Study: pin the Zoom slide every Wednesday from 6:00 PM to 7:00 PM.
const BIBLE_STUDY_ZOOM = "https://us06web.zoom.us/j/82013337566?pwd=mULnQC1Zjg5GWkoTTKGvx3PyAFaCeZ.1";
const BIBLE_STUDY_START_HOUR = 18; // 6:00 PM
const BIBLE_STUDY_START_MIN = 0;
const BIBLE_STUDY_END_HOUR = 19;   // 7:00 PM
const BIBLE_STUDY_END_MIN = 0;
const SHOW_HERO_EXTERNAL_ACTION_BUTTON = false;
const SHOW_BIBLE_STUDY_COUNTDOWN_OVERLAY = false;
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

// Get this Wednesday's (or next Wednesday's) Bible Study times
function getNextBibleStudy(now) {
  const d = new Date(now);
  // Day of week: 0=Sun, 3=Wed
  const day = d.getDay();
  const daysUntilWed = (3 - day + 7) % 7;
  
  const wed = new Date(d);
  wed.setDate(d.getDate() + daysUntilWed);
  wed.setHours(BIBLE_STUDY_START_HOUR, BIBLE_STUDY_START_MIN, 0, 0);

  const wedEnd = new Date(wed);
  wedEnd.setHours(BIBLE_STUDY_END_HOUR, BIBLE_STUDY_END_MIN, 0, 0);

  // If today is Wednesday but we're already past 7:00 PM, get NEXT Wednesday
  if (daysUntilWed === 0 && now >= wedEnd) {
    wed.setDate(wed.getDate() + 7);
    wedEnd.setDate(wedEnd.getDate() + 7);
  }

  return { start: wed, end: wedEnd };
}

function ZoomCountdownOverlay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { start, end } = useMemo(() => getNextBibleStudy(now), [now]);

  const isOngoing = now >= start && now < end;                    // Wed 6:00-7:00 PM

  const msUntilStart = Math.max(0, start - now);
  const totalSeconds = Math.floor(msUntilStart / 1000);
  return (
    <div className="absolute bottom-2 right-3 z-20 flex justify-end">
      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 flex flex-col items-center gap-0.5 shadow-xl border border-white/20">

        {/* DEFAULT: full countdown to next session */}
        {!isOngoing && (
          <>
            <div className="flex items-center gap-1 text-amber-300 text-[10px] font-semibold">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              Next Bible Study
            </div>
            <div className="text-white text-[10px] font-semibold">{format(start, "MMMM dd")}</div>
            <div className="flex items-center gap-1.5 tabular-nums">
              {[
                { val: Math.floor(totalSeconds / 86400), label: "d" },
                { val: Math.floor((totalSeconds % 86400) / 3600), label: "h" },
                { val: Math.floor((totalSeconds % 3600) / 60), label: "m" },
                { val: totalSeconds % 60, label: "s" },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-white font-bold text-xs leading-none">{String(val).padStart(2, "0")}</span>
                  <span className="text-amber-300 text-[9px] uppercase">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* LIVE: 6:00-7:00 PM */}
        {isOngoing && (
          <>
            <div className="flex items-center gap-1 text-green-300 text-[10px] font-semibold">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live Now!
            </div>
            <a
              href={BIBLE_STUDY_ZOOM}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1 rounded-full shadow transition-all text-[10px]"
            >
              <Video className="w-3 h-3" />
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
  const [landingImage, setLandingImage] = useState(DEFAULT_LANDING_IMAGE);
  const [announcements, setAnnouncements] = useState([]);
  const [failedAnnouncementImageIds, setFailedAnnouncementImageIds] = useState(() => new Set());
  const [managedBanners, setManagedBanners] = useState(null);
  const [current, setCurrent] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isTickerClosed, setIsTickerClosed] = useState(false);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef(null);
  const sectionRef = useRef(null);
  const hasReportedReadyRef = useRef(false);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isLiveServiceBannerTime = now.getDay() === 0 && currentMinutes >= 10 * 60 + 30 && currentMinutes < 12 * 60;
  const isBibleStudyPinnedTime = now.getDay() === 3
    && currentMinutes >= BIBLE_STUDY_START_HOUR * 60 + BIBLE_STUDY_START_MIN
    && currentMinutes < BIBLE_STUDY_END_HOUR * 60 + BIBLE_STUDY_END_MIN;
  const isLiveBibleStudyTime = isBibleStudyPinnedTime;
  const isLiveBanner = isLiveServiceBannerTime || isLiveBibleStudyTime;
  const activeSpecialServiceNotice = useMemo(() => getActiveSpecialServiceNotice(now), [now]);
  const specialServiceSlide = useMemo(() => {
    if (!activeSpecialServiceNotice) return null;

    return createSpecialServiceHeroSlide(activeSpecialServiceNotice);
  }, [activeSpecialServiceNotice]);

  const bannerMessages = useMemo(() => {
    if (activeSpecialServiceNotice) return [activeSpecialServiceNotice.message];
    if (isLiveBibleStudyTime) {
      const liveBibleStudyBanner = managedBanners?.find((banner) => banner.is_bible_study_live_banner);
      if (!liveBibleStudyBanner || liveBibleStudyBanner.status === "active" || liveBibleStudyBanner.status === "live") {
        return [liveBibleStudyBanner?.message || LIVE_BIBLE_STUDY_BANNER_MESSAGE].filter(Boolean);
      }
    }
    if (isLiveServiceBannerTime) return [LIVE_SERVICE_BANNER_MESSAGE];

    if (Array.isArray(managedBanners)) {
      const messages = managedBanners
        .filter((banner) => !banner.is_bible_study_live_banner && (banner.status === "live" || banner.status === "active"))
        .map((banner) => banner.message)
        .filter(Boolean);

      if (managedBanners.length > 0 || messages.length > 0) return messages;
    }

    return DEFAULT_HOMEPAGE_BANNER_MESSAGES;
  }, [activeSpecialServiceNotice, isLiveBibleStudyTime, isLiveServiceBannerTime, managedBanners]);

  const hasLiveManagedBanner = managedBanners?.some((banner) => banner.status === "live") || false;
  const isLiveTicker = Boolean(activeSpecialServiceNotice) || isLiveBanner || hasLiveManagedBanner;
  const currentBannerMessage = bannerMessages[currentBannerIndex] || bannerMessages[0];

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const [data, announcementData, landingImageData] = await Promise.all([
          localApi.entities.HeroSlide.list('order', 50),
          localApi.entities.AnnouncementsEvents.list('-created_date', 200).catch(() => []),
          localApi.entities.LandingImage.list('-updated_date', 10).catch(() => []),
        ]);
        setAnnouncements(Array.isArray(announcementData) ? announcementData : []);
        const activeLandingImage = Array.isArray(landingImageData)
          ? landingImageData.find((item) => item?.is_active !== false && item?.image_url)
          : null;
        setLandingImage({
          ...DEFAULT_LANDING_IMAGE,
          ...(activeLandingImage || {}),
          id: activeLandingImage?.id || DEFAULT_LANDING_IMAGE.id,
          is_landing_image: true,
          link_url: activeLandingImage?.link_url || ABOUT_PAGE_URL,
          link_label: activeLandingImage?.link_label || "Learn More",
        });
        const active = data.filter((s) => s.is_active !== false && !isPermanentWelcomeHeroSlide(s));
        if (active.length > 0) {
          setSlides(active);
        } else {
          setSlides(FALLBACK_SLIDES.filter((slide) => !isPermanentWelcomeHeroSlide(slide)));
        }
      } catch {
        setAnnouncements([]);
        setLandingImage(DEFAULT_LANDING_IMAGE);
        setSlides(FALLBACK_SLIDES.filter((slide) => !isPermanentWelcomeHeroSlide(slide)));
      }
    };
    loadSlides();
  }, []);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const data = await localApi.entities.HomeBannerMessages.list('-created_date', 100);
        const live = data.filter((banner) => banner.status === "live");
        const standard = data.filter((banner) => banner.status === "active");
        const inactive = data.filter((banner) => banner.status !== "live" && banner.status !== "active");
        setManagedBanners([...live, ...standard, ...inactive]);
      } catch {
        setManagedBanners(null);
      }
    };
    loadBanners();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
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
  const getLinkedAnnouncementImage = (slide) => {
    if (!slide?.announcement_id) return "";
    if (failedAnnouncementImageIds.has(String(slide.announcement_id))) return "";
    const announcement = announcements.find((item) => String(item.id) === String(slide.announcement_id));
    return announcement?.image_upload || "";
  };
  const getSlideImageUrl = (slide) => getLinkedAnnouncementImage(slide) || slide?.image_url || "";
  const currentImageUrl = getSlideImageUrl(currentSlide);
  const nextImageUrl = getSlideImageUrl(nextSlide);
  const isPermanentWelcomeHero = isPermanentWelcomeHeroSlide(currentSlide);
  const isFirstLandingSlide = current === 0 && !currentSlide?.is_priority_announcement && !isZoomBibleStudySlide(currentSlide);
  const showWelcomeHeroIntro = isPermanentWelcomeHero || isFirstLandingSlide;
  const welcomeHeroUrl = isPermanentWelcomeHero ? ABOUT_PAGE_URL : "";
  const relatedAnnouncementUrl = !isPermanentWelcomeHero && currentSlide?.announcement_id
    ? `/Updates#announcement-${currentSlide.announcement_id}`
    : "";
  const explicitSlideUrl = currentSlide?.link_url || "";
  const isExplicitExternalUrl = /^https?:\/\//i.test(explicitSlideUrl);
  const internalSlideUrl = !welcomeHeroUrl && explicitSlideUrl.startsWith("/") ? explicitSlideUrl : "";
  const externalSlideUrl = isExplicitExternalUrl
    ? explicitSlideUrl
    : isZoomBibleStudySlide(currentSlide) ? BIBLE_STUDY_ZOOM : "";
  const showExternalSlideButton = SHOW_HERO_EXTERNAL_ACTION_BUTTON && Boolean(externalSlideUrl);
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
  }, [bannerMessages.length]);

  const handleBannerCycle = () => {
    if (bannerMessages.length <= 1) return;
    setCurrentBannerIndex(prev => (prev + 1) % bannerMessages.length);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % activeSlides.length);
    }, SLIDE_INTERVAL);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % activeSlides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [activeSlides.length]);

  useEffect(() => {
    if (!nextImageUrl) return;

    const image = new Image();
    image.decoding = "async";
    image.src = nextImageUrl;
  }, [nextImageUrl]);

  const handleNext = () => {
    setCurrent(prev => (prev + 1) % activeSlides.length);
    resetTimer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrent(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
    resetTimer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleCurrentImageReady = () => {
    if (hasReportedReadyRef.current) return;
    hasReportedReadyRef.current = true;
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

          @keyframes welcomeHeroImageZoom {
            from { transform: scale(1); }
            to { transform: scale(1.1); }
          }

          .welcome-hero-image {
            animation: welcomeHeroImageZoom 16s ease-out forwards;
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
        `}
      </style>

      {!isTickerClosed && bannerMessages.length > 0 && (
        <div className={`homepage-ticker relative text-white border-y ${isLiveTicker ? 'bg-red-700 border-red-200/40' : 'bg-[#3f2a1f] border-amber-300/30'}`}>
          <div className="homepage-ticker__track h-6 pr-12">
            <span
              key={`${currentBannerMessage}-${currentBannerIndex}`}
              className="homepage-ticker__message inline-flex h-full items-center whitespace-nowrap text-[11px] font-bold tracking-wide md:text-sm"
              onAnimationIteration={handleBannerCycle}
            >
              {currentBannerMessage}
            </span>
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
          className={`relative h-[68vw] min-h-[260px] max-h-[420px] w-full overflow-hidden bg-black sm:h-[60vw] md:aspect-video md:h-auto md:min-h-0 md:max-h-none ${primarySlideUrl ? "cursor-pointer" : ""}`}
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
              <img
                src={currentImageUrl}
                alt={currentSlide.alt_text || "Slide"}
                className={`block h-full w-full object-cover ${showWelcomeHeroIntro ? "welcome-hero-image" : "md:object-contain"}`}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                loading="eager"
                onLoad={handleCurrentImageReady}
                onError={handleCurrentImageError}
              />
              {showWelcomeHeroIntro && (
                <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-start bg-gradient-to-r from-black/80 via-black/42 to-transparent px-6 text-left sm:px-10 md:px-14">
                  <div className="welcome-hero-copy ml-[5vw] max-w-[min(78vw,720px)] sm:ml-[8vw] md:ml-[10vw] lg:ml-[12vw]">
                    <p
                      className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-sm md:mb-3 md:text-base"
                    >
                      Welcome to
                    </p>
                    <h1
                      className="text-balance font-serif text-3xl font-bold leading-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] sm:text-5xl md:text-6xl lg:text-7xl"
                    >
                      Goodwill Presbyterian Church, USA
                    </h1>
                    <div className="welcome-hero-line mt-3 h-px w-32 origin-left bg-gradient-to-r from-amber-200 via-white/70 to-transparent sm:w-48 md:mt-5" />
                  </div>
                </div>
              )}
              {/* Link overlay buttons */}
              {(welcomeHeroUrl || relatedAnnouncementUrl || showExternalSlideButton) && (
                <div
                  className={
                    currentSlide.is_priority_announcement
                      ? "absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 flex-wrap items-center justify-center gap-2 md:flex"
                      : "absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 sm:bottom-4 md:bottom-6"
                  }
                >
                  {relatedAnnouncementUrl && (
                    <a
                      href={relatedAnnouncementUrl}
                      className={
                        currentSlide.is_priority_announcement
                          ? "inline-flex items-center gap-1 rounded-full border border-white/45 bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-xl md:px-4 md:py-2 md:text-base"
                          : "inline-flex items-center gap-1 rounded-full border border-white/45 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-xl sm:px-3 sm:py-1.5 sm:text-sm md:px-4 md:py-2 md:text-base"
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {currentSlide.details_button_label || currentSlide.link_label || "More"}
                    </a>
                  )}
                  {welcomeHeroUrl && (
                    <a
                      href={welcomeHeroUrl}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-all hover:border-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-xl sm:px-4 sm:py-2 md:px-5 md:py-2.5 md:text-base"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowRight className="h-4 w-4" />
                      {currentSlide.link_label || "Learn More"}
                    </a>
                  )}
                  {showExternalSlideButton && (
                    <a
                      href={externalSlideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        currentSlide.is_priority_announcement
                          ? "inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-500/95 px-6 py-3 text-base font-bold text-black shadow-lg transition-all hover:bg-amber-400"
                          : "inline-flex items-center gap-1.5 rounded-full bg-blue-600/95 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:bg-blue-700 sm:px-4 sm:py-2 sm:text-sm md:gap-2 md:px-6 md:py-3 md:text-base"
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      {currentSlide.is_priority_announcement ? (
                        <Navigation className="w-4 h-4" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      {currentSlide.link_label || (isZoomBibleStudySlide(currentSlide) ? "Join Zoom" : "More")}
                    </a>
                  )}
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
          {SHOW_BIBLE_STUDY_COUNTDOWN_OVERLAY && isZoomBibleStudySlide(currentSlide) && (
            <ZoomCountdownOverlay />
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
              {currentSlide.details_button_label || currentSlide.link_label || "More"}
            </a>
          )}
          {showExternalSlideButton && (
            <a
              href={externalSlideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow-lg transition-all hover:bg-amber-400"
            >
              <Navigation className="h-4 w-4" />
              {currentSlide.link_label || "Get Directions"}
            </a>
          )}
        </div>
      )}

      {/* Prev / Next buttons */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={handleBack}
            className="absolute bottom-3 left-3 z-30 rounded-full bg-black/40 p-2 text-white transition-all hover:bg-black/70 md:bottom-auto md:top-1/2 md:-translate-y-1/2"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute bottom-3 right-3 z-30 rounded-full bg-black/40 p-2 text-white transition-all hover:bg-black/70 md:bottom-auto md:top-1/2 md:-translate-y-1/2"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </section>
  );
}
