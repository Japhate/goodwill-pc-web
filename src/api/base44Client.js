const LOCAL_API = import.meta.env.VITE_LOCAL_API_URL || '';
const LOCAL_STORAGE_KEY = 'goodwill-local-data-v5';

const seedData = {
  HeroSlide: [
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
  ],
  Sermons: [
    {
      id: 'sermon-active',
      title: 'The Good Shepherd',
      speaker: 'Rev. Dr. Ella F. Busby',
      date: '2026-05-17',
      scripture: 'Psalm 23',
      series: 'Sunday Worship',
      notes: 'A message of comfort, care, and faithful community.',
      youtube_url: 'https://www.youtube.com/watch?v=bERzxb_Sbvo',
      status: 'Active',
      created_date: '2026-05-17T12:00:00.000Z',
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
  Banner: [],
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
  if (!res.ok) throw new Error('Local API request failed');
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
      } catch {
        const store = getStore();
        const item = { id: `${entityName}-${Date.now()}`, created_date: new Date().toISOString(), ...data };
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

export const base44 = {
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
