import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sermons } from "@/entities/Sermons";
import { Bulletins } from "@/entities/Bulletins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, BookOpen, Calendar, User, FileText, Youtube, Download, Radio, Clock, PlaySquare, X, MapPin, LayoutGrid, List, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveSpecialServiceNotice, getSpecialServiceDateTime } from "@/lib/specialServiceNotice";
import PageLoadingScreen from "@/components/PageLoadingScreen";

const SERMON_BACKGROUND_VIDEO_URL = "/videos/latest-sermon-spiritual-skies.mp4";

// Helper function to extract video ID from YouTube URL
const getYoutubeVideoId = (url) => {
  if (!url) return null;
  // Updated regex to handle /live/ URLs as well
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|live\/|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const BULLETIN_FORMATS = {
  pdf: { extension: 'pdf', label: 'PDF' },
  doc: { extension: 'doc', label: 'Word' },
  docx: { extension: 'docx', label: 'Word' },
};

const getBulletinExtension = (bulletin) => {
  const fromName = String(bulletin?.file_name || '').match(/\.([a-z0-9]+)$/i)?.[1];
  if (fromName && BULLETIN_FORMATS[fromName.toLowerCase()]) return fromName.toLowerCase();

  try {
    const path = decodeURIComponent(new URL(bulletin?.file_url || '', window.location.origin).pathname);
    const fromUrl = path.match(/\.([a-z0-9]+)$/i)?.[1];
    if (fromUrl && BULLETIN_FORMATS[fromUrl.toLowerCase()]) return fromUrl.toLowerCase();
  } catch {
    // Fall back to PDF for older records without a recognizable file extension.
  }

  return 'pdf';
};

const getBulletinFormat = (bulletin) => BULLETIN_FORMATS[getBulletinExtension(bulletin)] || BULLETIN_FORMATS.pdf;

// Helper function to create a clean filename from the bulletin date
const getFilename = (bulletin) => {
    const { extension } = getBulletinFormat(bulletin);
    if (!bulletin || !bulletin.date) return `Worship_Bulletin.${extension}`;
    try {
        const date = parseISO(bulletin.date);
        const formattedDate = format(date, 'MMMM_d_yyyy');
        return `Worship_Bulletin_${formattedDate}.${extension}`;
    } catch (error) {
        console.error("Error formatting date for filename:", error);
        return `Worship_Bulletin.${extension}`;
    }
};

// Helper function to format bulletin date, handling invalid dates
const formatBulletinDate = (dateString) => {
  if (!dateString) return '';
  // Use parseISO to correctly handle date strings, especially ISO 8601 formatted ones from the backend.
  const date = parseISO(dateString);
  return format(date, 'MMMM d, yyyy');
};

const BIBLE_BOOK_ORDER = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth",
  "1 samuel", "2 samuel", "1 kings", "2 kings", "1 chronicles", "2 chronicles", "ezra",
  "nehemiah", "esther", "job", "psalms", "proverbs", "ecclesiastes", "song of solomon",
  "isaiah", "jeremiah", "lamentations", "ezekiel", "daniel", "hosea", "joel", "amos",
  "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah",
  "malachi", "matthew", "mark", "luke", "john", "acts", "romans", "1 corinthians",
  "2 corinthians", "galatians", "ephesians", "philippians", "colossians", "1 thessalonians",
  "2 thessalonians", "1 timothy", "2 timothy", "titus", "philemon", "hebrews", "james",
  "1 peter", "2 peter", "1 john", "2 john", "3 john", "jude", "revelation",
];

const getDateTime = (dateString) => {
  if (!dateString) return null;
  const time = parseISO(dateString).getTime();
  return Number.isNaN(time) ? null : time;
};

const sortByDate = (items, direction = "newest") => {
  return [...items].sort((a, b) => {
    const aTime = getDateTime(a.date);
    const bTime = getDateTime(b.date);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return direction === "oldest" ? aTime - bTime : bTime - aTime;
  });
};

const compareText = (a = "", b = "", direction = "asc") => {
  const left = String(a || "").trim();
  const right = String(b || "").trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const comparison = left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return direction === "desc" ? -comparison : comparison;
};

const parseScriptureSortKey = (scripture = "") => {
  const normalized = String(scripture).toLowerCase().replace(/\s+/g, " ").trim();
  const match = normalized.match(/^([1-3]?\s?[a-z]+(?:\s+[a-z]+)*?)\s+(\d+)(?::(\d+))?/);
  if (!match) return { book: Number.MAX_SAFE_INTEGER, chapter: Number.MAX_SAFE_INTEGER, verse: Number.MAX_SAFE_INTEGER, text: normalized };

  const bookIndex = BIBLE_BOOK_ORDER.indexOf(match[1].trim());
  return {
    book: bookIndex === -1 ? Number.MAX_SAFE_INTEGER : bookIndex,
    chapter: Number(match[2]) || Number.MAX_SAFE_INTEGER,
    verse: Number(match[3]) || 0,
    text: normalized,
  };
};

const compareScripture = (a = "", b = "", direction = "asc") => {
  const left = parseScriptureSortKey(a);
  const right = parseScriptureSortKey(b);
  const comparison = (left.book - right.book)
    || (left.chapter - right.chapter)
    || (left.verse - right.verse)
    || compareText(left.text, right.text, "asc");

  return direction === "desc" ? -comparison : comparison;
};

const sortSermons = (items, sortField = "date", direction = "desc") => {
  return [...items].sort((a, b) => {
    if (sortField === "date") {
      const aTime = getDateTime(a.date);
      const bTime = getDateTime(b.date);
      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return direction === "asc" ? aTime - bTime : bTime - aTime;
    }

    if (sortField === "scripture") {
      return compareScripture(a.scripture, b.scripture, direction);
    }

    return compareText(a[sortField] || "", b[sortField] || "", direction);
  });
};

