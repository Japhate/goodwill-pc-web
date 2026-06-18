import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AnnouncementsEvents } from "@/entities/AnnouncementsEvents";
import { HeroSlide } from "@/entities/HeroSlide";
import { WorshipEvent } from "@/entities/WorshipEvent";
import { Calendar, Check, Clock, Copy, Mail, MapPin, Image, CheckCircle, ExternalLink, FileText, Phone } from "lucide-react";
import { format, isBefore, startOfDay, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { groupBy } from 'lodash';
import { Badge } from "@/components/ui/badge";
import { getActiveSpecialServiceNotice } from "@/lib/specialServiceNotice";
import PageLoadingScreen from "@/components/PageLoadingScreen";

// Helper to parse date string as local time to avoid timezone shifts
// and handle potential invalid date values gracefully.
const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  const date = parseISO(dateString);
  // parseISO will handle YYYY-MM-DD and return a Date object.
  // We check if it's a valid date to prevent errors.
  return isValid(date) ? date : null;
};

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return "";
  if (startDate && !endDate) return format(startDate, "MMMM d, yyyy");
  if (!startDate && endDate) return `Through ${format(endDate, "MMMM d, yyyy")}`;
  if (startDate.getTime() === endDate.getTime()) return format(startDate, "MMMM d, yyyy");
  if (startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()) {
    return `${format(startDate, "MMMM d")} - ${format(endDate, "d, yyyy")}`;
  }
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, "MMMM d")} - ${format(endDate, "MMMM d, yyyy")}`;
  }
  return `${format(startDate, "MMMM d, yyyy")} - ${format(endDate, "MMMM d, yyyy")}`;
};

const formatTimeRange = (startTime, endTime) => {
  const formatDisplayTime = (timeString) => {
    if (!timeString) return "";
    const [hourValue, minuteValue = "0"] = String(timeString).split(":");
    const hour = Number(hourValue);
    const minute = Number(minuteValue);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return timeString;
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const startLabel = formatDisplayTime(startTime);
  const endLabel = formatDisplayTime(endTime);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel || endLabel || "";
};

const getLocationType = (item) => {
  if (item.location_type) return item.location_type;
  const hasVirtualDetails = item.virtual_platform || item.zoom_link || item.meeting_id || item.meeting_passcode;
  if ((item.location || item.directions_url) && hasVirtualDetails) return "both";
  return hasVirtualDetails ? "virtual" : "physical";
};

const hasPhysicalLocation = (item) => ["physical", "both"].includes(getLocationType(item));
const hasVirtualLocation = (item) => ["virtual", "both"].includes(getLocationType(item));

const isHiddenStatus = (status) => String(status || "").trim().toLowerCase() === "hidden";

const normalizeMatchText = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const getVirtualActionLabel = (platform, url = "") => {
  const cleanPlatform = String(platform || "").trim();
  const platformSource = cleanPlatform || String(url || "");
  if (!platformSource) return "Join Online";

  const normalizedPlatform = platformSource.toLowerCase();
  if (normalizedPlatform.includes("zoom")) return "Join Zoom";
  if (normalizedPlatform.includes("google") || normalizedPlatform.includes("meet")) return "Join Google Meet";
  if (normalizedPlatform.includes("teams")) return "Join Microsoft Teams";
  if (normalizedPlatform.includes("youtube")) return "Watch on YouTube";
  if (normalizedPlatform.includes("facebook")) return "Watch on Facebook";

  if (!cleanPlatform) return "Join Online";
  return `Join ${cleanPlatform}`;
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const createDateWithTime = (dateString, timeString) => {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  if (!year || !month || !day) return null;

  const [hour = 9, minute = 0] = String(timeString || "09:00").split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0);
};

const stripMarkdown = (value = "") => String(value)
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/[*_`>#-]/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const getGoogleCalendarUrl = (item) => {
  if (!item?.date) return "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title || "Goodwill Presbyterian Church Event",
  });

  if (item.time || item.end_time) {
    const startDate = createDateWithTime(item.date, item.time || "09:00");
    if (!startDate) return "";
    let endDate = createDateWithTime(item.end_date || item.date, item.end_time || "");
    if (!endDate || endDate <= startDate) {
      endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
    }
    params.set("dates", `${format(startDate, "yyyyMMdd'T'HHmmss")}/${format(endDate, "yyyyMMdd'T'HHmmss")}`);
  } else {
    const startDate = parseDateAsLocal(item.date);
    const endDate = parseDateAsLocal(item.end_date || item.date);
    if (!startDate || !endDate) return "";
    params.set("dates", `${format(startDate, "yyyyMMdd")}/${format(addDays(endDate, 1), "yyyyMMdd")}`);
  }

  const locationType = getLocationType(item);
  const calendarLocation = locationType === "both"
    ? [item.location, item.virtual_platform, item.zoom_link, item.meeting_id ? `Meeting ID: ${item.meeting_id}` : ""].filter(Boolean).join(" | ")
    : locationType === "virtual"
      ? [item.virtual_platform, item.zoom_link, item.meeting_id ? `Meeting ID: ${item.meeting_id}` : ""].filter(Boolean).join(" - ")
      : item.location || "";
  if (calendarLocation) params.set("location", calendarLocation);

  const details = [
    stripMarkdown(item.content),
    item.frequency ? `Frequency: ${item.frequency}` : "",
    item.zoom_link ? `Link: ${item.zoom_link}` : "",
    item.meeting_id ? `Meeting ID: ${item.meeting_id}` : "",
    item.meeting_passcode ? `Passcode: ${item.meeting_passcode}` : "",
    item.contact_email ? `Contact email: ${item.contact_email}` : "",
    item.contact_phone ? `Contact phone: ${item.contact_phone}` : "",
    item.directions_url ? `Directions: ${item.directions_url}` : "",
    item.file_upload ? `Attachment: ${item.file_upload}` : "",
  ].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const SHOW_PAST_EVENTS_GALLERY = false;

