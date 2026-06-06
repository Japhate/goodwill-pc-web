import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AnnouncementsEvents } from "@/entities/AnnouncementsEvents";
import { WorshipEvent } from "@/entities/WorshipEvent";
import { Calendar, Clock, MapPin, Image, CheckCircle, ExternalLink, FileText } from "lucide-react";
import { format, isBefore, startOfDay, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { groupBy } from 'lodash';
import { Badge } from "@/components/ui/badge";
import { getActiveSpecialServiceNotice } from "@/lib/specialServiceNotice";

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
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "";
};

const getLocationType = (item) => item.location_type || (item.virtual_platform || item.zoom_link ? "virtual" : "physical");

const SHOW_PAST_EVENTS_GALLERY = false;

export default function Updates() {
  const [feedItems, setFeedItems] = useState([]);
  const [worshipEvents, setWorshipEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSection, setActiveSection] = useState("");
  const [now, setNow] = useState(new Date());
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [announcementRes, worshipEventsRes] = await Promise.all([
        AnnouncementsEvents.list('-created_date', 200),
        WorshipEvent.list('event_date', 100)
      ]);
      // Filter out Hidden announcements
      const visibleAnnouncements = announcementRes.filter(a => a.status !== 'Hidden');
      setFeedItems(visibleAnnouncements);
      setWorshipEvents(worshipEventsRes);
    } catch (error) {
      console.error("Error loading page data:", error);
      setFeedItems([]);
      setWorshipEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => startOfDay(new Date()), []);

  const upcomingAndUndatedEvents = useMemo(() => {
    // Filter for Active and Timeless status only
    const currentEvents = feedItems.filter(item => 
      item.status === 'Active' || item.status === 'Timeless' || !item.status
    );
    
    return currentEvents.filter(item => {
      // Timeless items always show regardless of date
      if (item.status === 'Timeless') return true;
      const itemStartDate = parseDateAsLocal(item.date);
      const itemEndDate = parseDateAsLocal(item.end_date);
      const relevantDate = itemEndDate || itemStartDate;
      if (!relevantDate) return true; // Keep items without a valid date
      return !isBefore(relevantDate, today);
    }).sort((a, b) => {
      const aDate = parseDateAsLocal(a.date);
      const bDate = parseDateAsLocal(b.date);
      const aHasDate = !!aDate;
      const bHasDate = !!bDate;

      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;
      if (!aHasDate && !bHasDate) {
        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
      }
      return aDate.getTime() - bDate.getTime();
    });
  }, [feedItems, today]);

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

  const groupedEvents = React.useMemo(() => {
    const monthOrder = ["Ongoing Events", "October 2025", "November 2025", "December 2025", "January 2026", "February 2026"];

    const sortedEvents = [...worshipEvents].sort((a, b) => {
      const monthIndexA = monthOrder.indexOf(a.month_group);
      const monthIndexB = monthOrder.indexOf(b.month_group);
      if (monthIndexA !== monthIndexB) {
        return monthIndexA - monthIndexB;
      }
      const dateA = parseDateAsLocal(a.event_date);
      const dateB = parseDateAsLocal(b.event_date);
      if (dateA && dateB) return dateA.getTime() - dateB.getTime();
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });

    return groupBy(sortedEvents, 'month_group');
  }, [worshipEvents]);

  const categories = {
    church_wide: "Church-Wide",
    mens_ministry: "Men's Ministry",
    womens_ministry: "Women's Ministry",
    youth_ministry: "Youth Ministry",
    session_leadership: "Session & Leadership",
  };

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
              } else if (sortedPastEvents.some(item => `announcement-${item.id}` === id)) {
                activeIdToSet = 'past-events';
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
  }, [location.pathname, loading, subNavLinks, upcomingAndUndatedEvents, sortedPastEvents]);

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
      <div className="flex justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-amber-600 border-dashed rounded-full animate-spin"></div>
      </div>
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
                        <a href={link.href} onClick={(e) => handleSubNavClick(e, link.href)}>
                           {link.title}
                        </a>
                    </Button>
                ))}
            </div>
        </div>
      </div>


      {/* Content with proper padding */}
      <div className="pt-24 md:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <section id="announcements-events" className="py-2 scroll-mt-[140px] md:scroll-mt-[124px]">
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


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredFeed.length > 0 ? (
                filteredFeed.map((item) => {
                  const itemDate = parseDateAsLocal(item.date);
                  const itemEndDate = parseDateAsLocal(item.end_date);
                  const isFarFuture = itemDate && itemDate.getFullYear() > 2090;
                  const dateLabel = !isFarFuture ? formatDateRange(itemDate, itemEndDate) : "";
                  const timeLabel = formatTimeRange(item.time, item.end_time);
                  const locationType = getLocationType(item);
                  return (
                  <div
                    id={`announcement-${item.id}`}
                    key={item.id}
                    className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col scroll-mt-[160px] md:scroll-mt-[140px] ${
                      selectedAnnouncementId === String(item.id) ? "ring-4 ring-amber-400 ring-offset-4" : ""
                    }`}
                  >
                    {item.image_upload ? (
                      <div className="flex aspect-[48/19] w-full items-center justify-center overflow-hidden bg-gray-950">
                        <img src={item.image_upload} alt={item.title} className="h-full w-full object-contain" />
                      </div>
                    ) : null}
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex-grow">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
                          <Badge variant="outline" className="shrink-0 border-amber-500 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber-600">
                            {categories[item.category] || 'Church-Wide'}
                          </Badge>
                        </div>
                        <div className="text-gray-600 prose prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                                a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline"/>
                            }}
                          >
                              {item.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 border-t pt-4 text-sm text-gray-500">
                        {dateLabel && <div className="flex items-start gap-2"><Calendar className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Date:</strong> {dateLabel}</span></div>}
                        {timeLabel && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Time:</strong> {timeLabel}</span></div>}
                        {item.frequency && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Frequency:</strong> {item.frequency}</span></div>}
                        {locationType === "virtual" ? (
                          item.virtual_platform && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Platform:</strong> {item.virtual_platform}</span></div>
                        ) : (
                          item.location && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Location:</strong> {item.location}</span></div>
                        )}
                        {(item.zoom_link || item.directions_url || item.file_upload) && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {locationType === "virtual" && item.zoom_link && (
                              <a href={item.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open Link
                              </a>
                            )}
                            {locationType !== "virtual" && item.directions_url && (
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

              <div className="max-w-4xl mx-auto space-y-8">
                {Object.entries(groupedEvents).map(([month, events]) => (
                  <div key={month}>
                    <h3 className="text-2xl font-semibold text-amber-700 mb-4 border-b-2 border-amber-200 pb-2">{month}</h3>
                    <ul className="space-y-3">
                      {events.map(event => {
                        const eventDate = parseDateAsLocal(event.event_date);
                        const isCompleted = event.is_completed || false;
                        return (
                        <li key={event.id} className={`bg-white p-4 rounded-lg shadow-sm flex items-start gap-4 transition-all duration-300 ${
                          isCompleted
                            ? 'border-l-4 border-green-500 bg-green-50/50'
                            : 'border-l-4 border-amber-400 hover:shadow-md'
                        }`}>
                          <div className="text-center border-r pr-4">
                            {month !== "Ongoing Events" && eventDate && (
                              <>
                                <div className="text-sm text-red-600 font-bold">{format(eventDate, 'MMM')}</div>
                                <div className="text-2xl font-bold text-gray-800">{format(eventDate, 'dd')}</div>
                              </>
                            )}
                            {month === "Ongoing Events" && (
                              <div className="text-lg font-bold text-gray-800 flex items-center justify-center h-full w-full">
                                <Clock className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 mb-1">
                                  {event.title}
                                </p>
                                {event.description && <p className="text-sm text-gray-600">{event.description}</p>}
                              </div>
                              {isCompleted ? (
                                <div className="flex items-center gap-1.5 bg-green-100 px-3 py-1 rounded-full flex-shrink-0">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-xs font-medium text-green-700">Completed</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-full flex-shrink-0">
                                  <Clock className="w-4 h-4 text-amber-600" />
                                  <span className="text-xs font-medium text-amber-700">Upcoming</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      )})}
                    </ul>
                  </div>
                ))}
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
                        <div className="flex aspect-[48/19] w-full items-center justify-center overflow-hidden rounded-lg bg-gray-950">
                          <img src={item.image_upload} alt={item.title} className="h-full w-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
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
                          {dateLabel && <div className="flex items-start gap-2"><Calendar className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Date:</strong> {dateLabel}</span></div>}
                          {timeLabel && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Time:</strong> {timeLabel}</span></div>}
                          {item.frequency && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Frequency:</strong> {item.frequency}</span></div>}
                          {locationType === "virtual" ? (
                            item.virtual_platform && <div className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Platform:</strong> {item.virtual_platform}</span></div>
                          ) : (
                            item.location && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong className="font-semibold">Location:</strong> {item.location}</span></div>
                          )}
                        </div>
                        {(item.zoom_link || item.directions_url || item.file_upload) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {locationType === "virtual" && item.zoom_link && (
                              <a href={item.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open Link
                              </a>
                            )}
                            {locationType !== "virtual" && item.directions_url && (
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
