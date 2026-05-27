import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Video, Clock } from "lucide-react";
import { localApi } from "@/api/localApiClient";
import { format } from "date-fns";

// Fallback slides if no slides are in the database
const FALLBACK_SLIDES = [
  {
    image_url: "/images/hero/goodwill-presbyterian-church-hero.png",
    alt_text: "Welcome to Goodwill Presbyterian Church",
    link_url: "",
    link_label: "",
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

const HOMEPAGE_BANNER_MESSAGES = [
  "\u{1F64F} Our Live Service happens every Sunday at 10:30 am.",
  "\u{1F4BB} Join us every Wednesday at 6:30 pm for our weekly Bible Study on Zoom.",
];

const LIVE_SERVICE_BANNER_MESSAGE = "\u{1F534} Our Live service is happening now, click the Live button to join.";
const LIVE_BIBLE_STUDY_BANNER_MESSAGE = "\u{1F534} Our Zoom Bible Study is happening now. Click the Zoom button to join us.";

// Bible Study: pin the Zoom slide every Wednesday from 6:00 PM to 7:00 PM.
const BIBLE_STUDY_ZOOM = "https://us06web.zoom.us/j/82013337566?pwd=mULnQC1Zjg5GWkoTTKGvx3PyAFaCeZ.1";
const BIBLE_STUDY_START_HOUR = 18; // 6:00 PM
const BIBLE_STUDY_START_MIN = 0;
const BIBLE_STUDY_END_HOUR = 19;   // 7:00 PM
const BIBLE_STUDY_END_MIN = 0;

function isZoomBibleStudySlide(slide) {
  if (!slide) return false;

  return slide.is_zoom_bible_study === true
    || slide.alt_text?.toLowerCase().includes("bible study")
    || slide.alt_text?.toLowerCase().includes("zoom")
    || slide.link_url?.includes("zoom.us")
    || slide.image_url?.toLowerCase().includes("zoom");
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

export default function HeroSlideshow() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [isTickerClosed, setIsTickerClosed] = useState(false);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef(null);
  const sectionRef = useRef(null);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isLiveServiceBannerTime = now.getDay() === 0 && currentMinutes >= 10 * 60 + 30 && currentMinutes < 12 * 60;
  const isBibleStudyPinnedTime = now.getDay() === 3
    && currentMinutes >= BIBLE_STUDY_START_HOUR * 60 + BIBLE_STUDY_START_MIN
    && currentMinutes < BIBLE_STUDY_END_HOUR * 60 + BIBLE_STUDY_END_MIN;
  const isLiveBibleStudyTime = isBibleStudyPinnedTime;
  const isLiveBanner = isLiveServiceBannerTime || isLiveBibleStudyTime;

  const bannerMessages = useMemo(() => {
    if (isLiveBibleStudyTime) return [LIVE_BIBLE_STUDY_BANNER_MESSAGE];
    if (isLiveServiceBannerTime) return [LIVE_SERVICE_BANNER_MESSAGE];
    return HOMEPAGE_BANNER_MESSAGES;
  }, [isLiveBibleStudyTime, isLiveServiceBannerTime]);

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const data = await localApi.entities.HeroSlide.list('order', 50);
        const active = data.filter(s => s.is_active !== false);
        if (active.length > 0) {
          setSlides(active);
        } else {
          setSlides(FALLBACK_SLIDES);
        }
      } catch {
        setSlides(FALLBACK_SLIDES);
      }
    };
    loadSlides();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const activeSlides = useMemo(() => {
    if (!isBibleStudyPinnedTime) return slides;

    const zoomSlides = slides.filter(isZoomBibleStudySlide);

    return zoomSlides.length > 0 ? zoomSlides : slides;
  }, [isBibleStudyPinnedTime, slides]);

  useEffect(() => {
    setCurrent(0);
  }, [activeSlides.length, isBibleStudyPinnedTime]);

  useEffect(() => {
    if (isLiveBanner) {
      setIsTickerClosed(false);
    }
  }, [isLiveBanner]);

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

  return (
    <section ref={sectionRef} className="relative w-full bg-white">
      {!isTickerClosed && (
        <div className={`homepage-ticker relative text-white border-y ${isLiveBanner ? 'bg-red-700 border-red-200/40' : 'bg-[#3f2a1f] border-amber-300/30'}`}>
          <div className="homepage-ticker__track h-5 pr-12">
            {bannerMessages.map((message, index) => (
              <span
                key={`${message}-${index}`}
                className="homepage-ticker__message inline-flex h-full items-center whitespace-nowrap text-[11px] font-light tracking-wide md:text-xs"
              >
                {message}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsTickerClosed(true)}
            className={`absolute right-0 top-0 z-20 flex h-full w-8 items-center justify-center text-white/70 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/70 ${isLiveBanner ? 'bg-red-700' : 'bg-[#3f2a1f]'}`}
            aria-label="Close homepage banner"
          >
            <span aria-hidden="true" className="text-sm leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Slides */}
      {activeSlides.length > 0 && (
        <div className="relative aspect-[48/19] w-full overflow-hidden bg-black">
          {activeSlides.map((slide, i) => (
            <div
              key={i}
              className="relative h-full w-full transition-opacity duration-700"
              style={{ display: i === current ? 'block' : 'none' }}
            >
              <img
                src={slide.image_url}
                alt={slide.alt_text || "Slide"}
                className="block h-full w-full object-contain"
                draggable={false}
              />
              {/* Link overlay button */}
              {(slide.link_url || isZoomBibleStudySlide(slide)) && (
                <a
                  href={slide.link_url || BIBLE_STUDY_ZOOM}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-blue-600/95 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:bg-blue-700 sm:bottom-12 sm:px-4 sm:py-2 sm:text-sm md:bottom-16 md:gap-2 md:px-6 md:py-3 md:text-base"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                  {slide.link_label || (isZoomBibleStudySlide(slide) ? "Join Zoom" : "Learn More")}
                </a>
              )}
            </div>
          ))}

          {/* Church name signature */}
          <div className="absolute right-3 top-2 z-20 text-right">
            <div className="leading-tight">
              <div className="text-[11px] text-amber-200 sm:text-[15px]" style={{ textShadow: '0 2px 2px rgba(0,0,0,1), 0 4px 8px rgba(0,0,0,1), 1px 1px 12px rgba(0,0,0,0.95)', fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>Goodwill</div>
              <div className="text-[5px] uppercase tracking-[0.18em] text-white sm:text-[7px]" style={{ textShadow: '0 1px 2px rgba(0,0,0,1), 0 3px 7px rgba(0,0,0,1), 1px 1px 10px rgba(0,0,0,0.95)', letterSpacing: '0.22em' }}>Presbyterian Church, USA</div>
            </div>
          </div>

          {/* Zoom Countdown Overlay — only on the Bible Study slide */}
          {isZoomBibleStudySlide(activeSlides[current]) && (
            <ZoomCountdownOverlay />
          )}
        </div>
      )}

      {/* Prev / Next buttons */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={handleBack}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </section>
  );
}
