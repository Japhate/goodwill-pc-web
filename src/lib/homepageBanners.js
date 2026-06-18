export const LIVE_BIBLE_STUDY_BANNER_MESSAGE = "\u{1F534} Our Zoom Bible Study is happening now. Click the Zoom button to join us.";

export const LIVE_BIBLE_STUDY_BANNER = {
  message: LIVE_BIBLE_STUDY_BANNER_MESSAGE,
  status: "active",
  order: 0,
  is_bible_study_live_banner: true,
};

export const DEFAULT_HOMEPAGE_BANNERS = [
  LIVE_BIBLE_STUDY_BANNER,
  {
    message: "\u{1F64F} Our Live Service happens every Sunday at 10:30 am.",
    status: "active",
    order: 1,
  },
  {
    message: "\u{1F4BB} Join us every Wednesday at 6:30 pm for our weekly Bible Study on Zoom.",
    status: "active",
    order: 2,
  },
];

export const DEFAULT_HOMEPAGE_BANNER_MESSAGES = DEFAULT_HOMEPAGE_BANNERS
  .filter((banner) => !banner.is_bible_study_live_banner)
  .map((banner) => banner.message);
