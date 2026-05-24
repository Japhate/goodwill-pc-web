import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Video, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isValid } from "date-fns";

// Fallback slides if no slides are in the database
const FALLBACK_SLIDES = [
  {
    image_url: "/images/hero/welcome-church.png",
    alt_text: "Welcome to Goodwill Presbyterian Church",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/zoom-bible-study.png",
    alt_text: "Join us every Wednesday at 6:30 PM for Zoom Bible Study",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/pentecost-sunday.png",
    alt_text: "Pentecost Sunday",
    link_url: "",
    link_label: "",
  },
  {
    image_url: "/images/hero/welcome-church.png",
    alt_text: "Welcome to Goodwill Presbyterian Church",
    link_url: "",
    link_label: "",
  },
];

const SLIDE_INTERVAL = 10000;

// Bible Study: every Wednesday at 6:30 PM, ends at 7:00 PM
const BIBLE_STUDY_ZOOM = "https://us02web.zoom.us/j/82827270338?pwd=9JhQLcH0WjX6Xvy7LqvNtZUE3UBr9C.1";
const BIBLE_STUDY_START_HOUR = 18; // 6:30 PM
const BIBLE_STUDY_START_MIN = 30;
const BIBLE_STUDY_END_HOUR = 19;   // 7:00 PM
const BIBLE_STUDY_END_MIN = 0;
const COUNTDOWN_START_HOUR = 18;   // Show countdown from 6:00 PM
const COUNTDOWN_START_MIN = 0;

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

  const wedCountdownStart = new Date(wed);
  wedCountdownStart.setHours(COUNTDOWN_START_HOUR, COUNTDOWN_START_MIN, 0, 0);

  // If today is Wednesday but we're already past 7 PM, get NEXT Wednesday
  if (daysUntilWed === 0 && now >= wedEnd) {
    wed.setDate(wed.getDate() + 7);
    wedEnd.setDate(wedEnd.getDate() + 7);
    wedCountdownStart.setDate(wedCountdownStart.getDate() + 7);
  }

  return { start: wed, end: wedEnd, countdownStart: wedCountdownStart };
}

function ZoomCountdownOverlay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { start, end, countdownStart } = useMemo(() => getNextBibleStudy(now), [now]);

  const isCountdownWindow = now >= countdownStart && now < start; // Wed 6:00–6:30 PM
  const isOngoing = now >= start && now < end;                    // Wed 6:30–7:00 PM

  const msUntilStart = Math.max(0, start - now);
  const totalSeconds = Math.floor(msUntilStart / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const nextSessionLabel = format(start, "EEEE, MMMM d 'at' h:mm a");

  return (
    <div className="absolute bottom-2 right-3 z-20 flex justify-end">
      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 flex flex-col items-center gap-0.5 shadow-xl border border-white/20">

        {/* DEFAULT: full countdown to next session */}
        {!isCountdownWindow && !isOngoing && (
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

        {/* COUNTDOWN: 6:00–6:30 PM */}
        {isCountdownWindow && (
          <>
            <div className="flex items-center gap-1 text-amber-300 text-[10px] font-semibold">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              Bible Study starts in
            </div>
            <div className="text-white font-bold text-sm tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
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

        {/* LIVE: 6:30–7:00 PM */}
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

export default function HeroSlideshow({ liveEvents, announcements = [] }) {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const data = await base44.entities.HeroSlide.list('order', 50);
        const active = data.filter(s => s.is_active !== false);
        if (active.length > 0) {
          setSlides(active);
        } else {
          setSlides(FALLBACK_SLIDES);
        }
      } catch (e) {
        setSlides(FALLBACK_SLIDES);
      }
    };
    loadSlides();
  }, []);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const handleNext = () => {
    setCurrent(prev => (prev + 1) % slides.length);
    resetTimer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
    resetTimer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} className="relative w-full bg-white">
      {/* Slides */}
      {slides.length > 0 && (
        <div className="relative w-full h-[calc(100vh-5rem)] min-h-[420px] max-h-[760px] overflow-hidden">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="w-full transition-opacity duration-700"
              style={{ display: i === current ? 'block' : 'none' }}
            >
              <img
                src={slide.image_url}
                alt={slide.alt_text || "Slide"}
                className="h-full w-full object-contain block bg-black"
                draggable={false}
              />
              {/* Link overlay button */}
              {slide.link_url && (
                <a
                  href={slide.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-600/90 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition-all text-sm md:text-base"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                  {slide.link_label || "Learn More"}
                </a>
              )}
            </div>
          ))}

          {/* Church name — bottom left, signature style */}
          <div className="absolute bottom-2 left-3 z-20">
            <div className="leading-tight">
              <div className="text-amber-200" style={{ textShadow: '1px 2px 6px rgba(0,0,0,0.9)', fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: '15px' }}>Goodwill</div>
              <div className="text-white/80 text-[7px] tracking-[0.18em] uppercase" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.9)', letterSpacing: '0.22em' }}>Presbyterian Church, USA</div>
            </div>
          </div>

          {/* Zoom Countdown Overlay — only on the Bible Study slide */}
          {(slides[current]?.alt_text?.toLowerCase().includes('bible study') ||
            slides[current]?.alt_text?.toLowerCase().includes('zoom') ||
            slides[current]?.link_url?.includes('zoom.us')) && (
            <ZoomCountdownOverlay />
          )}
        </div>
      )}

      {/* Prev / Next buttons */}
      {slides.length > 0 && (
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
