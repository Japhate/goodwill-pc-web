export const SPECIAL_SERVICE_NOTICE = {
  date: "2026-05-31",
  title: "Today's Worship Location Change",
  message: "Important: Today's 10:30 AM service will be a united service at Second Presbyterian Church in Sumter. We will not meet in Goodwill Presbyterian Church's main sanctuary today.",
  serviceLabel: "United Service Today @ 10:30 AM",
  serviceTitle: "United Service Today",
  serviceTimeLabel: "10:30 AM",
  locationLabel: "Second Presbyterian Church, Sumter, SC",
  directionsUrl: "https://www.google.com/maps/search/?api=1&query=Second+Presbyterian+Church+Sumter+SC",
  heroImageUrl: "/images/hero/united-service-second-presbyterian.png",
  heroAltText: "United service today at 10:30 AM at Second Presbyterian Church in Sumter, South Carolina",
  priorityStart: "2026-05-31T00:00",
  priorityEnd: "2026-05-31T12:00",
  liveStreamAvailable: false,
  liveStreamMessage: "Today's united service is in person only and will not be livestreamed.",
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getActiveSpecialServiceNotice(date = new Date()) {
  if (getLocalDateKey(date) !== SPECIAL_SERVICE_NOTICE.date) return null;

  const start = new Date(SPECIAL_SERVICE_NOTICE.priorityStart);
  const end = new Date(SPECIAL_SERVICE_NOTICE.priorityEnd);

  return date >= start && date < end ? SPECIAL_SERVICE_NOTICE : null;
}

export function getSpecialServiceDateTime(notice = SPECIAL_SERVICE_NOTICE) {
  const [year, month, day] = notice.date.split("-").map(Number);
  const [hour, minute] = notice.serviceTimeLabel.split(":").map((part) => Number(part.replace(/\D/g, "")));
  const isPm = notice.serviceTimeLabel.toLowerCase().includes("pm");
  const normalizedHour = isPm && hour < 12 ? hour + 12 : hour;

  return new Date(year, month - 1, day, normalizedHour, minute || 0, 0, 0);
}

export function createSpecialServiceHeroSlide(notice = SPECIAL_SERVICE_NOTICE) {
  return {
    id: "special-service-second-presbyterian-2026-05-31",
    order: -100,
    is_active: true,
    image_url: notice.heroImageUrl,
    alt_text: notice.heroAltText,
    link_url: notice.directionsUrl,
    link_label: "Get Directions",
    is_priority_announcement: true,
    priority_start: notice.priorityStart,
    priority_end: notice.priorityEnd,
  };
}