export default function Updates() {
  const [feedItems, setFeedItems] = useState([]);
  const [worshipEvents, setWorshipEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSection, setActiveSection] = useState("");
  const [now, setNow] = useState(new Date());
  const [copiedContactId, setCopiedContactId] = useState("");
  const [announcementOrderRanks, setAnnouncementOrderRanks] = useState({});
  const location = useLocation();
  const activeSpecialServiceNotice = getActiveSpecialServiceNotice(now);
  const inPersonOnlyNotice = activeSpecialServiceNotice?.liveStreamAvailable === false ? activeSpecialServiceNotice : null;
  const selectedAnnouncementId = location.hash.startsWith("#announcement-")
    ? location.hash.replace("#announcement-", "")
    : "";

  const clickNavigating = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const subNavLinks = useMemo(() => [
    { title: "Announcements & Events", href: "#announcements-events" },
    { title: "Calendar of Worship", href: "#calendar" },
    ...(SHOW_PAST_EVENTS_GALLERY ? [{ title: "Past Events Gallery", href: "#past-events" }] : []),
  ], []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const copyContactValue = async (copyId, value) => {
    const text = String(value || "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedContactId(copyId);
      window.setTimeout(() => setCopiedContactId((currentId) => (currentId === copyId ? "" : currentId)), 1800);
    } catch (error) {
      console.error("Unable to copy contact value:", error);
      window.alert("Unable to copy this contact information. Please select and copy it manually.");
    }
  };

  const renderCopyButton = (copyId, value, label) => {
    const copied = copiedContactId === copyId;
    return (
      <button
        type="button"
        onClick={() => copyContactValue(copyId, value)}
        className="ml-2 inline-flex items-center gap-1 rounded border border-amber-200 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50"
        aria-label={`Copy ${label}`}
        title={copied ? "Copied" : `Copy ${label}`}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [announcementRes, worshipEventsRes, heroSlideRes] = await Promise.all([
        AnnouncementsEvents.list('-created_date', 200),
        WorshipEvent.list('event_date', 100),
        HeroSlide.list('order', 200).catch(() => [])
      ]);
      const activeLinkedAnnouncementIds = new Set(
        heroSlideRes
          .filter((slide) => slide.is_active !== false && slide.announcement_id)
          .map((slide) => String(slide.announcement_id))
      );
      const hiddenLinkedAnnouncementIds = new Set(
        heroSlideRes
          .filter((slide) => slide.is_active === false && slide.announcement_id)
          .map((slide) => String(slide.announcement_id))
      );
      const activeSlideTitles = new Set(
        heroSlideRes
          .filter((slide) => slide.is_active !== false && !slide.announcement_id)
          .map((slide) => normalizeMatchText(slide.alt_text))
          .filter(Boolean)
      );
      const hiddenSlideTitles = new Set(
        heroSlideRes
          .filter((slide) => slide.is_active === false && !slide.announcement_id)
          .map((slide) => normalizeMatchText(slide.alt_text))
          .filter(Boolean)
      );
      const visibleAnnouncements = announcementRes.filter((announcement) => {
        if (isHiddenStatus(announcement.status)) return false;

        const announcementId = String(announcement.id || "");
        if (hiddenLinkedAnnouncementIds.has(announcementId) && !activeLinkedAnnouncementIds.has(announcementId)) {
          return false;
        }

        const announcementTitle = normalizeMatchText(announcement.title);
        if (announcementTitle && hiddenSlideTitles.has(announcementTitle) && !activeSlideTitles.has(announcementTitle)) {
          return false;
        }

        return true;
      });
      const activeHeroSlideOrderEntries = heroSlideRes
        .filter((slide) => slide.is_active !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .flatMap((slide, index) => {
          const rank = index + 1;
          const linkedId = slide.announcement_id ? `id:${String(slide.announcement_id)}` : "";
          const titleKey = normalizeMatchText(slide.alt_text);
          return [
            linkedId && [linkedId, rank],
            titleKey && [`title:${titleKey}`, rank],
          ].filter(Boolean);
        });
      setAnnouncementOrderRanks(Object.fromEntries(activeHeroSlideOrderEntries));
      setFeedItems(visibleAnnouncements);
      setWorshipEvents(worshipEventsRes);
    } catch (error) {
      console.error("Error loading page data:", error);
      setFeedItems([]);
      setWorshipEvents([]);
      setAnnouncementOrderRanks({});
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => startOfDay(new Date()), []);

  const upcomingAndUndatedEvents = useMemo(() => {
    // Filter for Active and Timeless status only
    const currentEvents = feedItems.filter((item) => {
      const status = String(item.status || "").trim().toLowerCase();
      return status === "active" || status === "timeless" || !status;
    });
    
    const getAnnouncementAdminRank = (item) => {
      const idRank = announcementOrderRanks[`id:${String(item.id || "")}`];
      if (idRank) return idRank;
      return announcementOrderRanks[`title:${normalizeMatchText(item.title)}`] || Number.MAX_SAFE_INTEGER;
    };

    return currentEvents.filter(item => {
      // Timeless items always show regardless of date
      if (String(item.status || "").trim().toLowerCase() === 'timeless') return true;
      const itemStartDate = parseDateAsLocal(item.date);
      const itemEndDate = parseDateAsLocal(item.end_date);
      const relevantDate = itemEndDate || itemStartDate;
      if (!relevantDate) return true; // Keep items without a valid date
      return !isBefore(relevantDate, today);
    }).sort((a, b) => {
      const aDate = parseDateAsLocal(a.date);
      const bDate = parseDateAsLocal(b.date);
      const aAdminRank = getAnnouncementAdminRank(a);
      const bAdminRank = getAnnouncementAdminRank(b);
      const aHasAdminRank = aAdminRank !== Number.MAX_SAFE_INTEGER;
      const bHasAdminRank = bAdminRank !== Number.MAX_SAFE_INTEGER;
      const aHasDate = !!aDate;
      const bHasDate = !!bDate;

      if (aHasAdminRank && bHasAdminRank) return aAdminRank - bAdminRank;
      if (aHasAdminRank && !bHasAdminRank) return -1;
      if (!aHasAdminRank && bHasAdminRank) return 1;
      if (!aHasDate && bHasDate) return -1;
      if (aHasDate && !bHasDate) return 1;
      if (!aHasDate && !bHasDate) return 0;
      return bDate.getTime() - aDate.getTime();
    });
  }, [announcementOrderRanks, feedItems, today]);

  const sortedPastEvents = useMemo(() => {
    // Only show Inactive status in past events
    return feedItems.filter(item => item.status === 'Inactive').sort((a, b) => {
      const aDate = parseDateAsLocal(a.date);
      const bDate = parseDateAsLocal(b.date);
      // Should always have dates here, but check just in case.
      if (!aDate || !bDate) return 0;
      return bDate.getTime() - aDate.getTime();
    });
  }, [feedItems, today]);

  const filteredFeed = useMemo(() => {
    return activeCategory === 'all'
      ? upcomingAndUndatedEvents
      : upcomingAndUndatedEvents.filter(item => (item.category || 'church_wide') === activeCategory);
  }, [upcomingAndUndatedEvents, activeCategory]);

  const categories = {
    church_wide: "Church-Wide",
    mens_ministry: "Men's Ministry",
    womens_ministry: "Women's Ministry",
    youth_ministry: "Youth Ministry",
    session_leadership: "Session & Leadership",
  };

  const calendarEvents = useMemo(() => {
    const worshipCalendarItems = worshipEvents.map((event) => ({
      id: `worship-${event.id}`,
      source: "worship",
      title: event.title,
      date: event.event_date,
      endDate: "",
      time: event.event_time,
      endTime: event.end_time,
      monthGroup: event.month_group,
      description: event.description || "",
      location: "",
      categoryLabel: "Worship",
      isCompleted: event.is_completed || false,
      announcementUrl: "",
      calendarUrl: "",
    }));

    const announcementCalendarItems = upcomingAndUndatedEvents
      .filter((item) => parseDateAsLocal(item.date))
      .map((item) => ({
        id: `announcement-${item.id}`,
        source: "announcement",
        title: item.title,
        date: item.date,
        endDate: item.end_date,
        time: item.time,
        endTime: item.end_time,
        monthGroup: "",
        description: stripMarkdown(item.content || "").replace(/\s+/g, " ").slice(0, 190),
        location: hasPhysicalLocation(item) ? item.location || "" : "",
        platform: hasVirtualLocation(item) ? item.virtual_platform || "Online" : "",
        categoryLabel: categories[item.category] || "Church-Wide",
        isCompleted: false,
        announcementUrl: `#announcement-${item.id}`,
        calendarUrl: getGoogleCalendarUrl(item),
      }));

    return [...worshipCalendarItems, ...announcementCalendarItems].sort((a, b) => {
      const aDate = parseDateAsLocal(a.date);
      const bDate = parseDateAsLocal(b.date);
      if (aDate && bDate) return aDate.getTime() - bDate.getTime();
      if (aDate) return -1;
      if (bDate) return 1;
      return String(a.monthGroup || "").localeCompare(String(b.monthGroup || ""));
    });
  }, [upcomingAndUndatedEvents, worshipEvents]);

  const groupedEvents = React.useMemo(() => {
    const getMonthSortValue = (monthGroup = "") => {
      if (monthGroup === "Ongoing Events") return -1;
      const parsedMonth = new Date(`${monthGroup} 1`);
      return Number.isNaN(parsedMonth.getTime()) ? Number.MAX_SAFE_INTEGER : parsedMonth.getTime();
    };

    const sortedEvents = [...calendarEvents].sort((a, b) => {
      const aMonthGroup = a.monthGroup || (parseDateAsLocal(a.date) ? format(parseDateAsLocal(a.date), "MMMM yyyy") : "Ongoing Events");
      const bMonthGroup = b.monthGroup || (parseDateAsLocal(b.date) ? format(parseDateAsLocal(b.date), "MMMM yyyy") : "Ongoing Events");
      const monthSort = getMonthSortValue(aMonthGroup) - getMonthSortValue(bMonthGroup);
      if (monthSort !== 0) return monthSort;
      const dateA = parseDateAsLocal(a.date);
      const dateB = parseDateAsLocal(b.date);
      if (dateA && dateB) return dateA.getTime() - dateB.getTime();
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });

    return groupBy(sortedEvents, (event) => (
      event.monthGroup || (parseDateAsLocal(event.date) ? format(parseDateAsLocal(event.date), "MMMM yyyy") : "Ongoing Events")
    ));
  }, [calendarEvents]);

  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.substring(1);
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });

            let activeIdToSet = id;
            if (id.startsWith('announcement-')) {
              if (upcomingAndUndatedEvents.some(item => `announcement-${item.id}` === id)) {
                activeIdToSet = 'announcements-events';
              }
            }
            setActiveSection(activeIdToSet);
          }
        }, 300);
      } else {
        setActiveSection(subNavLinks[0]?.href.substring(1) || "");
      }
    };

    if (!loading) {
      handleHashNavigation();
    }

    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
  }, [location.pathname, loading, subNavLinks, upcomingAndUndatedEvents]);

  useEffect(() => {
    if (loading) return;

    const sectionIds = subNavLinks.map(link => link.href.substring(1));
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const handleScroll = () => {
      if (clickNavigating.current) return;

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        const scrollPosition = window.scrollY;
        const offset = 150;

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
            break;
          }
        }

        setActiveSection(currentSectionId || (sectionIds[0] || ""));
      }, 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [subNavLinks, loading]);

  const handleSubNavClick = (e, href) => {
    e.preventDefault();
    const id = href.substring(1);
    const element = document.getElementById(id);

    if (element) {
      clickNavigating.current = true;
      setActiveSection(id);
      window.history.pushState(null, '', href);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        clickNavigating.current = false;
      }, 1000);
    }
  };


  const handleCategoryChange = (category) => {
    setActiveCategory(category);
  };

  if (loading) {
    return (
      <PageLoadingScreen backgroundClassName="bg-[#fdf8f0]" />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#fdf8f0' }}>
      <section
        className="text-white relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/site/updates-header.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-20 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">Updates</h1>
            <p className="text-gray-300 text-sm mt-1">Announcements · Events · Church calendar</p>
          </div>
        </div>
      </section>
      <div className="fixed top-20 left-0 right-0 z-30 shadow-md" style={{ background: 'var(--header-bg)' }}>
        <div className="mx-auto max-w-[1800px] px-2 sm:px-4 lg:px-5 2xl:px-6">
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
                        <a href={link.href} onClick={(e) => handleSubNavClick(e, link.href)}>
                           {link.title}
                        </a>
                    </Button>
                ))}
            </div>
        </div>
      </div>


      {/* Content with proper padding */}
      <div className="pt-1 md:pt-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <section id="announcements-events" className="pt-0 pb-2 scroll-mt-[140px] md:scroll-mt-[124px]">
            <h2 className="mb-1 text-center text-2xl font-bold text-gray-900 md:text-3xl">Announcements & Events</h2>
            <p className="mx-auto mb-3 max-w-2xl text-center text-sm text-gray-600">
              What's happening at Goodwill? Here are the latest updates for our church family and community.
            </p>

            {inPersonOnlyNotice && (
              <div className="mx-auto mb-8 max-w-4xl rounded-lg border border-red-200 bg-white p-5 shadow-md">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Badge className="mb-3 bg-red-600 text-white">Important Worship Update</Badge>
                    <h3 className="text-2xl font-bold text-gray-900">United Service Today at {inPersonOnlyNotice.serviceTimeLabel}</h3>
                    <p className="mt-2 rounded-md bg-red-600 px-4 py-3 text-sm font-bold leading-relaxed text-white">
                      Today's service is at Second Presbyterian Church in Sumter. No service at Goodwill's main sanctuary. No livestream today.
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <MapPin className="h-4 w-4 text-amber-600" />
                      {inPersonOnlyNotice.locationLabel}
                    </p>
                  </div>
                  <Button asChild className="bg-amber-600 text-white hover:bg-amber-700">
                    <a href={inPersonOnlyNotice.directionsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="mr-2 h-4 w-4" />
                      Get Directions
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-5 flex justify-center">
              <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg bg-gray-200 p-1">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-white text-amber-700 shadow'
                      : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'
                  }`}
                >
                  All
                </button>
                {Object.entries(categories).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                    activeCategory === key
                      ? 'bg-white text-amber-700 shadow'
                      : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'
                  }`}
                >
                  {value}
                </button>
              ))}
              </div>
            </div>


            <div className="relative left-1/2 grid w-[calc(100vw-1rem)] -translate-x-1/2 grid-cols-1 gap-6 sm:w-[calc(100vw-1.5rem)] lg:w-[calc(100vw-2rem)]">
              {filteredFeed.length > 0 ? (
                filteredFeed.map((item) => {
                  const itemDate = parseDateAsLocal(item.date);
                  const itemEndDate = parseDateAsLocal(item.end_date);
                  const isFarFuture = itemDate && itemDate.getFullYear() > 2090;
                  const dateLabel = !isFarFuture ? formatDateRange(itemDate, itemEndDate) : "";
                  const timeLabel = formatTimeRange(item.time, item.end_time);
                  const locationType = getLocationType(item);
                  const calendarUrl = getGoogleCalendarUrl(item);
                  return (
                  <div
                    id={`announcement-${item.id}`}
                    key={item.id}
                    className={`flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-300 hover:shadow-xl scroll-mt-[160px] md:flex-row md:scroll-mt-[140px] ${
                      selectedAnnouncementId === String(item.id) ? "ring-4 ring-amber-400 ring-offset-4" : ""
                    }`}
                  >
                    {item.image_upload ? (
                      <div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden bg-white p-2 md:w-[32%] md:self-start xl:w-[30%]">
                        <img src={item.image_upload} alt={item.title} className="h-full w-full object-contain object-left" />
                      </div>
                    ) : null}
                    <div className="flex min-h-0 flex-grow flex-col p-4 md:max-h-[calc((100vw-1.5rem)*0.32*9/16)] md:overflow-hidden md:py-2 md:pl-2 md:pr-4 lg:max-h-[calc((100vw-2rem)*0.32*9/16)] xl:max-h-[calc((100vw-2rem)*0.30*9/16)] xl:py-2 xl:pl-2 xl:pr-5">
                      <div className="min-h-0 md:h-full md:overflow-y-auto md:pr-2">
                      <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
                          <Badge variant="outline" className="shrink-0 border-amber-500 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber-600">
                            {categories[item.category] || 'Church-Wide'}
                          </Badge>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-600 lg:prose-p:my-1.5 lg:text-[13px] lg:leading-relaxed xl:text-sm">
                        <ReactMarkdown
                          components={{
                              a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline"/>
                          }}
                        >
                            {item.content}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-2 grid content-start gap-x-5 gap-y-1.5 border-t pt-2 text-sm text-gray-500 sm:grid-cols-2 xl:gap-x-7">
                        {dateLabel && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span><strong className="font-semibold">Date:</strong> {dateLabel}</span>
                            {calendarUrl && (
                              <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded text-xs font-semibold text-amber-700 underline-offset-2 hover:underline">
                                <Calendar className="h-3 w-3" />
                                Add to calendar
                              </a>
                            )}
                          </div>
                        )}
                        {timeLabel && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Time:</strong> {timeLabel}</span></div>}
                        {item.frequency && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Frequency:</strong> {item.frequency}</span></div>}
                        {hasPhysicalLocation(item) && item.location && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Location:</strong> {item.location}</span></div>}
                        {hasVirtualLocation(item) && item.virtual_platform && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Platform:</strong> {item.virtual_platform}</span></div>}
                        {hasVirtualLocation(item) && item.meeting_id && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Meeting ID:</strong> {item.meeting_id}</span></div>}
                        {hasVirtualLocation(item) && item.meeting_passcode && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Passcode:</strong> {item.meeting_passcode}</span></div>}
                        {item.contact_email && (
                          <div className="flex items-start gap-2">
                            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>
                              <strong className="font-semibold">Email:</strong> {item.contact_email}
                              {renderCopyButton(`${item.id || item.title}-email`, item.contact_email, "email")}
                            </span>
                          </div>
                        )}
                        {item.contact_phone && (
                          <div className="flex items-start gap-2">
                            <Phone className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>
                              <strong className="font-semibold">Phone:</strong> {item.contact_phone}
                              {renderCopyButton(`${item.id || item.title}-phone`, item.contact_phone, "phone number")}
                            </span>
                          </div>
                        )}
                        {(item.zoom_link || item.directions_url || item.file_upload) && (
                          <div className="flex flex-wrap gap-2 pt-2 sm:col-span-2">
                            {hasVirtualLocation(item) && item.zoom_link && (
                              <a href={item.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
                                <ExternalLink className="h-3.5 w-3.5" />
                                {getVirtualActionLabel(item.virtual_platform, item.zoom_link)}
                              </a>
                            )}
                            {hasPhysicalLocation(item) && item.directions_url && (
                              <a href={item.directions_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                                <MapPin className="h-3.5 w-3.5" />
                                Get Directions
                              </a>
                            )}
                            {item.file_upload && (
                              <a href={item.file_upload} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800">
                                <FileText className="h-3.5 w-3.5" />
                                {item.file_label || "Open Form"}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                )})
              ) : (
                <div className="col-span-full text-center py-12">
                  <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No announcements or events found</h3>
                  <p className="text-gray-600">
                    {activeCategory === 'all'
                      ? "There are currently no active announcements or events. Check back soon!"
                      : `No items found for the "${categories[activeCategory]}" category.`
                    }
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Calendar of Worship */}
          <section id="calendar" className="py-6 scroll-mt-[140px] md:scroll-mt-[124px] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8" style={{ background: '#f7edcf' }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Calendar of Worship</h2>
                <p className="text-lg text-gray-600">Spiritual Growth and Celebratory Events and Services</p>
              </div>

              <div className="mx-auto max-w-5xl space-y-8">
                {Object.entries(groupedEvents).length > 0 ? (
                  Object.entries(groupedEvents).map(([month, events]) => (
                    <div key={month} className="rounded-xl border border-amber-200 bg-white/75 p-4 shadow-sm md:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3 border-b border-amber-200 pb-3">
                        <h3 className="text-2xl font-semibold text-amber-800">{month}</h3>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          {events.length} {events.length === 1 ? "event" : "events"}
                        </Badge>
                      </div>
                      <ul className="space-y-3">
                        {events.map(event => {
                          const eventDate = parseDateAsLocal(event.date);
                          const eventEndDate = parseDateAsLocal(event.endDate);
                          const isCompleted = event.isCompleted || false;
                          const eventTimeLabel = formatTimeRange(event.time, event.endTime);
                          const eventDateLabel = formatDateRange(eventDate, eventEndDate);
                          return (
                          <li key={event.id} className={`rounded-lg border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                            isCompleted
                              ? 'border-green-200'
                              : 'border-amber-200'
                          }`}>
                            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                              <div className="flex w-full shrink-0 items-center gap-3 md:w-28 md:flex-col md:gap-1 md:border-r md:border-amber-100 md:pr-4 md:text-center">
                                {eventDate ? (
                                  <>
                                    <div className="rounded-md bg-amber-700 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white md:w-full">
                                      {format(eventDate, 'MMM')}
                                    </div>
                                    <div className="font-serif text-3xl font-bold leading-none text-gray-900 md:text-4xl">{format(eventDate, 'dd')}</div>
                                    <div className="text-xs font-semibold text-gray-500">{format(eventDate, 'EEE')}</div>
                                  </>
                                ) : (
                                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 md:h-20 md:w-20">
                                    <Clock className="h-7 w-7 text-amber-700" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                                        {event.categoryLabel}
                                      </Badge>
                                      {isCompleted ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                          <CheckCircle className="h-3.5 w-3.5" />
                                          Completed
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                          <Clock className="h-3.5 w-3.5" />
                                          Upcoming
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-lg font-bold leading-snug text-gray-950">{event.title}</p>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    {event.calendarUrl && (
                                      <a href={event.calendarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-50">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Add
                                      </a>
                                    )}
                                    {event.announcementUrl && (
                                      <a href={event.announcementUrl} className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-800">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Details
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                                  {eventDateLabel && (
                                    <p className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 shrink-0 text-amber-700" />
                                      <span>{eventDateLabel}</span>
                                    </p>
                                  )}
                                  {eventTimeLabel && (
                                    <p className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 shrink-0 text-amber-700" />
                                      <span>{eventTimeLabel}</span>
                                    </p>
                                  )}
                                  {event.location && (
                                    <p className="flex items-start gap-2">
                                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                                      <span>{event.location}</span>
                                    </p>
                                  )}
                                  {event.platform && (
                                    <p className="flex items-start gap-2">
                                      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                                      <span>{event.platform}</span>
                                    </p>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{event.description}{event.description.length >= 190 ? "..." : ""}</p>
                                )}
                              </div>
                            </div>
                          </li>
                        )})}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                    <Calendar className="mx-auto mb-3 h-12 w-12 text-amber-600" />
                    <h3 className="text-xl font-semibold text-gray-900">No worship calendar events yet</h3>
                    <p className="mt-2 text-gray-600">Dated announcements will appear here automatically.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Past Events Gallery */}
          {SHOW_PAST_EVENTS_GALLERY && (
          <section id="past-events" className="py-6 scroll-mt-[140px] md:scroll-mt-[124px] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8" style={{ background: '#fdf8f0' }}>
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Past Events Gallery</h2>
              <p className="text-lg text-gray-600">A look back at our recent gatherings and community events.</p>
            </div>

            {sortedPastEvents.length > 0 ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {sortedPastEvents.map((item) => {
                  const itemDate = parseDateAsLocal(item.date);
                  const itemEndDate = parseDateAsLocal(item.end_date);
                  const dateLabel = formatDateRange(itemDate, itemEndDate);
                  const timeLabel = formatTimeRange(item.time, item.end_time);
                  const locationType = getLocationType(item);
                  const calendarUrl = getGoogleCalendarUrl(item);
                  return (
                  <div
                    id={`announcement-${item.id}`}
                    key={item.id}
                    className={`bg-white border-l-4 border-amber-400 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow scroll-mt-[160px] md:scroll-mt-[140px] ${
                      selectedAnnouncementId === String(item.id) ? "ring-4 ring-amber-400 ring-offset-4" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-5">
                      {item.image_upload && (
                        <div className="flex aspect-[32/15] w-full items-center justify-center overflow-hidden rounded-lg bg-gray-950">
                          <img src={item.image_upload} alt={item.title} className="h-full w-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
                          <Badge variant="outline" className="shrink-0 border-amber-500 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber-600">
                            {categories[item.category] || 'Church-Wide'}
                          </Badge>
                        </div>
                        {item.content && (
                          <div className="text-gray-600 text-sm mb-3 prose prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline"/>
                              }}
                            >
                                {item.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        <div className="space-y-2 text-sm text-gray-500">
                          {dateLabel && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span><strong className="font-semibold">Date:</strong> {dateLabel}</span>
                              {calendarUrl && (
                                <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded text-xs font-semibold text-amber-700 underline-offset-2 hover:underline">
                                  <Calendar className="h-3 w-3" />
                                  Add to calendar
                                </a>
                              )}
                            </div>
                          )}
                          {timeLabel && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Time:</strong> {timeLabel}</span></div>}
                          {item.frequency && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Frequency:</strong> {item.frequency}</span></div>}
                          {hasPhysicalLocation(item) && item.location && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Location:</strong> {item.location}</span></div>}
                          {hasVirtualLocation(item) && item.virtual_platform && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Platform:</strong> {item.virtual_platform}</span></div>}
                          {hasVirtualLocation(item) && item.meeting_id && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Meeting ID:</strong> {item.meeting_id}</span></div>}
                          {hasVirtualLocation(item) && item.meeting_passcode && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Passcode:</strong> {item.meeting_passcode}</span></div>}
                          {item.contact_email && (
                            <div className="flex items-start gap-2">
                              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              <span>
                                <strong className="font-semibold">Email:</strong> {item.contact_email}
                                {renderCopyButton(`${item.id || item.title}-past-email`, item.contact_email, "email")}
                              </span>
                            </div>
                          )}
                          {item.contact_phone && (
                            <div className="flex items-start gap-2">
                              <Phone className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              <span>
                                <strong className="font-semibold">Phone:</strong> {item.contact_phone}
                                {renderCopyButton(`${item.id || item.title}-past-phone`, item.contact_phone, "phone number")}
                              </span>
                            </div>
                          )}
                        </div>
                        {(item.zoom_link || item.directions_url || item.file_upload) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {hasVirtualLocation(item) && item.zoom_link && (
                              <a href={item.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open Link
                              </a>
                            )}
                            {hasPhysicalLocation(item) && item.directions_url && (
                              <a href={item.directions_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                                <MapPin className="h-3.5 w-3.5" />
                                Get Directions
                              </a>
                            )}
                            {item.file_upload && (
                              <a href={item.file_upload} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800">
                                <FileText className="h-3.5 w-3.5" />
                                {item.file_label || "Open Form"}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="col-span-full text-center py-12">
                <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No past events in the gallery yet.</h3>
                <p className="text-gray-600">
                  Check back soon to see photos and memories from our community events!
                </p>
              </div>
            )}
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
