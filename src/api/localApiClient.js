import { firebaseApi } from "@/api/firebaseApiClient";
import { firebaseEnabled } from "@/lib/firebase";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/newsletterTemplates";

const LOCAL_API = import.meta.env.VITE_LOCAL_API_URL || '';
const LOCAL_STORAGE_KEY = 'goodwill-local-data-v5';

const seedData = {
  HeroSlide: [
    {
      id: 'special-service-second-presbyterian-2026-05-31',
      order: -100,
      is_active: true,
      image_url: '/images/hero/united-service-second-presbyterian.png',
      alt_text: 'United service today at 10:30 AM at Second Presbyterian Church in Sumter, South Carolina',
      link_url: 'https://www.google.com/maps/search/?api=1&query=Second+Presbyterian+Church+Sumter+SC',
      link_label: 'Get Directions',
      is_priority_announcement: true,
      priority_start: '2026-05-31T00:00',
      priority_end: '2026-05-31T12:00',
    },
    {
      id: 'hero-1',
      order: 1,
      is_active: true,
      image_url: '/images/hero/goodwill-presbyterian-church-hero.png',
      alt_text: 'Welcome to Goodwill Presbyterian Church',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-2',
      order: 2,
      is_active: true,
      image_url: '/images/hero/zoom-meeting-hero.png',
      alt_text: 'Join us every Wednesday at 6:30 PM for Zoom Bible Study',
      link_url: 'https://us06web.zoom.us/j/82013337566?pwd=mULnQC1Zjg5GWkoTTKGvx3PyAFaCeZ.1',
      link_label: 'Join Zoom',
      is_zoom_bible_study: true,
    },
    {
      id: 'hero-3',
      order: 3,
      is_active: true,
      image_url: '/images/hero/pentecost-sunday-hero.png',
      alt_text: 'Pentecost Sunday',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-4',
      order: 4,
      is_active: true,
      image_url: '/images/hero/juneteenth-celebration-hero.png',
      alt_text: 'Juneteenth Celebration',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-5',
      order: 5,
      is_active: true,
      image_url: '/images/hero/celebrating-achievements.png',
      alt_text: 'Celebrating Achievements',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-6',
      order: 6,
      is_active: true,
      image_url: '/images/hero/chancel-choir-spring-concert.png',
      alt_text: 'Chancel Choir Spring Concert',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-7',
      order: 7,
      is_active: true,
      image_url: '/images/hero/christian-education-youth-ministry.png',
      alt_text: 'Christian Education and Youth Ministry',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-8',
      order: 8,
      is_active: true,
      image_url: '/images/hero/devotional-booklet.png',
      alt_text: 'Devotional Booklet Distribution',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-9',
      order: 9,
      is_active: true,
      image_url: '/images/hero/dr-lawson-fortune-phd.png',
      alt_text: 'Congratulations to Dr. Lawson Fortune',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-10',
      order: 10,
      is_active: true,
      image_url: '/images/hero/health-focused-hero.png',
      alt_text: 'Health-Focused Ministry',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-11',
      order: 11,
      is_active: true,
      image_url: '/images/hero/health-prayer-focus.png',
      alt_text: 'Health and Prayer Focus for June',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-12',
      order: 12,
      is_active: true,
      image_url: '/images/hero/johnson-c-smith-university-day.png',
      alt_text: 'Johnson C. Smith University Day',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-13',
      order: 13,
      is_active: true,
      image_url: '/images/hero/honoring-our-educators-hero.png',
      alt_text: 'Honoring Our Educators',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-14',
      order: 14,
      is_active: true,
      image_url: '/images/hero/juneteenth-celebration-2.png',
      alt_text: 'Juneteenth Worship Celebration',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-15',
      order: 15,
      is_active: true,
      image_url: '/images/hero/may-birthdays.png',
      alt_text: 'May Birthdays',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-16',
      order: 16,
      is_active: true,
      image_url: '/images/hero/midlands-gives.png',
      alt_text: 'Midlands Gives',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-17',
      order: 17,
      is_active: true,
      image_url: '/images/hero/online-worshipers-hero.png',
      alt_text: 'Online Worshipers Prayer, Care and Connection',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-18',
      order: 18,
      is_active: true,
      image_url: '/images/hero/scholarship-fund.png',
      alt_text: 'College and Higher Education Scholarship Fund',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-19',
      order: 19,
      is_active: true,
      image_url: '/images/hero/summer-summit.png',
      alt_text: 'Summer Summit',
      link_url: '',
      link_label: '',
    },
    {
      id: 'hero-20',
      order: 20,
      is_active: true,
      image_url: '/images/hero/vacation-bible-school.png',
      alt_text: 'Vacation Bible School',
      link_url: '',
      link_label: '',
    },
  ],
  Sermons: [
    {
      id: 'sermon-active',
      title: 'When the Holy Spirit is Present',
      speaker: 'Rev. Dr. Joe W. Rigsby',
      date: '2026-05-23',
      scripture: 'Acts 2:1-6, 12-22',
      series: '',
      notes: 'Living in the power of the Holy Spirit.',
      youtube_url: 'https://youtu.be/veQ-5a40p6g',
      status: 'Active',
      created_date: '2026-05-23T12:00:00.000Z',
    },
    {
      id: 'sermon-archive-1',
      title: 'Trusting God Together',
      speaker: 'Goodwill Presbyterian Church',
      date: '2026-05-10',
      scripture: 'Proverbs 3:5-6',
      series: 'Sunday Worship',
      notes: 'Walking in faith as a church family.',
      youtube_url: 'https://www.youtube.com/watch?v=bERzxb_Sbvo',
      status: 'Inactive',
      created_date: '2026-05-10T12:00:00.000Z',
    },
  ],
  AnnouncementsEvents: [
    {
      id: 'announcement-1',
      title: 'Sunday Morning Worship',
      description: 'Join us every Sunday at 10:30 AM for worship at Goodwill Presbyterian Church.',
      date: '2026-05-24',
      time: '10:30',
      end_time: '12:00',
      category: 'worship',
      status: 'Active',
      created_date: '2026-05-01T12:00:00.000Z',
    },
    {
      id: 'announcement-2',
      title: 'Wednesday Bible Study',
      description: 'Weekly Zoom Bible Study begins at 6:30 PM.',
      date: '',
      time: '18:30',
      end_time: '19:00',
      category: 'study',
      status: 'Active',
      created_date: '2026-05-02T12:00:00.000Z',
    },
  ],
  WorshipEvent: [],
  Bulletins: [
    {
      id: 'bulletin-current',
      title: 'Sunday Worship Bulletin',
      date: '2026-05-24',
      file_url: '',
      status: 'Current',
      created_date: '2026-05-20T12:00:00.000Z',
    },
  ],
  HomeBannerMessages: [],
  Banner: [],
  SitePopups: [
    {
      id: 'special-service-popup-2026-05-31',
      title: 'United Service Today',
      eyebrow: 'Important Worship Update',
      message: "Today's 10:30 AM service is at Second Presbyterian Church in Sumter. No service at Goodwill's main sanctuary. No livestream today.",
      detail: 'Please join us in person for this united service. The website will return to normal after 12:00 PM today.',
      scripture: 'Let us consider how to stir up one another to love and good works, not neglecting to meet together.',
      time_label: 'Today at 10:30 AM',
      location: 'Second Presbyterian Church, Sumter, SC',
      cta_label: 'Get Directions',
      cta_url: 'https://www.google.com/maps/search/?api=1&query=Second+Presbyterian+Church+Sumter+SC',
      start_at: '2026-05-31T00:00',
      end_at: '2026-05-31T12:00',
      priority: 1,
      status: 'Active',
      dismissible: true,
      created_date: '2026-05-31T00:00:00.000Z',
    },
  ],
  PrayerRequests: [
    {
      id: 'prayer-1',
      name: 'Church Family',
      request: 'Prayers for our congregation, community, and neighbors.',
      is_public: true,
      status: 'approved',
      created_date: '2026-05-01T12:00:00.000Z',
    },
  ],
  NewsletterSubscriptions: [],
  EmailTemplates: DEFAULT_EMAIL_TEMPLATES,
  NewsletterBroadcasts: [],
  AdminActivityLogs: [],
};

