import { useState, useEffect, useRef } from 'react';
import { AnnouncementsEvents } from '@/entities/AnnouncementsEvents';
import { WorshipEvent } from '@/entities/WorshipEvent';
import { Sermons } from '@/entities/Sermons';
import { Bulletins } from '@/entities/Bulletins';
import { HomeBannerMessages } from '@/entities/HomeBannerMessages';
import { Banner as LegacyBanner } from '@/entities/Banner';
import { SitePopups } from '@/entities/SitePopups';
import { NewsletterSubscriptions } from '@/entities/NewsletterSubscriptions';
import { NewsletterBroadcasts } from '@/entities/NewsletterBroadcasts';
import { EmailTemplates } from '@/entities/EmailTemplates';
import { AdminActivityLogs } from '@/entities/AdminActivityLogs';
import { User } from '@/entities/User';
import AnnouncementList from '@/components/admin/AnnouncementList';
import AnnouncementForm from '@/components/admin/AnnouncementForm';
import WorshipEventList from '@/components/admin/WorshipEventList';
import WorshipEventForm from '@/components/admin/WorshipEventForm';
import SermonList from '@/components/admin/SermonList';
import SermonForm from '@/components/admin/SermonForm';
import BulletinList from '@/components/admin/BulletinList';
import BulletinForm from '@/components/admin/BulletinForm';
import BannerList from '@/components/admin/BannerList';
import BannerForm from '@/components/admin/BannerForm';
import HeroSlideList from '@/components/admin/HeroSlideList';
import HeroSlideForm from '@/components/admin/HeroSlideForm';
import SitePopupList from '@/components/admin/SitePopupList';
import SitePopupForm from '@/components/admin/SitePopupForm';
import NewsletterAdmin from '@/components/admin/NewsletterAdmin';
import DeveloperPanel from '@/components/admin/DeveloperPanel';
import { HeroSlide } from '@/entities/HeroSlide';
import { firebaseAuth, firebaseEnabled } from '@/lib/firebase';
import { localApi } from '@/api/localApiClient';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { DEFAULT_HOMEPAGE_BANNERS } from '@/lib/homepageBanners';
import { DEFAULT_EMAIL_TEMPLATES, NEWSLETTER_TEMPLATE_IDS } from '@/lib/newsletterTemplates';
import { createSpecialServicePopup } from '@/lib/specialServiceNotice';
import { Camera, Loader2, ShieldAlert, Megaphone, CalendarHeart, Images, PlaySquare, FileText, MessageSquare, EyeOff, LayoutTemplate, LogOut, BellRing, Mail, ShieldCheck, UserRound, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ADMIN_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const AUTO_LOGOUT_NOTICE_KEY = 'goodwill-admin-auto-logout';
const AUTO_LOGOUT_MESSAGE = 'You were logged out automatically due to inactivity.';
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
const ADMIN_PRIVACY_NOTICE_VERSION = '2026-05-31';
const SITE_DEVELOPER_EMAIL = 'nebajaphate@gmail.com';
const FORM_LOG_META = {
  announcement: { section: 'Announcements & Events', itemType: 'announcement' },
  worshipEvent: { section: 'Calendar of Worship', itemType: 'worship event' },
  sermon: { section: 'Sermons', itemType: 'sermon' },
  bulletin: { section: 'Worship Bulletins', itemType: 'bulletin' },
  banner: { section: 'Homepage Banner', itemType: 'homepage banner' },
  heroSlide: { section: 'Hero Slideshow', itemType: 'hero slide' },
  sitePopup: { section: 'Homepage Popups', itemType: 'homepage popup' },
};
const ADMIN_PRIVACY_NOTICE = [
  'As a Goodwill Presbyterian Church site administrator, you are trusted with access to information that may include names, email addresses, prayer requests, newsletter subscriber records, worship resources, and internal church communications.',
  'Use this admin panel only for legitimate church ministry and website management purposes. Do not download, copy, share, screenshot, export, or reuse personal information unless it is necessary for an approved church task.',
  'Newsletter and broadcast tools must be used with care. Send messages only to appropriate recipients, avoid unnecessary attachments, and make sure the content reflects the church with accuracy, kindness, and respect.',
  'Prayer requests, pastoral information, and private contact details should be treated as confidential. If something appears sensitive, pause and confirm before publishing, forwarding, or storing it elsewhere.',
  'Keep your administrator account secure. Do not share your password, do not leave the admin panel open on a shared device, and sign out when you are finished. If you believe your account or device has been compromised, contact the church website administrator immediately.',
  'By continuing, you acknowledge that you are responsible for protecting church data, using this access only for authorized purposes, and promptly reporting mistakes or privacy concerns.'
];
const KNOWN_ADMIN_PROFILES = {
  'nebajaphate@gmail.com': {
    first_name: 'Japhate',
    last_name: 'Neba',
    email: 'nebajaphate@gmail.com',
  },
};

function getSaveErrorMessage(error) {
  if (error?.code === 'permission-denied' || String(error?.message || '').toLowerCase().includes('permission')) {
    return 'Unable to save this item. Firestore rejected the change. Confirm the latest rules are published and that your Firebase Auth UID exists in the admins collection.';
  }

  return 'Unable to save this item. Please refresh and try again.';
}

function prepareSitePopupData(data) {
  const { id: _id, is_unsaved_fallback: _isUnsavedFallback, ...popupData } = data || {};
  return popupData;
}

function createUnsubscribeToken() {
  const bytes = new Uint8Array(18);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now()}${Math.random()}`.replace(/\D/g, "").padEnd(36, "0").slice(0, 36);
}

async function getApiErrorMessage(response, fallback) {
  const body = await response.json().catch(() => null);
  return [body?.error, body?.detail].filter(Boolean).join(" ") || fallback;
}

function normalizeBroadcastAttachment(attachment) {
  return {
    filename: attachment.filename,
    contentType: attachment.contentType || attachment.content_type || '',
    size: attachment.size || 0,
    file_url: attachment.file_url || attachment.fileUrl || '',
    content: attachment.content || '',
  };
}

function splitDisplayName(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function getKnownAdminNameFallback(email = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const knownProfile = KNOWN_ADMIN_PROFILES[normalizedEmail];
  return knownProfile
    ? { firstName: knownProfile.first_name, lastName: knownProfile.last_name }
    : { firstName: '', lastName: '' };
}

function deriveAdminProfile(user = {}, profile = {}) {
  const fallbackName = splitDisplayName(user.full_name || firebaseAuth?.currentUser?.displayName || '');
  const email = profile.email || user.email || firebaseAuth?.currentUser?.email || '';
  const emailName = email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '';
  const emailFallback = splitDisplayName(emailName);
  const knownAdminName = getKnownAdminNameFallback(email);
  const hasSavedProfileName = Boolean(profile.first_name && profile.last_name);
  const shouldAwaitFirstLoginName = Boolean(profile.id || profile.email) && !hasSavedProfileName && !knownAdminName.firstName;
  const firstName = shouldAwaitFirstLoginName ? '' : profile.first_name || user.first_name || knownAdminName.firstName || fallbackName.firstName || emailFallback.firstName || 'Site';
  const lastName = shouldAwaitFirstLoginName ? '' : profile.last_name || user.last_name || knownAdminName.lastName || fallbackName.lastName || emailFallback.lastName || 'Admin';

  return {
    id: profile.id || user.id || firebaseAuth?.currentUser?.uid || '',
    first_name: firstName,
    last_name: lastName,
    has_saved_name: hasSavedProfileName,
    email,
    photo_url: profile.photo_url || user.photo_url || '',
  };
}

function getInitials(profile = {}) {
  return [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'SA';
}

function isDeveloperAdminEmail(email = '') {
  return String(email || '').trim().toLowerCase() === SITE_DEVELOPER_EMAIL;
}

function getItemLabel(type, data = {}) {
  if (Array.isArray(data)) return `${data.length} ${FORM_LOG_META[type]?.itemType || 'items'}`;
  return data.title || data.message || data.subject || data.alt_text || data.email || data.name || FORM_LOG_META[type]?.itemType || 'item';
}

function AdminAvatar({ profile, size = 'md' }) {
  const dimensions = size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-xs';
  return (
    <div className={`${dimensions} flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-200 bg-amber-100 font-bold text-amber-900 shadow-sm`}>
      {profile?.photo_url ? (
        <img src={profile.photo_url} alt={`${profile.first_name || 'Admin'} profile`} className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(profile)}</span>
      )}
    </div>
  );
}

function RequiredStar() {
  return <span className="ml-1 text-red-600">*</span>;
}

function consumeAutoLogoutNotice() {
  if (typeof window === 'undefined') return '';
  if (window.localStorage.getItem(AUTO_LOGOUT_NOTICE_KEY) !== 'true') return '';

  window.localStorage.removeItem(AUTO_LOGOUT_NOTICE_KEY);
  return AUTO_LOGOUT_MESSAGE;
}

export default function AdminPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [worshipEvents, setWorshipEvents] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [banners, setBanners] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [sitePopups, setSitePopups] = useState([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [newsletterBroadcasts, setNewsletterBroadcasts] = useState([]);
  const [adminActivityLogs, setAdminActivityLogs] = useState([]);
  const [siteAdminComparison, setSiteAdminComparison] = useState([]);
  const [loadingDeveloperLogs, setLoadingDeveloperLogs] = useState(false);
  const [loadingSiteAdmins, setLoadingSiteAdmins] = useState(false);
  const [view, setView] = useState('announcements'); // 'announcements', 'worshipEvents', 'pastEvents', 'sermons', 'bulletins', 'banners', 'hiddenAnnouncements', 'heroSlides', 'sitePopups', 'newsletter', 'developer'
  const [formView, setFormView] = useState(null); // 'announcement', 'worshipEvent', 'sermon', 'bulletin', 'banner', 'heroSlide', 'sitePopup', or null
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [adminLoadError, setAdminLoadError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [privacyNoticeRead, setPrivacyNoticeRead] = useState(false);
  const [showAdminNamePrompt, setShowAdminNamePrompt] = useState(false);
  const [adminFirstNameInput, setAdminFirstNameInput] = useState('');
  const [adminLastNameInput, setAdminLastNameInput] = useState('');
  const [savingAdminName, setSavingAdminName] = useState(false);
  const [uploadingAdminPhoto, setUploadingAdminPhoto] = useState(false);
  const inactivityTimerRef = useRef(null);
  const privacyNoticeRef = useRef(null);
  const canViewDeveloperPanel = isDeveloperAdminEmail(currentAdmin?.email);
  const canManageSiteAdmins = canViewDeveloperPanel;
  const adminRoleLabel = canManageSiteAdmins ? 'Site Developer' : 'Site Administrator';

  const logAdminActivity = async ({
    action,
    section = 'Admin Panel',
    itemType = '',
    itemId = '',
    itemLabel = '',
    details = {},
    actor = currentAdmin,
  }) => {
    const actorEmail = String(actor?.email || '').trim().toLowerCase();
    const actorName = [actor?.first_name || actor?.firstName, actor?.last_name || actor?.lastName].filter(Boolean).join(' ')
      || actor?.full_name
      || actorEmail
      || 'Unknown admin';

    try {
      const createdLog = await AdminActivityLogs.create({
        action,
        section,
        item_type: itemType,
        item_id: String(itemId || ''),
        item_label: String(itemLabel || ''),
        actor_uid: actor?.id || firebaseAuth?.currentUser?.uid || '',
        actor_email: actorEmail,
        actor_name: actorName,
        details,
        path: window.location.pathname,
        user_agent: window.navigator.userAgent,
        created_date: new Date().toISOString(),
      });
      if (isDeveloperAdminEmail(actorEmail)) {
        setAdminActivityLogs((logs) => [createdLog, ...logs].slice(0, 300));
      }
    } catch (error) {
      console.error('Unable to record admin activity:', error);
    }
  };

  const loadAdminActivityLogs = async () => {
    if (!canViewDeveloperPanel) {
      setAdminActivityLogs([]);
      return;
    }

    setLoadingDeveloperLogs(true);
    try {
      const logs = await AdminActivityLogs.list('-created_date', 300);
      setAdminActivityLogs(logs);
    } catch (error) {
      console.error('Unable to load admin activity logs:', error);
      setAdminActivityLogs([]);
    } finally {
      setLoadingDeveloperLogs(false);
    }
  };

  const loadSiteAdminComparison = async () => {
    if (!canViewDeveloperPanel) {
      setSiteAdminComparison([]);
      return;
    }

    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) {
      setSiteAdminComparison([]);
      return;
    }

    setLoadingSiteAdmins(true);
    try {
      const response = await fetch('/api/admin/site-admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Unable to load site administrators.');
      setSiteAdminComparison(body?.admins || []);
    } catch (error) {
      console.error('Unable to compare site administrators:', error);
      setSiteAdminComparison([]);
    } finally {
      setLoadingSiteAdmins(false);
    }
  };

  const loadAdminData = async () => {
    const loaders = [
      ['announcements', loadAnnouncements],
      ['worship events', loadWorshipEvents],
      ['sermons', loadSermons],
      ['bulletins', loadBulletins],
      ['homepage banners', loadBanners],
      ['hero slides', loadHeroSlides],
      ['homepage popups', loadSitePopups],
      ['newsletter', loadNewsletterAdmin],
    ];

    const results = await Promise.allSettled(loaders.map(([, loader]) => loader()));

    const failedSections = results
      .map((result, index) => result.status === 'rejected' ? loaders[index][0] : null)
      .filter(Boolean);

    if (failedSections.length > 0) {
      console.error('Unable to load admin sections:', results);
      setAdminLoadError(`Signed in, but unable to load ${failedSections.join(', ')}. Please refresh or check Firestore rules.`);
    } else {
      setAdminLoadError('');
    }
  };

  const loadAdminProfiles = async (user) => {
    if (!firebaseEnabled || !firestore) {
      const profile = deriveAdminProfile(user);
      setCurrentAdmin(profile);
      setAdminFirstNameInput(profile.first_name || '');
      setAdminLastNameInput(profile.last_name || '');
      setShowAdminNamePrompt(!profile.has_saved_name);
      setAdminProfiles([profile]);
      setShowPrivacyNotice(Boolean(profile.has_saved_name));
      return;
    }

    try {
      const snapshot = await getDocs(collection(firestore, 'admins'));
      const profiles = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      const ownProfile = profiles.find((profile) => profile.id === user.id);
      const knownProfile = KNOWN_ADMIN_PROFILES[String(user.email || '').trim().toLowerCase()];
      const profileNeedsKnownUpdate = knownProfile && (
        ownProfile?.first_name !== knownProfile.first_name
        || ownProfile?.last_name !== knownProfile.last_name
        || ownProfile?.email !== knownProfile.email
      );

      if (profileNeedsKnownUpdate) {
        await updateDoc(doc(firestore, 'admins', user.id), {
          ...knownProfile,
          photo_url: ownProfile?.photo_url || '',
          updated_date: new Date().toISOString(),
        });
      }

      const normalizedCurrentAdmin = deriveAdminProfile(user, profileNeedsKnownUpdate
        ? { ...ownProfile, ...knownProfile, id: user.id }
        : ownProfile);
      setCurrentAdmin(normalizedCurrentAdmin);
      setAdminFirstNameInput(normalizedCurrentAdmin.first_name || '');
      setAdminLastNameInput(normalizedCurrentAdmin.last_name || '');
      setShowAdminNamePrompt(!normalizedCurrentAdmin.has_saved_name);
      setAdminProfiles([
        normalizedCurrentAdmin,
        ...profiles
          .filter((profile) => profile.id !== normalizedCurrentAdmin.id)
          .map((profile) => deriveAdminProfile({}, profile)),
      ]);
      setShowPrivacyNotice(Boolean(normalizedCurrentAdmin.has_saved_name));
    } catch (error) {
      console.error('Unable to load admin profiles:', error);
      const profile = deriveAdminProfile(user);
      setCurrentAdmin(profile);
      setAdminFirstNameInput(profile.first_name || '');
      setAdminLastNameInput(profile.last_name || '');
      setShowAdminNamePrompt(!profile.has_saved_name);
      setAdminProfiles([profile]);
      setShowPrivacyNotice(Boolean(profile.has_saved_name));
    }
  };

  const checkUserAndLoadData = async () => {
      setLoading(true);
      try {
        const user = await User.me();
        if (user && user.role === 'admin') {
          setIsAdmin(true);
          setLoginNotice('');
          await loadAdminProfiles(user);
          setPrivacyNoticeRead(false);
          await loadAdminData();
        } else {
          setIsAdmin(false);
          setCurrentAdmin(null);
          setAdminProfiles([]);
          setShowAdminNamePrompt(false);
          setLoginNotice(consumeAutoLogoutNotice());
          setAdminLoadError('');
        }
      } catch (error) {
        setIsAdmin(false);
        setCurrentAdmin(null);
        setAdminProfiles([]);
        setShowAdminNamePrompt(false);
        setLoginNotice(consumeAutoLogoutNotice());
        setAdminLoadError('');
        console.error("User not authenticated or not an admin", error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !isAdmin) return undefined;

    const endSessionForInactivity = async () => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTO_LOGOUT_NOTICE_KEY, 'true');
      }

      try {
        await logAdminActivity({
          action: 'auto_logged_out',
          section: 'Authentication',
          itemType: 'admin session',
          itemLabel: 'Automatic inactivity logout',
          details: { timeout_minutes: ADMIN_INACTIVITY_TIMEOUT_MS / 60000 },
        });
        await User.logout();
      } catch (error) {
        console.error('Unable to auto logout inactive admin session:', error);
      } finally {
        setIsAdmin(false);
        setCurrentAdmin(null);
        setAdminProfiles([]);
        setShowPrivacyNotice(false);
        setShowAdminNamePrompt(false);
        setEditingItem(null);
        setFormView(null);
        setLoginNotice(AUTO_LOGOUT_MESSAGE);
        setAdminLoadError('');
      }
    };

    const resetInactivityTimer = () => {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = window.setTimeout(endSessionForInactivity, ADMIN_INACTIVITY_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });
    resetInactivityTimer();

    return () => {
      window.clearTimeout(inactivityTimerRef.current);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [isAdmin, currentAdmin]);

  useEffect(() => {
    if (!showPrivacyNotice) return undefined;
    const timer = window.setTimeout(() => {
      const node = privacyNoticeRef.current;
      if (node && node.scrollHeight <= node.clientHeight + 8) {
        setPrivacyNoticeRead(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showPrivacyNotice]);

  useEffect(() => {
    if (!showPrivacyNotice && !showAdminNamePrompt) return undefined;
    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    const scrollY = window.scrollY;
    const preventScroll = (event) => {
      const noticeScrollArea = privacyNoticeRef.current;
      if (event.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return;
      if (noticeScrollArea && noticeScrollArea.contains(event.target)) return;
      event.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('keydown', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = '';
      document.body.style.width = originalBodyWidth;
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('keydown', preventScroll);
      window.scrollTo(0, scrollY);
    };
  }, [showPrivacyNotice, showAdminNamePrompt]);

  useEffect(() => {
    if (canViewDeveloperPanel) {
      loadAdminActivityLogs();
      loadSiteAdminComparison();
      return;
    }

    setAdminActivityLogs([]);
    setSiteAdminComparison([]);
    if (view === 'developer') {
      setView('announcements');
    }
  }, [canViewDeveloperPanel, view]);

  const loadAnnouncements = async () => {
    // Fetch with a default sort, will be re-sorted in the component
    const data = await AnnouncementsEvents.list('-created_date', 200);
    setAnnouncements(data);
  };
  
  const loadWorshipEvents = async () => {
    const data = await WorshipEvent.list('event_date', 100);
    setWorshipEvents(data);
  };

  const loadSermons = async () => {
    const data = await Sermons.list('-date', 100);
    setSermons(data);
  };

  const loadBulletins = async () => {
    const data = await Bulletins.list('-date', 100);
    setBulletins([...data].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))));
  };

  const loadBanners = async () => {
    const data = await HomeBannerMessages.list('-created_date', 100);
    if (data.length > 0) {
      setBanners(data);
      return;
    }

    const legacyBanners = await LegacyBanner.list('-created_date', 100);
    if (legacyBanners.length > 0) {
      const migratedBanners = await Promise.all(
        legacyBanners.map(({ id: _id, ...banner }, index) => HomeBannerMessages.create({
          ...banner,
          order: banner.order ?? index + 1,
        }))
      );
      setBanners(migratedBanners);
      return;
    }

    const seededBanners = await Promise.all(
      DEFAULT_HOMEPAGE_BANNERS.map((banner, index) => HomeBannerMessages.create({
        ...banner,
        order: index + 1,
      }))
    );
    setBanners(seededBanners);
  };

  const loadHeroSlides = async () => {
    const data = await HeroSlide.list('order', 50);
    setHeroSlides(data);
  };

  const loadSitePopups = async () => {
    const fallbackPopup = {
      ...createSpecialServicePopup(),
      is_unsaved_fallback: true,
    };

    try {
      const data = await SitePopups.list('priority', 100);
      if (data.length > 0) {
        setSitePopups(data);
        return;
      }

      try {
        const seededPopup = await SitePopups.create(fallbackPopup);
        setSitePopups([seededPopup]);
      } catch (error) {
        console.error('Unable to create default homepage popup:', error);
        setSitePopups([fallbackPopup]);
      }
    } catch (error) {
      console.error('Unable to load homepage popups:', error);
      setSitePopups([fallbackPopup]);
    }
  };

  const loadNewsletterAdmin = async () => {
    const [subscribers, templates, broadcasts] = await Promise.all([
      NewsletterSubscriptions.list('-created_date', 500),
      EmailTemplates.list('name', 20).catch(() => []),
      NewsletterBroadcasts.list('-updated_date', 100).catch(() => []),
    ]);

    setNewsletterSubscribers(subscribers);
    setNewsletterBroadcasts(broadcasts);

    const seededTemplates = [...templates];
    for (const defaultTemplate of DEFAULT_EMAIL_TEMPLATES) {
      if (!seededTemplates.some((template) => template.id === defaultTemplate.id)) {
        try {
          const createdTemplate = await EmailTemplates.create(defaultTemplate);
          seededTemplates.push(createdTemplate);
        } catch (error) {
          console.error(`Unable to create ${defaultTemplate.id} email template:`, error);
          seededTemplates.push({ ...defaultTemplate, is_unsaved_fallback: true });
        }
      }
    }

    setEmailTemplates(seededTemplates);
  };

  const handleAddNewsletterSubscriber = async ({ firstName, lastName, email }) => {
    const normalizedFirstName = String(firstName || '').trim().replace(/\s+/g, ' ');
    const normalizedLastName = String(lastName || '').trim().replace(/\s+/g, ' ');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) return;

    try {
      await NewsletterSubscriptions.create({
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        email: normalizedEmail,
        email_key: encodeURIComponent(normalizedEmail),
        unsubscribe_token: createUnsubscribeToken(),
        status: 'active',
      });
      await logAdminActivity({
        action: 'created',
        section: 'Newsletter',
        itemType: 'newsletter subscriber',
        itemLabel: normalizedEmail,
        details: { first_name: normalizedFirstName, last_name: normalizedLastName },
      });
      await loadNewsletterAdmin();
    } catch (error) {
      console.error('Unable to add newsletter subscriber:', error);
      if (error?.message === 'already-subscribed' || error?.status === 409) {
        window.alert('That email address is already subscribed.');
        return;
      }
      window.alert(getSaveErrorMessage(error));
    }
  };

  const handleDeleteNewsletterSubscriber = async (id) => {
    if (!window.confirm('Remove this email address from the newsletter list?')) return;

    try {
      await NewsletterSubscriptions.delete(id);
      await logAdminActivity({
        action: 'deleted',
        section: 'Newsletter',
        itemType: 'newsletter subscriber',
        itemId: id,
      });
      await loadNewsletterAdmin();
    } catch (error) {
      console.error('Unable to delete newsletter subscriber:', error);
      window.alert(getSaveErrorMessage(error));
    }
  };

  const handleSaveEmailTemplate = async (id, templateData) => {
    const preparedTemplate = {
      ...templateData,
      id,
      updated_date: new Date().toISOString(),
    };

    try {
      if (emailTemplates.some((template) => template.id === id && !template.is_unsaved_fallback)) {
        await EmailTemplates.update(id, preparedTemplate);
      } else {
        await EmailTemplates.create(preparedTemplate);
      }
      await logAdminActivity({
        action: 'updated',
        section: 'Newsletter',
        itemType: 'email template',
        itemId: id,
        itemLabel: templateData.name || templateData.subject || id,
      });
      await loadNewsletterAdmin();
    } catch (error) {
      console.error('Unable to save email template:', error);
      window.alert(getSaveErrorMessage(error));
    }
  };

  const handleSendNewsletterTestEmail = async (templateId, email) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const unsubscribeToken = createUnsubscribeToken();
    const emailKey = encodeURIComponent(normalizedEmail);
    const endpoint = templateId === NEWSLETTER_TEMPLATE_IDS.duplicate
      ? '/api/send-duplicate-subscription-email'
      : '/api/send-welcome-email';
    const payload = templateId === NEWSLETTER_TEMPLATE_IDS.duplicate
      ? { email: normalizedEmail, firstName: 'Test', lastName: 'Subscriber' }
      : {
          email: normalizedEmail,
          firstName: 'Test',
          lastName: 'Subscriber',
          emailKey,
          unsubscribeToken,
          host: window.location.host,
          protocol: window.location.protocol.replace(':', ''),
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorMessage = await getApiErrorMessage(response, 'Unable to send the test email.');
        window.alert(errorMessage);
        return;
      }

      window.alert('Test email sent.');
      await logAdminActivity({
        action: 'sent_test_email',
        section: 'Newsletter',
        itemType: 'email template',
        itemId: templateId,
        itemLabel: normalizedEmail,
      });
    } catch (error) {
      window.alert(`Unable to send the test email: ${error.message}`);
    }
  };

  const handleSendNewsletterBroadcast = async ({ subject, message, attachments, recipientIds, notifyAdmins = false }) => {
    const selectedRecipientIds = new Set(recipientIds || []);
    const activeRecipients = newsletterSubscribers
      .filter((subscriber) => (subscriber.status || 'active') === 'active')
      .filter((subscriber) => selectedRecipientIds.has(String(subscriber.id || subscriber.email_key || subscriber.email || '')))
      .map((subscriber) => ({
        email: subscriber.email,
        firstName: subscriber.first_name || '',
        lastName: subscriber.last_name || '',
        emailKey: subscriber.email_key || subscriber.id || encodeURIComponent(subscriber.email || ''),
        unsubscribeToken: subscriber.unsubscribe_token || '',
      }))
      .filter((subscriber) => subscriber.email);

    if (activeRecipients.length === 0) {
      throw new Error('There are no active newsletter subscribers.');
    }

    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Please sign in again before sending a broadcast.');
    }

    const response = await fetch('/api/send-newsletter-broadcast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        message,
        attachments,
        recipients: activeRecipients,
        notifyAdmins,
        adminRecipients: notifyAdmins
          ? adminProfiles
              .map((profile) => ({
                email: profile.email,
                firstName: profile.first_name || '',
                lastName: profile.last_name || '',
              }))
              .filter((profile) => profile.email)
          : [],
        host: window.location.host,
        protocol: window.location.protocol.replace(':', ''),
      }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error([body?.error, body?.detail].filter(Boolean).join(' ') || 'Unable to send the broadcast.');
    }

    await logAdminActivity({
      action: notifyAdmins ? 'scheduled_broadcast_sent' : 'broadcast_sent',
      section: 'Newsletter',
      itemType: 'newsletter broadcast',
      itemLabel: subject,
      details: {
        recipient_count: activeRecipients.length,
        attachment_count: attachments?.length || 0,
        admin_notifications_sent: notifyAdmins,
      },
    });

    return body;
  };

  const uploadBroadcastAttachments = async (attachments = []) => {
    return Promise.all(attachments.map(async (attachment) => {
      if (attachment.file_url || attachment.fileUrl) {
        return normalizeBroadcastAttachment(attachment);
      }

      if (attachment.file) {
        const uploaded = await localApi.integrations.Core.UploadFile({
          file: attachment.file,
          destination: 'newsletterAttachment',
        });
        await logAdminActivity({
          action: 'uploaded',
          section: 'Newsletter',
          itemType: 'newsletter attachment',
          itemLabel: attachment.filename,
          details: {
            size: attachment.size || attachment.file.size || 0,
            content_type: attachment.contentType || attachment.file.type || '',
          },
        });

        return {
          filename: attachment.filename,
          contentType: attachment.contentType || attachment.file.type || '',
          size: attachment.size || attachment.file.size || 0,
          file_url: uploaded.file_url,
        };
      }

      return normalizeBroadcastAttachment(attachment);
    }));
  };

  const prepareBroadcastRecord = async ({ subject, message, attachments, recipientIds, status, scheduledAt }) => {
    const selectedRecipientIds = recipientIds || [];
    const storedAttachments = await uploadBroadcastAttachments(attachments || []);

    return {
      subject: subject.trim(),
      message: message.trim(),
      status,
      scheduled_at: scheduledAt || '',
      recipient_ids: selectedRecipientIds,
      recipient_count: selectedRecipientIds.length,
      attachments: storedAttachments.map(({ content: _content, file: _file, ...attachment }) => attachment),
      updated_date: new Date().toISOString(),
    };
  };

  const handleSaveNewsletterBroadcastDraft = async (data) => {
    const record = await prepareBroadcastRecord({ ...data, status: 'draft', scheduledAt: '' });
    if (data.id) {
      await NewsletterBroadcasts.update(data.id, record);
    } else {
      await NewsletterBroadcasts.create({ ...record, created_date: new Date().toISOString() });
    }
    await logAdminActivity({
      action: 'saved_draft',
      section: 'Newsletter',
      itemType: 'newsletter broadcast',
      itemId: data.id,
      itemLabel: record.subject,
      details: { recipient_count: record.recipient_count, attachment_count: record.attachments.length },
    });
    await loadNewsletterAdmin();
  };

  const handleScheduleNewsletterBroadcast = async (data) => {
    const record = await prepareBroadcastRecord({ ...data, status: 'scheduled' });
    if (!record.scheduled_at) throw new Error('Choose a schedule date and time.');
    if (data.id) {
      await NewsletterBroadcasts.update(data.id, record);
    } else {
      await NewsletterBroadcasts.create({ ...record, created_date: new Date().toISOString() });
    }
    await logAdminActivity({
      action: 'scheduled',
      section: 'Newsletter',
      itemType: 'newsletter broadcast',
      itemId: data.id,
      itemLabel: record.subject,
      details: {
        scheduled_at: record.scheduled_at,
        recipient_count: record.recipient_count,
        attachment_count: record.attachments.length,
      },
    });
    await loadNewsletterAdmin();
  };

  const handleMarkNewsletterBroadcastSent = async (id, result, sentData = {}) => {
    const sentFields = {
      status: result.failed ? 'partial' : 'sent',
      sent_at: new Date().toISOString(),
      sent_count: result.sent || 0,
      failed_count: result.failed || 0,
      updated_date: new Date().toISOString(),
    };

    if (id) {
      await NewsletterBroadcasts.update(id, sentFields);
    } else {
      const record = await prepareBroadcastRecord({ ...sentData, status: sentFields.status, scheduledAt: '' });
      await NewsletterBroadcasts.create({
        ...record,
        ...sentFields,
        created_date: new Date().toISOString(),
      });
    }
    await logAdminActivity({
      action: sentFields.status === 'partial' ? 'marked_partially_sent' : 'marked_sent',
      section: 'Newsletter',
      itemType: 'newsletter broadcast',
      itemId: id,
      itemLabel: sentData.subject || '',
      details: { sent_count: sentFields.sent_count, failed_count: sentFields.failed_count },
    });
    await loadNewsletterAdmin();
  };

  const handleAddNew = (type) => {
    setEditingItem(null);
    setFormView(type);
  };

  const handleEdit = (item, type) => {
    setEditingItem(item);
    setFormView(type);
  };

  const handleDelete = async (id, type) => {
    if (type === 'pastEvent') type = 'announcement';
    
    const entityMap = {
      announcement: { name: 'announcement', entity: AnnouncementsEvents },
      worshipEvent: { name: 'worship event', entity: WorshipEvent },
      sermon: { name: 'sermon', entity: Sermons },
      bulletin: { name: 'bulletin', entity: Bulletins },
      banner: { name: 'banner', entity: HomeBannerMessages },
      heroSlide: { name: 'hero slide', entity: HeroSlide },
      sitePopup: { name: 'homepage popup', entity: SitePopups },
    };

    const entityInfo = entityMap[type];
    if (!entityInfo) return;

    if (window.confirm(`Are you sure you want to delete this ${entityInfo.name}?`)) {
      try {
        await entityInfo.entity.delete(id);
        await logAdminActivity({
          action: 'deleted',
          section: FORM_LOG_META[type]?.section || 'Admin Content',
          itemType: entityInfo.name,
          itemId: id,
        });
        await refreshDataForType(type);
      } catch (error) {
        console.error(`Unable to delete ${entityInfo.name}:`, error);
        window.alert(`Unable to delete this ${entityInfo.name}. Please try again.`);
      }
    }
  };

  const handleDeleteSelectedHeroSlides = async (ids) => {
    if (!ids.length) return false;

    const slideLabel = ids.length === 1 ? 'hero slide' : 'hero slides';
    if (!window.confirm(`Are you sure you want to delete ${ids.length} selected ${slideLabel}?`)) {
      return false;
    }

    const results = await Promise.allSettled(ids.map((id) => HeroSlide.delete(id)));
    await loadHeroSlides();

    const failedDeletes = results.filter((result) => result.status === 'rejected');
    if (failedDeletes.length > 0) {
      console.error('Unable to delete some selected hero slides:', failedDeletes);
      window.alert(`${failedDeletes.length} selected ${failedDeletes.length === 1 ? 'hero slide was' : 'hero slides were'} not deleted. Please try again.`);
      return false;
    }

    await logAdminActivity({
      action: 'deleted',
      section: 'Hero Slideshow',
      itemType: slideLabel,
      itemId: ids.join(', '),
      itemLabel: `${ids.length} selected ${slideLabel}`,
    });
    return true;
  };

  const handleDuplicate = async (item, type) => {
    if (type === 'pastEvent') type = 'announcement';
    
    const entityMap = {
      announcement: { name: 'announcement', entity: AnnouncementsEvents },
      worshipEvent: { name: 'worship event', entity: WorshipEvent },
      sermon: { name: 'sermon', entity: Sermons },
      bulletin: { name: 'bulletin', entity: Bulletins },
      banner: { name: 'banner', entity: HomeBannerMessages },
      heroSlide: { name: 'hero slide', entity: HeroSlide },
      sitePopup: { name: 'homepage popup', entity: SitePopups },
    };

    const entityInfo = entityMap[type];
    if (!entityInfo) return;

    if (window.confirm(`Are you sure you want to duplicate this ${entityInfo.name}?`)) {
        const { id: _id, created_date: _createdDate, updated_date: _updatedDate, created_by: _createdBy, ...duplicatableData } = item;
        const duplicatedItem = {
            ...duplicatableData,
        };
        
        // Add [COPY] prefix to title or message field
        if (type === 'banner' && item.message) {
            duplicatedItem.message = `[COPY] ${item.message}`;
            duplicatedItem.status = 'inactive';
      } else if (item.title) {
          duplicatedItem.title = `[COPY] ${item.title}`;
      }
      if (type === 'sitePopup') {
          duplicatedItem.status = 'Inactive';
      }
        
        const duplicated = await entityInfo.entity.create(duplicatedItem);
        await logAdminActivity({
          action: 'duplicated',
          section: FORM_LOG_META[type]?.section || 'Admin Content',
          itemType: entityInfo.name,
          itemId: duplicated?.id,
          itemLabel: getItemLabel(type, duplicatedItem),
          details: { source_id: item.id || '' },
        });
        await refreshDataForType(type);
    }
  };
  
  const refreshDataForType = async (type) => {
    switch(type) {
      case 'announcement':
      case 'pastEvent':
        await loadAnnouncements();
        break;
      case 'worshipEvent':
        await loadWorshipEvents();
        break;
      case 'sermon':
        await loadSermons();
        break;
      case 'bulletin':
        await loadBulletins();
        break;
      case 'banner':
        await loadBanners();
        break;
      case 'heroSlide':
        await loadHeroSlides();
        break;
      case 'sitePopup':
        await loadSitePopups();
        break;
      default:
        break;
    }
  };

  const handleFormSubmit = async (formData) => {
    const isEditing = editingItem && editingItem.id && !editingItem.is_unsaved_fallback;
    const logMeta = FORM_LOG_META[formView] || { section: 'Admin Content', itemType: formView || 'item' };
    let savedItemId = isEditing ? editingItem.id : '';
    let savedItemCount = Array.isArray(formData) ? formData.length : 1;

    try {
        switch (formView) {
            case 'announcement':
                if (isEditing) {
                    await AnnouncementsEvents.update(editingItem.id, formData);
                } else {
                    const created = await AnnouncementsEvents.create(formData);
                    savedItemId = created?.id || '';
                }
                break;
            case 'worshipEvent':
                if (isEditing) {
                    await WorshipEvent.update(editingItem.id, formData);
                } else {
                    const created = await WorshipEvent.create(formData);
                    savedItemId = created?.id || '';
                }
                break;
            case 'sermon':
                if (isEditing) {
                    await Sermons.update(editingItem.id, formData);
                } else {
                    const created = await Sermons.create(formData);
                    savedItemId = created?.id || '';
                }
                break;
            case 'bulletin':
                // If the new/edited bulletin is set to "Current", update all other bulletins to "Past"
                if (formData.status === 'Current') {
                    // Get all current bulletins that are not the one being edited/created
                    const currentBulletins = bulletins.filter(b => 
                        b.status === 'Current' && (!isEditing || b.id !== editingItem.id)
                    );
                    
                    // Update all previous 'Current' bulletins to 'Past'
                    await Promise.all(
                        currentBulletins.map(bulletin => 
                            Bulletins.update(bulletin.id, { ...bulletin, status: 'Past' })
                        )
                    );
                }
                
                // Now create or update the bulletin
                if (isEditing) {
                    await Bulletins.update(editingItem.id, formData);
                } else {
                    const created = await Bulletins.create(formData);
                    savedItemId = created?.id || '';
                }
                break;
            case 'banner':
                if (isEditing) {
                    await HomeBannerMessages.update(editingItem.id, formData);
                } else {
                    const created = await HomeBannerMessages.create(formData);
                    savedItemId = created?.id || '';
                }
                break;
            case 'heroSlide':
                if (isEditing && Array.isArray(formData)) {
                    const [firstSlide, ...additionalSlides] = formData;
                    await HeroSlide.update(editingItem.id, firstSlide);
                    const createdSlides = await Promise.all(additionalSlides.map((slideData) => HeroSlide.create(slideData)));
                    savedItemId = [editingItem.id, ...createdSlides.map((slide) => slide?.id)].filter(Boolean).join(', ');
                } else if (isEditing) {
                    await HeroSlide.update(editingItem.id, formData);
                } else if (Array.isArray(formData)) {
                    const createdSlides = await Promise.all(formData.map((slideData) => HeroSlide.create(slideData)));
                    savedItemId = createdSlides.map((slide) => slide?.id).filter(Boolean).join(', ');
                } else {
                    const created = await HeroSlide.create(formData);
                    savedItemId = created?.id || '';
                }
                break;
            case 'sitePopup':
                if (isEditing) {
                    await SitePopups.update(editingItem.id, prepareSitePopupData(formData));
                } else {
                    const created = await SitePopups.create(prepareSitePopupData(formData));
                    savedItemId = created?.id || '';
                }
                break;
            default:
                console.error("Unknown form view:", formView);
                return;
        }

        await logAdminActivity({
          action: isEditing ? 'updated' : 'created',
          section: logMeta.section,
          itemType: logMeta.itemType,
          itemId: savedItemId,
          itemLabel: getItemLabel(formView, formData),
          details: {
            item_count: savedItemCount,
            status: Array.isArray(formData) ? '' : formData.status || '',
            image_url: Array.isArray(formData) ? '' : formData.image_url || formData.image_upload || '',
          },
        });
        await refreshDataForType(formView);
        setFormView(null);
        setEditingItem(null);

    } catch (error) {
        console.error("Error in handleFormSubmit:", error);
        window.alert(getSaveErrorMessage(error));
    }
  };

  const handleCancelForm = () => {
    setFormView(null);
    setEditingItem(null);
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSigningIn(true);
    setLoginError('');
    setLoginNotice('');
    try {
      const signedInUser = await User.signIn(loginEmail, loginPassword);
      await logAdminActivity({
        action: 'signed_in',
        section: 'Authentication',
        itemType: 'admin session',
        itemLabel: String(loginEmail || signedInUser?.email || '').trim().toLowerCase(),
        actor: signedInUser,
      });
      await checkUserAndLoadData();
    } catch (error) {
      setLoginError(error.message || 'Unable to sign in.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    window.clearTimeout(inactivityTimerRef.current);
    await logAdminActivity({
      action: 'signed_out',
      section: 'Authentication',
      itemType: 'admin session',
      itemLabel: currentAdmin?.email || '',
    });
    await User.logout();
    setIsAdmin(false);
    setCurrentAdmin(null);
    setAdminProfiles([]);
    setShowPrivacyNotice(false);
    setShowAdminNamePrompt(false);
    setEditingItem(null);
    setFormView(null);
    setLoginNotice('');
    setAdminLoadError('');
  };

  const handleCreateSiteAdmin = async ({ email }) => {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Please sign in again before creating a site administrator.');
    }

    const response = await fetch('/api/admin/create-site-admin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        host: window.location.host,
        protocol: window.location.protocol.replace(':', ''),
      }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error([body?.error, body?.detail].filter(Boolean).join(' ') || 'Unable to create the site administrator.');
    }

    await logAdminActivity({
      action: 'created_admin',
      section: 'Developer Panel',
      itemType: 'site administrator',
      itemId: body.uid,
      itemLabel: email,
      details: {
        invitation_email_sent: true,
        invitation_expires_at: body.expiresAt || '',
        name_collected_on_first_sign_in: true,
      },
    });
    await loadSiteAdminComparison();
    await loadAdminActivityLogs();
    return body;
  };

  const handleDeleteSiteAdmin = async (admin) => {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Please sign in again before deleting a site administrator.');
    }

    const response = await fetch(`/api/admin/site-admins/${encodeURIComponent(admin.uid)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error || 'Unable to delete the site administrator.');
    }

    await logAdminActivity({
      action: 'deleted_admin',
      section: 'Developer Panel',
      itemType: 'site administrator',
      itemId: admin.uid,
      itemLabel: body.email || admin.email || admin.auth_email || '',
      details: {
        removed_from_firestore: true,
        auth_user_deleted: false,
      },
    });
    await loadAdminProfiles(currentAdmin);
    await loadSiteAdminComparison();
    await loadAdminActivityLogs();
    return body;
  };

  const handlePrivacyNoticeScroll = () => {
    const node = privacyNoticeRef.current;
    if (!node) return;
    const reachedEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 8;
    if (reachedEnd) setPrivacyNoticeRead(true);
  };

  const handleAcknowledgePrivacyNotice = async () => {
    setShowPrivacyNotice(false);
    setPrivacyNoticeRead(false);
  };

  const handleSaveAdminName = async (event) => {
    event.preventDefault();
    const firstName = adminFirstNameInput.trim().replace(/\s+/g, ' ');
    const lastName = adminLastNameInput.trim().replace(/\s+/g, ' ');
    if (!firstName || !lastName || !currentAdmin?.id) return;

    setSavingAdminName(true);
    try {
      if (firebaseEnabled && firestore) {
        await updateDoc(doc(firestore, 'admins', currentAdmin.id), {
          first_name: firstName,
          last_name: lastName,
          email: currentAdmin.email,
          photo_url: currentAdmin.photo_url || '',
          updated_date: new Date().toISOString(),
        });
      }

      const updatedProfile = {
        ...currentAdmin,
        first_name: firstName,
        last_name: lastName,
        has_saved_name: true,
      };
      setCurrentAdmin(updatedProfile);
      setAdminProfiles((profiles) => profiles.map((profile) => (
        profile.id === updatedProfile.id ? updatedProfile : profile
      )));
      setShowAdminNamePrompt(false);
      setPrivacyNoticeRead(false);
      setShowPrivacyNotice(true);
      await logAdminActivity({
        action: 'updated',
        section: 'Admin Profile',
        itemType: 'admin profile',
        itemId: currentAdmin.id,
        itemLabel: `${firstName} ${lastName}`,
      });
    } catch (error) {
      console.error('Unable to save admin name:', error);
      window.alert(getSaveErrorMessage(error));
    } finally {
      setSavingAdminName(false);
    }
  };

  const handleAdminPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentAdmin?.id) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file.');
      return;
    }

    setUploadingAdminPhoto(true);
    try {
      const uploaded = await localApi.integrations.Core.UploadFile({
        file,
        destination: 'adminProfilePhoto',
      });
      const photoUrl = uploaded.file_url;

      if (firebaseEnabled && firestore) {
        await updateDoc(doc(firestore, 'admins', currentAdmin.id), {
          first_name: currentAdmin.first_name,
          last_name: currentAdmin.last_name,
          email: currentAdmin.email,
          photo_url: photoUrl,
          updated_date: new Date().toISOString(),
        });
      }

      const updatedProfile = { ...currentAdmin, photo_url: photoUrl };
      setCurrentAdmin(updatedProfile);
      setAdminProfiles((profiles) => profiles.map((profile) => (
        profile.id === updatedProfile.id ? updatedProfile : profile
      )));
      await logAdminActivity({
        action: 'uploaded',
        section: 'Admin Profile',
        itemType: 'admin profile photo',
        itemId: currentAdmin.id,
        itemLabel: file.name,
      });
    } catch (error) {
      console.error('Unable to upload admin profile photo:', error);
      window.alert(getSaveErrorMessage(error));
    } finally {
      setUploadingAdminPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center pt-20">
        <Loader2 className="w-12 h-12 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!isAdmin) {
    if (firebaseEnabled) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-start justify-center px-4 pt-8 pb-6">
          <form onSubmit={handleSignIn} className="w-full max-w-md space-y-4 bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">Admin Sign In</h1>
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2.5 text-sm">
              <p className="font-bold text-red-700">This area is for site administrators only.</p>
              <p className="mt-1 font-semibold text-red-700">Please contact the main web developer for admin sign-in details.</p>
            </div>
            {loginNotice && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {loginNotice}
              </div>
            )}
            <div>
              <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-1">Email<RequiredStar /></label>
              <Input id="admin_email" type="email" autoComplete="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700 mb-1">Password<RequiredStar /></label>
              <Input id="admin_password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={signingIn}>
              {signingIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center pt-20">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
            <p className="text-gray-600 mt-2">You must be an administrator to view this page.</p>
        </div>
      </div>
    );
  }

  // Split first, then sort each list independently
  // Filter by status for admin view
  const allPast = announcements.filter(item => item.status === 'Inactive');
  const allHidden = announcements.filter(item => item.status === 'Hidden');
  const allUpcomingAndUndated = announcements.filter(item => 
    item.status !== 'Inactive' && item.status !== 'Hidden'
  );

  // Sort PAST events: Newest-past first (descending)
  const pastAnnouncements = allPast.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Sort UPCOMING events: Soonest-upcoming first (ascending), with undated items last
  const upcomingAnnouncements = allUpcomingAndUndated.sort((a, b) => {
    const aHasDate = a.date && a.date.trim() !== '';
    const bHasDate = b.date && b.date.trim() !== '';

    if (aHasDate && !bHasDate) return -1; // Dated items first
    if (!aHasDate && bHasDate) return 1;  // Undated items last

    if (aHasDate && bHasDate) {
      return new Date(a.date) - new Date(b.date); // Soonest date first (ascending)
    }

    // Both are undated, sort by creation date (newest first)
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const otherAdminProfiles = adminProfiles.filter((profile) => profile.id !== currentAdmin?.id);


  const renderContent = () => {
    switch (formView) {
      case 'announcement':
        return <AnnouncementForm announcement={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
      case 'worshipEvent':
        return <WorshipEventForm event={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
      case 'sermon':
        return <SermonForm sermon={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
      case 'bulletin':
        return <BulletinForm bulletin={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
      case 'banner':
        return <BannerForm banner={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
      case 'heroSlide':
        return <HeroSlideForm
          slide={editingItem}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          onImageUpload={(upload) => logAdminActivity({
            action: 'uploaded',
            section: 'Hero Slideshow',
            itemType: 'hero image',
            itemLabel: upload.filenames?.join(', ') || `${upload.count} hero image upload`,
            details: {
              count: upload.count,
              filenames: upload.filenames || [],
            },
          })}
        />;
      case 'sitePopup':
        return <SitePopupForm popup={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
      default:
        break;
    }

    switch (view) {
      case 'announcements':
        return <AnnouncementList
          announcements={upcomingAnnouncements}
          onEdit={(item) => handleEdit(item, 'announcement')}
          onDelete={(id) => handleDelete(id, 'announcement')}
          onAddNew={() => handleAddNew('announcement')}
          onDuplicate={(item) => handleDuplicate(item, 'announcement')}
          title="Manage Announcements & Events"
          showAddNew={true}
        />;
      case 'worshipEvents':
        return <WorshipEventList
          events={worshipEvents}
          onEdit={(item) => handleEdit(item, 'worshipEvent')}
          onDelete={(id) => handleDelete(id, 'worshipEvent')}
          onAddNew={() => handleAddNew('worshipEvent')}
          onDuplicate={(item) => handleDuplicate(item, 'worshipEvent')}
        />;
      case 'pastEvents':
        return <AnnouncementList
          announcements={pastAnnouncements}
          onEdit={(item) => handleEdit(item, 'announcement')}
          onDelete={(id) => handleDelete(id, 'announcement')}
          onDuplicate={(item) => handleDuplicate(item, 'announcement')}
          title="Manage Past Events Gallery"
          showAddNew={false}
        />;
      case 'hiddenAnnouncements':
        return <AnnouncementList
          announcements={allHidden}
          onEdit={(item) => handleEdit(item, 'announcement')}
          onDelete={(id) => handleDelete(id, 'announcement')}
          onDuplicate={(item) => handleDuplicate(item, 'announcement')}
          title="Hidden Announcements"
          showAddNew={false}
        />;
      case 'sermons':
        return <SermonList
          sermons={sermons}
          onEdit={(item) => handleEdit(item, 'sermon')}
          onDelete={(id) => handleDelete(id, 'sermon')}
          onAddNew={() => handleAddNew('sermon')}
          onDuplicate={(item) => handleDuplicate(item, 'sermon')}
        />;
      case 'bulletins':
        return <BulletinList
          bulletins={bulletins}
          onEdit={(item) => handleEdit(item, 'bulletin')}
          onDelete={(id) => handleDelete(id, 'bulletin')}
          onAddNew={() => handleAddNew('bulletin')}
          onDuplicate={(item) => handleDuplicate(item, 'bulletin')}
        />;
      case 'banners':
        return <BannerList
          banners={banners}
          onEdit={(item) => handleEdit(item, 'banner')}
          onDelete={(id) => handleDelete(id, 'banner')}
          onAddNew={() => handleAddNew('banner')}
          onDuplicate={(item) => handleDuplicate(item, 'banner')}
        />;
      case 'heroSlides':
        return <HeroSlideList
          slides={heroSlides}
          onEdit={(item) => handleEdit(item, 'heroSlide')}
          onDelete={(id) => handleDelete(id, 'heroSlide')}
          onDeleteSelected={handleDeleteSelectedHeroSlides}
          onAddNew={() => handleAddNew('heroSlide')}
        />;
      case 'sitePopups':
        return <SitePopupList
          popups={sitePopups}
          onEdit={(item) => handleEdit(item, 'sitePopup')}
          onDelete={(id) => handleDelete(id, 'sitePopup')}
          onDuplicate={(item) => handleDuplicate(item, 'sitePopup')}
          onAddNew={() => handleAddNew('sitePopup')}
        />;
      case 'newsletter':
        return <NewsletterAdmin
          subscribers={newsletterSubscribers}
          templates={emailTemplates}
          broadcasts={newsletterBroadcasts}
          onAddSubscriber={handleAddNewsletterSubscriber}
          onDeleteSubscriber={handleDeleteNewsletterSubscriber}
          onSaveTemplate={handleSaveEmailTemplate}
          onSendTestEmail={handleSendNewsletterTestEmail}
          onSendBroadcast={handleSendNewsletterBroadcast}
          onSaveBroadcastDraft={handleSaveNewsletterBroadcastDraft}
          onScheduleBroadcast={handleScheduleNewsletterBroadcast}
          onMarkBroadcastSent={handleMarkNewsletterBroadcastSent}
        />;
      case 'developer':
        return canViewDeveloperPanel
          ? <DeveloperPanel
              logs={adminActivityLogs}
              admins={siteAdminComparison}
              loading={loadingDeveloperLogs || loadingSiteAdmins}
              onRefresh={async () => {
                await Promise.all([loadAdminActivityLogs(), loadSiteAdminComparison()]);
              }}
              onCreateAdmin={handleCreateSiteAdmin}
              onDeleteAdmin={handleDeleteSiteAdmin}
              canManageAdmins={canManageSiteAdmins}
              currentAdminEmail={currentAdmin?.email || ''}
            />
          : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-4 pb-12">
      {showAdminNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <form onSubmit={handleSaveAdminName} className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Admin Profile</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">Confirm Your Name</h2>
              <p className="mt-2 text-sm text-gray-600">
                This is a one-time setup. Your first name will be shown at the top of the admin panel when you sign in.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="admin_first_name" className="mb-1 block text-sm font-semibold text-gray-700">First Name<RequiredStar /></label>
                <Input
                  id="admin_first_name"
                  value={adminFirstNameInput}
                  onChange={(event) => setAdminFirstNameInput(event.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <label htmlFor="admin_last_name" className="mb-1 block text-sm font-semibold text-gray-700">Last Name<RequiredStar /></label>
                <Input
                  id="admin_last_name"
                  value={adminLastNameInput}
                  onChange={(event) => setAdminLastNameInput(event.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="mt-6 w-full bg-amber-600 hover:bg-amber-700" disabled={savingAdminName}>
              {savingAdminName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and Continue
            </Button>
          </form>
        </div>
      )}
      {showPrivacyNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/65 px-4 py-8 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b bg-[#4b342a] px-6 py-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Admin Privacy Notice</p>
              <h2 className="mt-1 text-2xl font-bold">Protecting Church Information</h2>
            </div>
            <div
              ref={privacyNoticeRef}
              onScroll={handlePrivacyNoticeScroll}
              className="max-h-[52vh] space-y-4 overflow-y-auto overscroll-contain px-6 py-5 text-sm leading-6 text-gray-700"
            >
              {ADMIN_PRIVACY_NOTICE.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <p className="font-semibold">Acknowledgement</p>
                <p className="mt-1">
                  Version {ADMIN_PRIVACY_NOTICE_VERSION}. Scroll to the end of this notice before continuing to the admin panel.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
              <p className="text-xs text-gray-500">
                {privacyNoticeRead ? 'Thank you. You may continue.' : 'Please scroll to the end to continue.'}
              </p>
              <Button onClick={handleAcknowledgePrivacyNotice} disabled={!privacyNoticeRead} className="bg-amber-600 hover:bg-amber-700">
                I Understand and Agree
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-5 overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-[#4b342a]" />
          <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <div className="rounded-full ring-2 ring-amber-200 ring-offset-2 ring-offset-white">
                  <AdminAvatar profile={currentAdmin} size="lg" />
                </div>
                <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-amber-600 text-white shadow-sm transition hover:bg-amber-700" title="Upload admin profile picture">
                  {uploadingAdminPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAdminPhotoUpload} disabled={uploadingAdminPhoto} />
                </label>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold leading-tight text-gray-950">Admin Panel</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {adminRoleLabel}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-gray-600">
                  Signed in as <span className="font-semibold text-gray-950">{currentAdmin?.first_name}</span>
                  {currentAdmin?.email ? <span className="text-gray-500"> - {currentAdmin.email}</span> : null}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                {otherAdminProfiles.length > 0 ? (
                  <>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Admin Team</p>
                      <p className="text-xs text-gray-600">{otherAdminProfiles.length} other admin{otherAdminProfiles.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex -space-x-2">
                      {otherAdminProfiles.slice(0, 6).map((profile) => (
                        <div key={profile.id} title={`${profile.first_name || 'Admin'} ${profile.last_name || ''}`.trim()}>
                          <AdminAvatar profile={profile} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <UserRound className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">No other admins shown</span>
                  </>
                )}
              </div>
              {firebaseEnabled && (
                <Button variant="outline" onClick={handleSignOut} className="gap-2 border-amber-200 bg-white hover:bg-amber-50">
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
        {adminLoadError && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {adminLoadError}
          </div>
        )}
        
        <div className="mb-8 flex justify-center flex-wrap gap-4 border-b pb-4">
          <Button
            variant={view === 'announcements' ? 'default' : 'outline'}
            onClick={() => { setView('announcements'); setFormView(null); }}
            className={`gap-2 ${view === 'announcements' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            <Megaphone className="w-5 h-5" /> Announcements & Events
          </Button>
          <Button
            variant={view === 'worshipEvents' ? 'default' : 'outline'}
            onClick={() => { setView('worshipEvents'); setFormView(null); }}
            className={`gap-2 ${view === 'worshipEvents' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            <CalendarHeart className="w-5 h-5" /> Calendar of Worship
          </Button>
          <Button
            variant={view === 'pastEvents' ? 'default' : 'outline'}
            onClick={() => { setView('pastEvents'); setFormView(null); }}
            className={`gap-2 ${view === 'pastEvents' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            <Images className="w-5 h-5" /> Past Events Gallery
          </Button>
          <Button
            variant={view === 'sermons' ? 'default' : 'outline'}
            onClick={() => { setView('sermons'); setFormView(null); }}
            className={`gap-2 ${view === 'sermons' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            <PlaySquare className="w-5 h-5" /> Sermons
          </Button>
          <Button
            variant={view === 'bulletins' ? 'default' : 'outline'}
            onClick={() => { setView('bulletins'); setFormView(null); }}
            className={`gap-2 ${view === 'bulletins' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            <FileText className="w-5 h-5" /> Worship Bulletins
          </Button>
          <Button
              variant={view === 'banners' ? 'default' : 'outline'}
              onClick={() => { setView('banners'); setFormView(null); }}
              className={`gap-2 ${view === 'banners' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <MessageSquare className="w-5 h-5" /> Homepage Banner
            </Button>
            <Button
              variant={view === 'hiddenAnnouncements' ? 'default' : 'outline'}
              onClick={() => { setView('hiddenAnnouncements'); setFormView(null); }}
              className={`gap-2 ${view === 'hiddenAnnouncements' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <EyeOff className="w-5 h-5" /> Hidden Announcements
            </Button>
            <Button
              variant={view === 'heroSlides' ? 'default' : 'outline'}
              onClick={() => { setView('heroSlides'); setFormView(null); }}
              className={`gap-2 ${view === 'heroSlides' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <LayoutTemplate className="w-5 h-5" /> Hero Slideshow
            </Button>
            <Button
              variant={view === 'sitePopups' ? 'default' : 'outline'}
              onClick={() => { setView('sitePopups'); setFormView(null); }}
              className={`gap-2 ${view === 'sitePopups' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <BellRing className="w-5 h-5" /> Homepage Popups
            </Button>
            <Button
              variant={view === 'newsletter' ? 'default' : 'outline'}
              onClick={() => { setView('newsletter'); setFormView(null); }}
              className={`gap-2 ${view === 'newsletter' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <Mail className="w-5 h-5" /> Newsletter
            </Button>
            {canViewDeveloperPanel && (
              <Button
                variant={view === 'developer' ? 'default' : 'outline'}
                onClick={() => { setView('developer'); setFormView(null); }}
                className={`gap-2 ${view === 'developer' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
              >
                <Code2 className="w-5 h-5" /> Developer Panel
              </Button>
            )}
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}