const sortBulletins = (items, sortField = "date", direction = "desc") => {
  if (sortField === "date") {
    return sortByDate(items, direction === "asc" ? "oldest" : "newest");
  }

  return [...items].sort((a, b) => compareText(a[sortField] || "", b[sortField] || "", direction));
};

// Helper function to get next Sunday at 10:30 AM
const getNextSunday = (now = new Date()) => {
  const nextSunday = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7;
  
  if (daysUntilSunday === 0) {
    // It's Sunday - check if service time has passed
    const serviceTime = new Date(now);
    serviceTime.setHours(10, 30, 0, 0);
    
    if (now < serviceTime) {
      // Service hasn't started yet today
      return serviceTime;
    } else {
      // Service has passed, get next Sunday
      nextSunday.setDate(now.getDate() + 7);
    }
  } else {
    nextSunday.setDate(now.getDate() + daysUntilSunday);
  }
  
  nextSunday.setHours(10, 30, 0, 0);
  return nextSunday;
};

const getFollowingSunday = (now = new Date()) => {
  const nextSunday = new Date(now);
  const daysUntilSunday = ((7 - now.getDay()) % 7) || 7;
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(10, 30, 0, 0);
  return nextSunday;
};

const getNextServiceDetails = (now = new Date()) => {
  const specialServiceNotice = getActiveSpecialServiceNotice(now);

  if (specialServiceNotice) {
    if (specialServiceNotice.liveStreamAvailable === false) {
      return {
        date: getFollowingSunday(now),
        notice: null,
      };
    }

    return {
      date: getSpecialServiceDateTime(specialServiceNotice),
      notice: specialServiceNotice,
    };
  }

  return {
    date: getNextSunday(now),
    notice: null,
  };
};