const memoryData = structuredClone(seedData);

function getStore() {
  if (typeof window === 'undefined') return memoryData;
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seedData));
    return structuredClone(seedData);
  }
  try {
    return { ...structuredClone(seedData), ...JSON.parse(raw) };
  } catch {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seedData));
    return structuredClone(seedData);
  }
}

function setStore(data) {
  if (typeof window === 'undefined') {
    Object.assign(memoryData, data);
    return;
  }
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

function sortItems(items, sort) {
  if (!sort) return items;
  const descending = sort.startsWith('-');
  const key = descending ? sort.slice(1) : sort;
  return [...items].sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (descending ? -1 : 1);
  });
}

function filterItems(items, filter = {}) {
  const keys = Object.keys(filter || {});
  if (!keys.length) return items;
  return items.filter(item => keys.every(key => String(item[key]) === String(filter[key])));
}

async function request(path, options) {
  const res = await fetch(`${LOCAL_API}${path}`, options);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const error = new Error(errorBody?.error || 'Local API request failed');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function localEntity(entityName) {
  return {
    list: async (sort, limit) => {
      try {
        return await request(`/api/entities/${entityName}?sort=${encodeURIComponent(sort || '')}&limit=${limit || ''}`);
      } catch {
        const store = getStore();
        return sortItems(store[entityName] || [], sort).slice(0, limit || undefined);
      }
    },
    filter: async (filter = {}, sort, limit) => {
      try {
        return await request(`/api/entities/${entityName}/filter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter, sort, limit }),
        });
      } catch {
        const store = getStore();
        return sortItems(filterItems(store[entityName] || [], filter), sort).slice(0, limit || undefined);
      }
    },
    create: async (data) => {
      try {
        return await request(`/api/entities/${entityName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (error) {
        if (error?.status === 409) throw error;

        if (entityName === 'NewsletterSubscriptions') {
          const email = data.email?.trim().toLowerCase();
          const emailKey = data.email_key || encodeURIComponent(email);
          const firstName = String(data.first_name || '').trim().replace(/\s+/g, ' ');
          const lastName = String(data.last_name || '').trim().replace(/\s+/g, ' ');
          const store = getStore();
          const existing = (store[entityName] || []).find(item => item.email_key === emailKey || item.email === email);

          if (existing?.status !== 'unsubscribed') {
            throw new Error('already-subscribed');
          }

          const item = {
            id: emailKey,
            created_date: new Date().toISOString(),
            ...data,
            first_name: firstName,
            last_name: lastName,
            email,
            email_key: emailKey,
            status: 'active',
          };
          store[entityName] = [...(store[entityName] || []).filter(entry => entry.id !== emailKey), item];
          setStore(store);
          return item;
        }

        const store = getStore();
        const item = {
          created_date: new Date().toISOString(),
          ...data,
          id: entityName === 'EmailTemplates' && data.id ? data.id : `${entityName}-${Date.now()}`,
        };
        store[entityName] = [...(store[entityName] || []), item];
        setStore(store);
        return item;
      }
    },
    update: async (id, data) => {
      try {
        return await request(`/api/entities/${entityName}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch {
        const store = getStore();
        store[entityName] = (store[entityName] || []).map(item =>
          String(item.id) === String(id) ? { ...item, ...data } : item
        );
        setStore(store);
        return store[entityName].find(item => String(item.id) === String(id));
      }
    },
    delete: async (id) => {
      try {
        return await request(`/api/entities/${entityName}/${id}`, { method: 'DELETE' });
      } catch {
        const store = getStore();
        store[entityName] = (store[entityName] || []).filter(item => String(item.id) !== String(id));
        setStore(store);
        return { success: true };
      }
    },
  };
}

const developmentApi = {
  entities: new Proxy({}, {
    get: (_, name) => localEntity(name),
  }),
  auth: {
    me: async () => ({ id: 'local-user', full_name: 'Local Editor', role: 'admin' }),
    logout: () => {},
    redirectToLogin: () => {},
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => ({ file_url: file ? URL.createObjectURL(file) : '' }),
      InvokeLLM: async () => null,
      SendEmail: async () => ({ success: true }),
      SendSMS: async () => ({ success: true }),
      GenerateImage: async () => null,
      ExtractDataFromUploadedFile: async () => null,
    },
  },
  appLogs: {
    logUserInApp: async () => {},
  },
};

export const localApi = firebaseEnabled ? firebaseApi : developmentApi;
