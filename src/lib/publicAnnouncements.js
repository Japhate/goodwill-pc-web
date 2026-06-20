const PUBLIC_ANNOUNCEMENT_STATUSES = new Set(["", "active", "timeless"]);

export function isActiveHeroSlide(slide) {
  return slide?.is_active !== false;
}

export function isPublicAnnouncementStatus(status) {
  return PUBLIC_ANNOUNCEMENT_STATUSES.has(String(status || "").trim().toLowerCase());
}

export function getPublicAnnouncements(announcements = [], heroSlides = []) {
  const activeAnnouncementIds = new Set(
    heroSlides
      .filter(isActiveHeroSlide)
      .map((slide) => slide?.announcement_id)
      .filter(Boolean)
      .map(String)
  );

  return announcements.filter((announcement) =>
    activeAnnouncementIds.has(String(announcement?.id || ""))
      && isPublicAnnouncementStatus(announcement?.status)
  );
}

export function getPublicHeroSlides(heroSlides = [], announcements = []) {
  const announcementsById = new Map(
    announcements.map((announcement) => [String(announcement?.id || ""), announcement])
  );

  return heroSlides.filter((slide) => {
    if (!isActiveHeroSlide(slide)) return false;
    if (!slide?.announcement_id) return true;

    const announcement = announcementsById.get(String(slide.announcement_id));
    return Boolean(announcement) && isPublicAnnouncementStatus(announcement.status);
  });
}