export default function Resources() {
  const [sermons, setSermons] = useState([]); // This will now hold only the archived (Inactive/no status) sermons
  const [bulletins, setBulletins] = useState([]); // This will hold all bulletins, processed to put current first
  const [loading, setLoading] = useState(true);
  const [selectedSermon, setSelectedSermon] = useState(null); // This will be the "Active" sermon
  const [liveSermonUrl, setLiveSermonUrl] = useState("https://www.youtube.com/embed/bERzxb_Sbvo"); // Default or fallback live stream
  const [liveSermon, setLiveSermon] = useState(null); // State to hold the sermon marked as "Live"
  const [autoplaySermon, setAutoplaySermon] = useState(false);
  const [timeToService, setTimeToService] = useState(null); 
  const [countdownServiceNotice, setCountdownServiceNotice] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [playingSermonId, setPlayingSermonId] = useState(null);
  const [activeSection, setActiveSection] = useState("");
  const [enlargedBulletin, setEnlargedBulletin] = useState(null);
  const [hasLiveSermon, setHasLiveSermon] = useState(false);
  const [sermonsView, setSermonsView] = useState("grid"); // "grid" or "list"
  const [selectedSpeaker, setSelectedSpeaker] = useState("all");
  const [sermonsSortField, setSermonsSortField] = useState("date");
  const [sermonsSortDirection, setSermonsSortDirection] = useState("desc");
  const [sermonsDateDirection, setSermonsDateDirection] = useState("desc");
  const [sermonsAlphaDirection, setSermonsAlphaDirection] = useState("asc");
  const [sermonSearch, setSermonSearch] = useState("");
  const [bulletinsView, setBulletinsView] = useState("grid"); // "grid" or "list"
  const [bulletinSearch, setBulletinSearch] = useState("");
  const [bulletinsSortField, setBulletinsSortField] = useState("date");
  const [bulletinsSortDirection, setBulletinsSortDirection] = useState("desc");
  const [bulletinsDateDirection, setBulletinsDateDirection] = useState("desc");
  const [bulletinsAlphaDirection, setBulletinsAlphaDirection] = useState("asc");
  const [visibleSermonsCount, setVisibleSermonsCount] = useState(8);
  const [visibleBulletinsCount, setVisibleBulletinsCount] = useState(8); // New state to indicate if a sermon is marked "Live" in DB
  const location = useLocation();
  const activeSpecialServiceNotice = getActiveSpecialServiceNotice();
  const inPersonOnlyNotice = activeSpecialServiceNotice?.liveStreamAvailable === false ? activeSpecialServiceNotice : null;
  const displayServiceNotice = inPersonOnlyNotice || countdownServiceNotice || (isLive ? activeSpecialServiceNotice : null);
  const serviceTitle = inPersonOnlyNotice ? "No Live Stream Today" : (displayServiceNotice?.serviceTitle || "Sunday Worship");
  const serviceTimeLabel = displayServiceNotice?.serviceTimeLabel || "10:30 AM";
  const serviceLocationLabel = displayServiceNotice?.locationLabel || "295 N Brick Church Rd, Mayesville, SC";
  const serviceScheduleLabel = inPersonOnlyNotice ? `United service today | ${serviceTimeLabel}` : (displayServiceNotice ? `Today | ${serviceTimeLabel}` : `Every Sunday | ${serviceTimeLabel}`);
  const serviceNoticeMessage = inPersonOnlyNotice?.liveStreamMessage || displayServiceNotice?.message || "";
  const serviceDirectionsUrl = displayServiceNotice?.directionsUrl || "";

  // Refs to manage scroll behavior and avoid conflicts
  const clickNavigating = useRef(false);
  const scrollTimeout = useRef(null);

  const subNavLinks = useMemo(() => [
    { title: inPersonOnlyNotice ? "No Livestream Today" : "Live Stream", href: "#live-stream", icon: Radio },
    { title: "Latest Sermon", href: "#latest-sermon", icon: Youtube },
    { title: "More Sermons", href: "#more-sermons", icon: PlaySquare },
    { title: "Worship Bulletins", href: "#bulletins", icon: FileText },
  ], [inPersonOnlyNotice]);

  // Check if user came from LIVE button or if autoplay is requested
  const shouldAutoplayLiveStream = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    return hash === '#live-stream' || urlParams.get('autoplay') === 'true';
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sermonsData, bulletinsData] = await Promise.all([
          Sermons.list('-date', 200), // Fetch more to allow for filtering
          Bulletins.list('-date', 100) // Fetch more to allow for filtering
        ]);

        // Process sermons based on status
        const liveSermonCandidate = sermonsData.find(s => s.status === 'Live');
        const activeSermonCandidate = sermonsData.find(s => s.status === 'Active');
        // Treat sermons without a status or with 'Inactive' status as archived
        const inactiveSermonsFiltered = sermonsData.filter(s => s.status === 'Inactive' || !s.status); 

        // If there's a Live sermon, use its URL for the live stream
        if (liveSermonCandidate && liveSermonCandidate.youtube_url) {
          const videoId = getYoutubeVideoId(liveSermonCandidate.youtube_url);
          if (videoId) {
            setLiveSermonUrl(`https://www.youtube.com/embed/${videoId}`);
            setHasLiveSermon(true); // Set new state
            setLiveSermon(liveSermonCandidate); // Set the live sermon object
          } else {
            setHasLiveSermon(false); // If live sermon exists but URL is bad, treat as no live.
            setLiveSermon(null); // Clear if URL is bad
          }
        } else {
          setHasLiveSermon(false); // Set new state if no live sermon candidate
          setLiveSermon(null); // Clear if no live sermon
        }
        
        // If an active sermon is explicitly set, use it. Otherwise, use the latest inactive sermon as the 'latest' fallback.
        setSelectedSermon(activeSermonCandidate || inactiveSermonsFiltered[0] || null);
        // The 'sermons' state now holds only the archive (inactive/no status)
        setSermons(inactiveSermonsFiltered); 

        // Sort by bulletin date, not record creation date.
        const bulletinsNewestFirst = [...bulletinsData].sort((a, b) =>
          String(b.date || '').localeCompare(String(a.date || ''))
        );

        // Process bulletins based on status
        const currentBulletinCandidate = bulletinsNewestFirst.find(b => b.status === 'Current');
        // Filter out the current bulletin from the list for previous bulletins
        const pastBulletinsFiltered = bulletinsNewestFirst.filter(b => b.status === 'Past' || !b.status);

        // Set the main 'bulletins' state with the current bulletin first, then the rest, filtering out any nulls
        setBulletins([currentBulletinCandidate, ...pastBulletinsFiltered].filter(Boolean)); 

      } catch (error) {
        console.error("Error loading resources:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Live stream and countdown logic - UPDATED to always show countdown when no Live sermon
  useEffect(() => {
    const updateLiveStatus = () => {
      const currentSpecialNotice = getActiveSpecialServiceNotice(new Date());
      if (currentSpecialNotice?.liveStreamAvailable === false) {
        setIsLive(false);
        setCountdownServiceNotice(null);
        const nextService = getFollowingSunday();
        const now = new Date();
        const timeDiff = nextService.getTime() - now.getTime();

        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

          setTimeToService({ days, hours, minutes, seconds });
        } else {
          setTimeToService(null);
        }
        return;
      }

      // Only show live stream if there's a sermon marked as "Live" in the database
      if (hasLiveSermon) {
        setIsLive(true);
        setTimeToService(null);
        setCountdownServiceNotice(null);
        return;
      }
      
      // Otherwise, always show countdown (never show live stream without a "Live" sermon)
      setIsLive(false);
      
      const now = new Date();
      const nextServiceDetails = getNextServiceDetails(now);
      const nextService = nextServiceDetails.date;
      setCountdownServiceNotice(nextServiceDetails.notice);
      const timeDiff = nextService.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        setTimeToService({ days, hours, minutes, seconds });
      } else {
        setTimeToService(null);
      }
    };

    updateLiveStatus();
    const interval = setInterval(updateLiveStatus, 1000);
    
    return () => clearInterval(interval);
  }, [hasLiveSermon]); // Depend on hasLiveSermon

  // New useEffect to handle centering the live stream when it goes live
  useEffect(() => {
    if (isLive) {
      const liveStreamSection = document.getElementById('live-stream');
      if (liveStreamSection) {
        // Use a timeout to allow the component to render before scrolling
        setTimeout(() => {
          liveStreamSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [isLive]);

  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.substring(1);
        // Use a longer timeout to ensure page and data are fully loaded
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
          }
        }, 300); // Longer delay for data-dependent pages
      } else {
        setActiveSection(subNavLinks[0]?.href.substring(1) || "");
      }
    };

    // Only run hash navigation after loading is complete
    if (!loading) {
      handleHashNavigation();
    }

    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
  }, [location.pathname, loading, subNavLinks]);


  // Scroll spy to update active section based on scroll position
  useEffect(() => {
    if (loading) return; 

    const sectionIds = subNavLinks.map(link => link.href.substring(1));
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const handleScroll = () => {
      // If a click-to-scroll is in progress, do nothing.
      if (clickNavigating.current) return;
      
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      scrollTimeout.current = setTimeout(() => {
        const scrollPosition = window.scrollY;
        const offset = 150; // Adjusted offset for sticky headers

        // Special case for the bottom of the page
        if (window.innerHeight + scrollPosition >= document.body.offsetHeight - 2) {
          const lastSectionId = sections[sections.length - 1]?.id;
          if (lastSectionId) {
            setActiveSection(lastSectionId);
            return;
          }
        }

        let currentSectionId = "";
        for (const section of sections) {
          if (section.offsetTop <= scrollPosition + offset) {
            currentSectionId = section.id;
          } else {
              // Optimization: sections are ordered top to bottom, so if current one is below,
              // all subsequent ones will be too.
              break;
          }
        }

        // Only update if there's actually a change to avoid unnecessary updates
        setActiveSection(prev => prev !== currentSectionId ? (currentSectionId || (sectionIds[0] || "")) : prev);
      }, 150); // Increased debounce to prevent fighting
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if(scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [subNavLinks, loading]);
  
  // NEW: Direct click handler for sub-navigation
  const handleSubNavClick = (e, href) => {
    e.preventDefault();
    const id = href.substring(1);
    const element = document.getElementById(id);

    if (element) {
      // 1. Set flag to disable scroll listener
      clickNavigating.current = true;
      // 2. Update active state immediately for visual feedback
      setActiveSection(id);
      // 3. Update URL without triggering hashchange listener
      window.history.pushState(null, '', href);
      // 4. Perform smooth scroll
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // 5. After scroll animation, re-enable scroll listener
      setTimeout(() => {
        clickNavigating.current = false;
      }, 1000); // 1 second buffer for scroll to complete
    }
  };

  const handleSermonSelect = (sermon, shouldAutoplay = false) => {
    setSelectedSermon(sermon);
    setAutoplaySermon(shouldAutoplay);
    setPlayingSermonId(null); // Stop any inline video when main sermon starts
    const latestSermonSection = document.getElementById('latest-sermon');
    if (latestSermonSection) {
      // Use a timeout to ensure the state update has rendered before scrolling
      setTimeout(() => {
        latestSermonSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleInlineSermonPlay = (sermonId) => {
    setPlayingSermonId(sermonId);
    setAutoplaySermon(false); // Stop main sermon video when inline video starts
    
    // Center the playing video on screen after the animation completes
    setTimeout(() => {
      const playingCard = document.querySelector(`[data-sermon-id="${sermonId}"]`);
      if (playingCard) {
        playingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 350); // Wait for the 300ms transition to finish
  };

  const embedUrl = useMemo(() => {
    // Don't show main video if an inline video is playing
    if (playingSermonId || !selectedSermon?.youtube_url) return null;
    const videoId = getYoutubeVideoId(selectedSermon.youtube_url);
    if (!videoId) return null;

    const params = new URLSearchParams({ rel: 0 });
    if (selectedSermon.start_time) {
      params.set('start', selectedSermon.start_time);
    }
    if (autoplaySermon) {
      params.set('autoplay', 1);
    }
    
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [selectedSermon, autoplaySermon, playingSermonId]);

  // Derived state from the main 'sermons' and 'bulletins' states
  const latestSermon = useMemo(() => selectedSermon, [selectedSermon]);
  const sermonSpeakers = useMemo(() => {
    const speakersByKey = new Map();

    sermons.forEach((sermon) => {
      const speaker = sermon.speaker?.trim();
      if (!speaker) return;

      const key = speaker.toLowerCase();
      if (!speakersByKey.has(key)) {
        speakersByKey.set(key, speaker);
      }
    });

    return [...speakersByKey.values()]
      .sort((a, b) => compareText(a, b, "asc"));
  }, [sermons]);

  const moreSermons = useMemo(() => {
    const q = sermonSearch.trim().toLowerCase();
    const speakerFiltered = selectedSpeaker === "all"
      ? sermons
      : sermons.filter((sermon) => sermon.speaker?.trim().toLowerCase() === selectedSpeaker.toLowerCase());

    const filtered = q ? speakerFiltered.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.scripture?.toLowerCase().includes(q) ||
      s.speaker?.toLowerCase().includes(q) ||
      s.series?.toLowerCase().includes(q)
    ) : speakerFiltered;

    return sortSermons(filtered, sermonsSortField, sermonsSortDirection);
  }, [sermons, sermonSearch, selectedSpeaker, sermonsSortField, sermonsSortDirection]);
  const currentBulletin = useMemo(() => bulletins.find(b => b.status === 'Current'), [bulletins]);
  const currentBulletinFormat = useMemo(() => getBulletinFormat(currentBulletin), [currentBulletin]);
  const previousBulletins = useMemo(() => {
    const q = bulletinSearch.trim().toLowerCase();
    const pastBulletins = bulletins.filter(b => b.status === 'Past' || !b.status);
    const filtered = q ? pastBulletins.filter((bulletin) =>
      bulletin.title?.toLowerCase().includes(q) ||
      formatBulletinDate(bulletin.date).toLowerCase().includes(q)
    ) : pastBulletins;

    return sortBulletins(
      filtered,
      bulletinsSortField,
      bulletinsSortDirection
    );
  }, [bulletins, bulletinSearch, bulletinsSortField, bulletinsSortDirection]);

  if (loading) {
    return (
      <PageLoadingScreen backgroundClassName="bg-[#fdf8f0]" />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#fdf8f0' }}>
      {/* Header */}
      <section
        className="text-white relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/site/resources-header.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-20 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">Church Resources</h1>
            <p className="text-gray-300 text-sm mt-1">Live worship | Past messages | Bulletins | Faith growth</p>
          </div>
        </div>
      </section>

      {/* Sub Navigation */}
      <div className="fixed top-20 left-0 right-0 z-30 shadow-md" style={{ background: 'var(--header-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4 pt-3 pb-0">
                {subNavLinks.map(link => (
                    <Button 
                      key={link.title} 
                      variant="ghost" 
                      asChild 
                      className={`transition-all duration-200 px-3 py-1 h-auto shadow-sm ${
                        activeSection === link.href.substring(1)
                          ? 'bg-white text-black font-semibold scale-105 rounded-t-md rounded-b-none'
                          : 'bg-amber-400 text-black hover:bg-amber-300 rounded-t-md rounded-b-none'
                      }`}
                    >
                        <a href={link.href} onClick={(e) => handleSubNavClick(e, link.href)} className="flex items-center gap-2">
                            <link.icon className="w-4 h-4" />
                            {link.title}
                        </a>
                    </Button>
                ))}
            </div>
        </div>
      </div>

      {/* Content with proper padding to account for fixed sub-nav - extra space on mobile */}
      <div className="pt-0">
        {/* Live Stream Section */}
        <section id="live-stream" className="pb-0 scroll-mt-[160px] md:scroll-mt-[144px]" style={{ background: 'linear-gradient(135deg, #fdf5e4 0%, #fdf8f0 100%)' }}>
          <div className="w-full px-0">
            <div className="w-full">
              {isLive ? (
                <Card className="overflow-hidden shadow-xl">
                  <CardHeader className="bg-red-600 text-white py-2 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <CardTitle className="text-base font-bold">LIVE NOW - Worship Service</CardTitle>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-2 gap-0">
                      <div className="aspect-video bg-black lg:aspect-auto lg:h-full">
                        <div className="w-full bg-black h-full" style={{ paddingTop: '56.25%', position: 'relative' }}>
                          <iframe
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            src={`${liveSermonUrl}${shouldAutoplayLiveStream ? '?autoplay=1' : ''}`}
                            title="Live Worship Service"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                          ></iframe>
                        </div>
                      </div>
                      {liveSermon && (
                        <div className="p-4 lg:p-6 flex flex-col justify-center">
                          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{liveSermon.title}</h3>
                          <div className="text-gray-600 space-y-1.5 mb-4 text-sm">
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <p><span className="font-semibold">Speaker:</span> {liveSermon.speaker}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <p><span className="font-semibold">Date:</span> {format(parseISO(liveSermon.date), 'EEEE, MMMM d, yyyy')}</p>
                            </div>
                            {liveSermon.scripture && (
                              <div className="flex items-start gap-2">
                                <BookOpen className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <p><span className="font-semibold">Scripture(s):</span> {liveSermon.scripture}</p>
                              </div>
                            )}
                            {liveSermon.series && (
                              <div className="flex items-start gap-2">
                                <BookOpen className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <p><span className="font-semibold">Series:</span> {liveSermon.series}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <p><span className="font-semibold">Service Time:</span> {serviceTimeLabel}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <p><span className="font-semibold">Location:</span> {serviceLocationLabel}</p>
                            </div>
                          </div>
                          {liveSermon.notes && (
                            <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mb-3">
                              <p className="text-xs text-gray-700 italic">{liveSermon.notes}</p>
                            </div>
                          )}
                          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
                            <p className="text-xs text-red-800">
                              <strong>Streaming Live!</strong> Join us from wherever you are as we worship together.
                            </p>
                          </div>
                          {serviceNoticeMessage && (
                            <div className="mt-3 bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
                              <p className={`text-xs font-bold ${inPersonOnlyNotice ? "rounded-md bg-red-600 px-3 py-2 text-white" : "text-amber-900"}`}>
                                {serviceNoticeMessage}
                              </p>
                              {serviceDirectionsUrl && (
                                <Button asChild className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                                  <a href={serviceDirectionsUrl} target="_blank" rel="noopener noreferrer">
                                    <MapPin className="w-3.5 h-3.5 mr-1.5" />
                                    Get Directions
                                  </a>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="relative overflow-hidden text-white" style={{ background: 'var(--header-bg)' }}>
                  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      {/* Left: Label */}
                      <div className="flex-shrink-0 text-center md:text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                            {inPersonOnlyNotice ? "Live Stream Update" : "Next Live Service"}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold">{serviceTitle}</h2>
                        <p className="text-sm text-gray-300">{serviceScheduleLabel}</p>
                        <p className="text-sm font-semibold text-amber-200">{serviceLocationLabel}</p>
                        {serviceNoticeMessage && (
                          <p className={`mt-2 max-w-md text-xs font-bold leading-relaxed ${inPersonOnlyNotice ? "rounded-md border border-red-300 bg-red-600/95 px-3 py-2 text-white shadow-lg" : "text-amber-100"}`}>
                            {serviceNoticeMessage}
                          </p>
                        )}
                      </div>

                      {/* Center: Countdown */}
                      {timeToService && (
                        <div className="flex flex-col items-center gap-2">
                          {inPersonOnlyNotice && (
                            <span className="text-xs font-semibold uppercase tracking-widest text-amber-200">
                              Next live stream resumes in
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                          {[
                            { val: timeToService.days, label: 'Days' },
                            { val: timeToService.hours, label: 'Hrs' },
                            { val: timeToService.minutes, label: 'Min' },
                            { val: timeToService.seconds, label: 'Sec' },
                          ].map(({ val, label }, i) => (
                            <React.Fragment key={label}>
                              {i > 0 && <span className="text-amber-400 font-bold text-lg mb-3">:</span>}
                              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 min-w-[52px] text-center">
                                <div className="text-2xl font-bold tabular-nums text-amber-300 leading-none">{String(val).padStart(2, '0')}</div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-300 mt-0.5">{label}</div>
                              </div>
                            </React.Fragment>
                          ))}
                          </div>
                        </div>
                      )}

                      {/* Right: CTA */}
                      <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
                        {serviceDirectionsUrl && (
                          <Button asChild className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2 rounded-lg shadow-lg transition-all text-sm">
                            <a href={serviceDirectionsUrl} target="_blank" rel="noopener noreferrer">
                              <MapPin className="w-4 h-4 mr-1.5" />
                              Get Directions
                            </a>
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSermonSelect(latestSermon, true)}
                          className="bg-white/15 hover:bg-white/25 text-white border border-white/30 font-semibold px-5 py-2 rounded-lg shadow-lg transition-all text-sm"
                        >
                          <PlayCircle className="w-4 h-4 mr-1.5" />
                          Watch Latest Sermon
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Latest Sermon Section */}
        <section id="latest-sermon" className="relative isolate overflow-hidden py-4 scroll-mt-[160px] md:scroll-mt-[144px]">
          <video
            className="absolute inset-0 z-0 h-full w-full object-cover opacity-90"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src={SERMON_BACKGROUND_VIDEO_URL} type="video/mp4" />
          </video>
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#102821]/85 via-[#3f2a1f]/72 to-[#f1d58c]/42" aria-hidden="true"></div>
          <div className="absolute inset-0 z-0 bg-white/18 backdrop-blur-[1px]" aria-hidden="true"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-[0_3px_12px_rgba(0,0,0,0.75)]">Latest Sermon</h2>
            {latestSermon ? (
              <Card className="overflow-hidden shadow-xl max-w-5xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold text-gray-900">{latestSermon.title}</CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 pt-2">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          <span>{latestSermon.speaker}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {/* Use parseISO for sermon dates for consistent parsing */}
                          <span>{format(parseISO(latestSermon.date), "MMMM d, yyyy")}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {embedUrl ? (
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe
                          width="100%"
                          height="100%"
                          src={embedUrl}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                        ></iframe>
                      </div>
                    ) : playingSermonId ? (
                      <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <Youtube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Video playing in More Sermons section</p>
                          <Button 
                            onClick={() => setPlayingSermonId(null)}
                            variant="outline"
                            className="mt-4"
                          >
                            Stop Inline Video
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
                        <p className="text-gray-500">Video not available.</p>
                      </div>
                    )}
                    <div className="mt-6 space-y-4">
                      {latestSermon.series && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Series: {latestSermon.series}
                        </Badge>
                      )}
                      <div className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                        <span className="font-medium text-gray-700">{latestSermon.scripture}</span>
                      </div>
                    </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 max-w-5xl mx-auto">
                <Youtube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No sermon available</h3>
                <p className="text-gray-600">Please check back later for the latest message.</p>
              </div>
            )}
          </div>
        </section>

        {/* More Sermons Section */}
        <section id="more-sermons" className="py-4 scroll-mt-[160px] md:scroll-mt-[144px]" style={{ background: '#f7edcf' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-gray-900">More Sermons</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-200 p-1">
                  <span className="px-2 text-xs font-semibold text-gray-600">Speaker</span>
                  <Select
                    value={selectedSpeaker}
                    onValueChange={setSelectedSpeaker}
                  >
                    <SelectTrigger className="h-8 w-[180px] bg-white text-xs font-semibold text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Speakers</SelectItem>
                      {sermonSpeakers.map((speaker) => (
                        <SelectItem key={speaker} value={speaker}>{speaker}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-200 p-1">
                  <span className="px-2 text-xs font-semibold text-gray-600">Date</span>
                  <Select
                    value={sermonsDateDirection}
                    onValueChange={(value) => {
                      setSermonsDateDirection(value);
                      setSermonsSortField("date");
                      setSermonsSortDirection(value);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[128px] bg-white text-xs font-semibold text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">New to Old</SelectItem>
                      <SelectItem value="asc">Old to New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-200 p-1">
                  <span className="px-2 text-xs font-semibold text-gray-600">Alphabetical</span>
                  <Select
                    value={sermonsAlphaDirection}
                    onValueChange={(value) => {
                      setSermonsAlphaDirection(value);
                      setSermonsSortField("title");
                      setSermonsSortDirection(value);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[96px] bg-white text-xs font-semibold text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A-Z</SelectItem>
                      <SelectItem value="desc">Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
                  <button onClick={() => setSermonsView("grid")} className={`p-2 rounded-md transition-colors ${sermonsView === "grid" ? "bg-white shadow text-amber-600" : "text-gray-500 hover:text-gray-700"}`} aria-label="Grid view"><LayoutGrid className="w-4 h-4" /></button>
                  <button onClick={() => setSermonsView("list")} className={`p-2 rounded-md transition-colors ${sermonsView === "list" ? "bg-white shadow text-amber-600" : "text-gray-500 hover:text-gray-700"}`} aria-label="List view"><List className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, Scripture(s), speaker, or series..."
                value={sermonSearch}
                onChange={(e) => setSermonSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
              {sermonSearch && (
                <button onClick={() => setSermonSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {moreSermons.length === 0 ? (
              <div className="text-center py-12">
                <Youtube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {sermonSearch ? "No sermons match your search" : "No past sermons available"}
                </h3>
              </div>
            ) : sermonsView === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {moreSermons.slice(0, visibleSermonsCount).map((sermon) => {
                  const videoId = getYoutubeVideoId(sermon.youtube_url);
                  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "https://via.placeholder.com/480x360";
                  const isPlaying = playingSermonId === sermon.id;
                  return (
                    <Card key={sermon.id} data-sermon-id={sermon.id} className={`overflow-hidden transition-all duration-300 hover:shadow-xl ${isPlaying ? 'lg:col-span-2 lg:row-span-2' : 'hover:-translate-y-1'}`}>
                      <div className="relative">
                        {isPlaying && videoId ? (
                          <div className="aspect-video bg-black">
                            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${sermon.start_time ? `&start=${sermon.start_time}` : ''}${sermon.end_time ? `&end=${sermon.end_time}` : ''}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                          </div>
                        ) : (
                          <>
                            <img src={thumbnailUrl} alt={sermon.title} className="w-full h-auto aspect-video object-cover" />
                            <div className="absolute inset-0 bg-black/30 hover:bg-black/50 transition-all duration-300 flex items-center justify-center cursor-pointer" onClick={() => handleInlineSermonPlay(sermon.id)}>
                              <PlayCircle className="w-12 h-12 text-white/80 hover:text-white hover:scale-110 transition-transform duration-300" />
                            </div>
                          </>
                        )}
                        {selectedSermon?.id === sermon.id && <div className="absolute top-0 left-0 bg-amber-500 text-white px-2 py-1 text-xs font-bold">NOW PLAYING</div>}
                      </div>
                      <CardContent className="p-4">
                        <p className="font-semibold text-gray-800 leading-tight mb-2" title={sermon.title}>{sermon.title}</p>
                        {sermon.scripture && (
                          <p className="text-xs text-gray-600 mb-2">
                            <span className="font-semibold text-gray-700">Scripture(s):</span> {sermon.scripture}
                          </p>
                        )}
                        {sermon.speaker && (
                          <p className="text-xs text-amber-700 mb-1">
                            <span className="font-semibold">Speaker:</span> {sermon.speaker}
                          </p>
                        )}
                        {sermon.date && (
                          <p className="text-xs text-gray-500">
                            <span className="font-semibold">Date:</span> {format(parseISO(sermon.date), "MMMM d, yyyy")}
                          </p>
                        )}
                        {isPlaying && <div className="mt-3"><Button onClick={() => setPlayingSermonId(null)} variant="outline" size="sm" className="w-full text-xs">Close Video</Button></div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {moreSermons.slice(0, visibleSermonsCount).map((sermon) => {
                  const videoId = getYoutubeVideoId(sermon.youtube_url);
                  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "https://via.placeholder.com/480x360";
                  const isPlaying = playingSermonId === sermon.id;
                  return (
                    <Card key={sermon.id} data-sermon-id={sermon.id} className="overflow-hidden hover:shadow-md transition-all duration-300">
                      {isPlaying && videoId ? (
                        <div className="aspect-video bg-black">
                          <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${sermon.start_time ? `&start=${sermon.start_time}` : ''}${sermon.end_time ? `&end=${sermon.end_time}` : ''}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-3">
                          <div className="relative flex-shrink-0 w-28 h-16 rounded overflow-hidden cursor-pointer" onClick={() => handleInlineSermonPlay(sermon.id)}>
                            <img src={thumbnailUrl} alt={sermon.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
                              <PlayCircle className="w-8 h-8 text-white/80" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 leading-tight truncate">{sermon.title}</p>
                            {sermon.scripture && (
                              <p className="text-xs text-gray-500">
                                <span className="font-semibold">Scripture(s):</span> {sermon.scripture}
                              </p>
                            )}
                            <p className="text-xs text-amber-700 font-medium">
                              {sermon.speaker && <><span className="font-semibold">Speaker:</span> {sermon.speaker}</>}
                              {sermon.speaker && sermon.date && <span> | </span>}
                              {sermon.date && <><span className="font-semibold">Date:</span> {format(parseISO(sermon.date), "MMMM d, yyyy")}</>}
                            </p>
                          </div>
                          {selectedSermon?.id === sermon.id && <Badge className="bg-amber-500 text-white flex-shrink-0">Now Playing</Badge>}
                        </div>
                      )}
                      {isPlaying && <div className="p-3 pt-0"><Button onClick={() => setPlayingSermonId(null)} variant="outline" size="sm" className="w-full text-xs">Close Video</Button></div>}
                    </Card>
                  );
                })}
              </div>
            )}
            {moreSermons.length > visibleSermonsCount && (
              <div className="text-center mt-8">
                <Button variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-50 px-8" onClick={() => setVisibleSermonsCount(prev => prev + 8)}>
                  Load More Sermons
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Bulletins Section */}
        <section id="bulletins" className="py-2 scroll-mt-[160px] md:scroll-mt-[144px]" style={{ background: '#fdf8f0' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="border-t pt-5 text-center text-3xl font-bold text-gray-900 mb-3 md:pt-6 md:mb-4">Worship Bulletins</h2>
              <>
                {currentBulletin && (
                  <div className="mb-10 md:mb-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Current Bulletin</h3>
                    <Card className="grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl max-w-4xl mx-auto hover:shadow-amber-200 transition-shadow duration-300">
                      <div className="p-6 flex flex-col justify-center order-2 md:order-1">
                          <CardContent className="p-0">
                            <h4 className="text-2xl font-bold text-gray-800 mb-2">{currentBulletin.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                              <Calendar className="w-4 h-4" />
                              <span>{formatBulletinDate(currentBulletin.date)}</span>
                            </div>
                            <p className="text-gray-600 mb-6">
                              Catch up on this week's announcements, order of worship, prayer list, and more.
                            </p>
                            <Button asChild className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
                              <a href={currentBulletin.file_url} target="_blank" rel="noopener noreferrer" download={getFilename(currentBulletin)}>
                                <Download className="w-5 h-5 mr-2" />
                                Download {currentBulletinFormat.label}
                              </a>
                            </Button>
                          </CardContent>
                      </div>
                      <div className="p-4 bg-gray-100 flex items-center justify-center min-h-[300px] md:min-h-0 order-1 md:order-2">
                        <img
                            src={currentBulletin.thumbnail_url}
                            alt={currentBulletin.title}
                            className="max-w-full max-h-[400px] h-auto object-contain rounded-md shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setEnlargedBulletin(currentBulletin)}
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/400x600/f3f4f6/374151?text=Bulletin+Thumbnail";
                            }}
                          />
                      </div>
                    </Card>
                  </div>
                )}
                
                {previousBulletins.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-t pt-12 mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Previous Worship Bulletins</h3>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-200 p-1">
                          <span className="px-2 text-xs font-semibold text-gray-600">Date</span>
                          <Select
                            value={bulletinsDateDirection}
                            onValueChange={(value) => {
                              setBulletinsDateDirection(value);
                              setBulletinsSortField("date");
                              setBulletinsSortDirection(value);
                            }}
                          >
                            <SelectTrigger className="h-8 w-[128px] bg-white text-xs font-semibold text-gray-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desc">New to Old</SelectItem>
                              <SelectItem value="asc">Old to New</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-200 p-1">
                          <span className="px-2 text-xs font-semibold text-gray-600">Alphabetical</span>
                          <Select
                            value={bulletinsAlphaDirection}
                            onValueChange={(value) => {
                              setBulletinsAlphaDirection(value);
                              setBulletinsSortField("title");
                              setBulletinsSortDirection(value);
                            }}
                          >
                            <SelectTrigger className="h-8 w-[96px] bg-white text-xs font-semibold text-gray-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc">A-Z</SelectItem>
                              <SelectItem value="desc">Z-A</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
                          <button onClick={() => setBulletinsView("grid")} className={`p-2 rounded-md transition-colors ${bulletinsView === "grid" ? "bg-white shadow text-amber-600" : "text-gray-500 hover:text-gray-700"}`} aria-label="Grid view"><LayoutGrid className="w-4 h-4" /></button>
                          <button onClick={() => setBulletinsView("list")} className={`p-2 rounded-md transition-colors ${bulletinsView === "list" ? "bg-white shadow text-amber-600" : "text-gray-500 hover:text-gray-700"}`} aria-label="List view"><List className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by bulletin title or date..."
                        value={bulletinSearch}
                        onChange={(e) => setBulletinSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                      />
                      {bulletinSearch && (
                        <button onClick={() => setBulletinSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {bulletinsView === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {previousBulletins.slice(0, visibleBulletinsCount).map((bulletin) => (
                          <Card key={bulletin.id} className="group overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="p-4 pb-2">
                              <p className="font-semibold text-gray-800 text-lg leading-tight" title={bulletin.title}>{bulletin.title}</p>
                              <p className="text-sm text-amber-700">{formatBulletinDate(bulletin.date)}</p>
                            </div>
                            <div className="aspect-[3/4] bg-gray-100 p-2 overflow-hidden">
                              <img src={bulletin.thumbnail_url} alt={bulletin.title} className="w-full h-full object-contain rounded-md group-hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => setEnlargedBulletin(bulletin)} onError={(e) => { e.target.src = "https://via.placeholder.com/300x400/f3f4f6/374151?text=Bulletin"; }} />
                            </div>
                            <div className="p-4 mt-auto">
                              <Button asChild variant="outline" className="w-full text-amber-700 border-amber-600 hover:bg-amber-50">
                                <a href={bulletin.file_url} target="_blank" rel="noopener noreferrer" download={getFilename(bulletin)}><Download className="w-4 h-4 mr-2" />Download {getBulletinFormat(bulletin).label}</a>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {previousBulletins.slice(0, visibleBulletinsCount).map((bulletin) => (
                          <Card key={bulletin.id} className="overflow-hidden hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-4 p-3">
                              <div className="flex-shrink-0 w-12 h-16 bg-gray-100 rounded overflow-hidden cursor-pointer" onClick={() => setEnlargedBulletin(bulletin)}>
                                <img src={bulletin.thumbnail_url} alt={bulletin.title} className="w-full h-full object-cover hover:opacity-80 transition-opacity" onError={(e) => { e.target.src = "https://via.placeholder.com/100x130/f3f4f6/374151?text=Bulletin"; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{bulletin.title}</p>
                                <p className="text-sm text-amber-700">{formatBulletinDate(bulletin.date)}</p>
                              </div>
                              <Button asChild variant="outline" size="sm" className="flex-shrink-0 text-amber-700 border-amber-600 hover:bg-amber-50">
                                <a href={bulletin.file_url} target="_blank" rel="noopener noreferrer" download={getFilename(bulletin)}><Download className="w-4 h-4 mr-1" />Download {getBulletinFormat(bulletin).label}</a>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                    {previousBulletins.length > visibleBulletinsCount && (
                      <div className="text-center mt-8">
                        <Button variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-50 px-8" onClick={() => setVisibleBulletinsCount(prev => prev + 8)}>
                          Load More Bulletins
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {!currentBulletin && previousBulletins.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {bulletinSearch ? "No bulletins match your search" : "No bulletins found"}
                    </h3>
                  </div>
                )}
              </>
          </div>
        </section>
      </div>

      {/* Enlarged Bulletin Modal */}
      <AnimatePresence>
        {enlargedBulletin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEnlargedBulletin(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-auto h-auto max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={enlargedBulletin.thumbnail_url}
                alt={`Enlarged view of ${enlargedBulletin.title}`}
                className="block max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 bg-white/70 hover:bg-white rounded-full shadow-lg"
                onClick={() => setEnlargedBulletin(null)}
              >
                <X className="w-6 h-6 text-black" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
