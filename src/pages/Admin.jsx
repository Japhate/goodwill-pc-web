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
import LandingImageManager from '@/components/admin/LandingImageManager';
import SitePopupList from '@/components/admin/SitePopupList';
import SitePopupForm from '@/components/admin/SitePopupForm';
import NewsletterAdmin from '@/components/admin/NewsletterAdmin';
import DeveloperPanel from '@/components/admin/DeveloperPanel';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import { HeroSlide } from '@/entities/HeroSlide';
import { LandingImage } from '@/entities/LandingImage';
import { firebaseAuth, firebaseEnabled } from '@/lib/firebase';
import { localApi } from '@/api/localApiClient';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { DEFAULT_EMAIL_TEMPLATES } from '@/lib/newsletterTemplates';
import { createSpecialServicePopup } from '@/lib/specialServiceNotice';
import { Camera, CheckCircle2, XCircle, Loader2, ShieldAlert, CalendarHeart, PlaySquare, FileText, MessageSquare, LayoutTemplate, LogOut, BellRing, Mail, ShieldCheck, UserRound, Code2, Search, Grid2X2, List, Plus, Info, ChevronDown, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

const ADMIN_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_TOAST_DISMISS_MS = 3500;
const AUTO_LOGOUT_NOTICE_KEY = 'goodwill-admin-auto-logout';
const AUTO_LOGOUT_MESSAGE = 'You were logged out automatically due to inactivity.';
const ADMIN_VIEW_STORAGE_KEY = 'goodwill-admin-current-view';
const ADMIN_VIEWS = new Set([
  'worshipEvents',
  'sermons',
  'bulletins',
  'banners',
  'heroSlides',
  'sitePopups',
  'newsletter',
  'developer',
]);
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
const ADMIN_PRIVACY_NOTICE_VERSION = '2026-05-31';
const SITE_DEVELOPER_EMAIL = 'nebajaphate@gmail.com';
const ADMIN_ROLES = {
  SITE_ADMIN: 'site_admin',
  SITE_DEVELOPER: 'site_developer',
};
const LANDING_HERO_SLIDE_ID = 'hero-1';
const LANDING_HERO_IMAGE_URL = '/images/hero/goodwill-presbyterian-church-hero.png';
const FORM_LOG_META = {
  announcement: { section: 'Hero Slides & Announcements', itemType: 'announcement' },
  worshipEvent: { section: 'Calendar of Worship', itemType: 'worship event' },
  sermon: { section: 'Sermons', itemType: 'sermon' },
  bulletin: { section: 'Worship Bulletins', itemType: 'bulletin' },
  banner: { section: 'Homepage Banner', itemType: 'homepage banner' },
  heroSlide: { section: 'Hero Slides & Announcements', itemType: 'hero slide' },
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

function isLegacyLandingHeroSlide(slide) {
  const altText = String(slide?.alt_text || '').toLowerCase();
  return slide?.id === LANDING_HERO_SLIDE_ID
    || slide?.image_url === LANDING_HERO_IMAGE_URL
    || (altText.includes('welcome') && altText.includes('goodwill'));
}

function normalizeMatchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatAdminDate(value) {
  if (!value) return '';
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return String(value);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAdminTime(value) {
  if (!value) return '';
  const [hour = 0, minute = 0] = String(value).split(':').map(Number);
  const date = new Date(2000, 0, 1, hour || 0, minute || 0, 0);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getAdminRecurringStep(frequency = '') {
  const normalized = String(frequency).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('daily') || normalized.includes('every day') || normalized.includes('evening')) return 'daily';
  if (normalized.includes('weekday')) return 'weekday';
  if (normalized.includes('weekly') || normalized.includes('every week')) return 'weekly';
  if (normalized.includes('monthly') || normalized.includes('every month')) return 'monthly';
  if (normalized.includes('yearly') || normalized.includes('annually') || normalized.includes('annual')) return 'yearly';
  return null;
}

function advanceAdminRecurringDate(date, step) {
  const next = new Date(date);
  if (step === 'daily') next.setDate(next.getDate() + 1);
  if (step === 'weekday') {
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  }
  if (step === 'weekly') next.setDate(next.getDate() + 7);
  if (step === 'monthly') next.setMonth(next.getMonth() + 1);
  if (step === 'yearly') next.setFullYear(next.getFullYear() + 1);
  return next;
}

function getAdminEventDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const [hour = 0, minute = 0] = String(timeValue).split(':').map(Number);
  if (!year || !month || !day || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const date = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isAdminEventLiveNow(event, now = new Date()) {
  const start = getAdminEventDateTime(event?.date, event?.time);
  const step = getAdminRecurringStep(event?.frequency);
  const endDateForInstance = step ? event?.date : (event?.end_date || event?.date);
  let end = getAdminEventDateTime(endDateForInstance, event?.end_time);
  if (!start || !end) return false;

  let nextStart = start;
  let nextEnd = end;
  if (step) {
    const recurrenceEnd = getAdminEventDateTime(event?.end_date || event?.date, event?.end_time);
    let guard = 0;
    while (nextEnd <= now && guard < 370) {
      nextStart = advanceAdminRecurringDate(nextStart, step);
      nextEnd = advanceAdminRecurringDate(nextEnd, step);
      guard += 1;
    }
    if (recurrenceEnd && nextStart > recurrenceEnd) return false;
  }

  return now >= nextStart && now < nextEnd;
}

function isTimedBibleStudyBanner(banner) {
  return banner?.is_bible_study_live_banner === true;
}

const DEFAULT_YOUTUBE_LIVE_BANNER_MESSAGE = "📺 We’re Live! Come share this moment with us. Click the LIVE button to join.";

function isAutomaticYoutubeLiveBanner(banner) {
  return banner?.is_youtube_live_banner === true;
}

function getAutomaticBannerMessage(slide = {}, source = {}) {
  return String(source.live_banner_message || slide.live_banner_message || '').trim();
}

function getAdminScheduleLabel(event = {}) {
  const startDate = formatAdminDate(event.date);
  const endDate = event.end_date && event.end_date !== event.date ? formatAdminDate(event.end_date) : '';
  const startTime = formatAdminTime(event.time);
  const endTime = formatAdminTime(event.end_time);
  const frequency = String(event.frequency || '').trim();
  const dateLabel = [startDate, endDate].filter(Boolean).join(' - ');
  const timeLabel = [startTime, endTime].filter(Boolean).join(' - ');
  return [dateLabel, timeLabel, frequency].filter(Boolean).join(' | ') || 'No schedule';
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
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const role = profile.role || user.admin_role || user.role_key || (normalizedEmail === SITE_DEVELOPER_EMAIL ? ADMIN_ROLES.SITE_DEVELOPER : ADMIN_ROLES.SITE_ADMIN);
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
    role,
    role_label: role === ADMIN_ROLES.SITE_DEVELOPER ? 'Site Developer' : 'Site Admin',
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

function isSiteDeveloperAdmin(admin = {}) {
  const email = String(admin?.email || '').trim().toLowerCase();
  return admin?.role === ADMIN_ROLES.SITE_DEVELOPER || email === SITE_DEVELOPER_EMAIL;
}

function isRootSiteDeveloper(admin = {}) {
  return String(admin?.email || '').trim().toLowerCase() === SITE_DEVELOPER_EMAIL;
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

function getInitialAdminView() {
  if (typeof window === 'undefined') return 'heroSlides';
  const storedView = window.localStorage.getItem(ADMIN_VIEW_STORAGE_KEY);
  return ADMIN_VIEWS.has(storedView) ? storedView : 'heroSlides';
}

export default function AdminPage() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [worshipEvents, setWorshipEvents] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [banners, setBanners] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [landingImages, setLandingImages] = useState([]);
  const [sitePopups, setSitePopups] = useState([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [newsletterBroadcasts, setNewsletterBroadcasts] = useState([]);
  const [adminActivityLogs, setAdminActivityLogs] = useState([]);
  const [siteAdminComparison, setSiteAdminComparison] = useState([]);
  const [siteAdminLoadError, setSiteAdminLoadError] = useState('');
  const [loadingDeveloperLogs, setLoadingDeveloperLogs] = useState(false);
  const [loadingSiteAdmins, setLoadingSiteAdmins] = useState(false);
  const [view, setView] = useState(getInitialAdminView); // 'worshipEvents', 'sermons', 'bulletins', 'banners', 'heroSlides', 'sitePopups', 'newsletter', 'developer'
  const [formView, setFormView] = useState(null); // 'announcement', 'worshipEvent', 'sermon', 'bulletin', 'banner', 'heroSlide', 'sitePopup', or null
  const [editingItem, setEditingItem] = useState(null);
  const [activeHeroAnnouncementView, setActiveHeroAnnouncementView] = useState('grid');
  const [inactiveHeroAnnouncementView, setInactiveHeroAnnouncementView] = useState('grid');
  const [activeHeroAnnouncementSearchOpen, setActiveHeroAnnouncementSearchOpen] = useState(false);
  const [inactiveHeroAnnouncementSearchOpen, setInactiveHeroAnnouncementSearchOpen] = useState(false);
  const [activeHeroAnnouncementSearch, setActiveHeroAnnouncementSearch] = useState('');
  const [inactiveHeroAnnouncementSearch, setInactiveHeroAnnouncementSearch] = useState('');
  const [selectedActiveHeroSlideIds, setSelectedActiveHeroSlideIds] = useState([]);
  const [selectedInactiveHeroSlideIds, setSelectedInactiveHeroSlideIds] = useState([]);
  const [adminInstructionExpanded, setAdminInstructionExpanded] = useState(false);
  const [adminSectionMenuOpen, setAdminSectionMenuOpen] = useState(false);
  const [adminInstructionOverflows, setAdminInstructionOverflows] = useState(false);
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
  const [heroFormUnsavedDraft, setHeroFormUnsavedDraft] = useState({ isDirty: false, draft: null });
  const [pendingAdminTransition, setPendingAdminTransition] = useState(null);
  const [confirmationDialog, setConfirmationDialog] = useState(null);
  const [savingHeroDraft, setSavingHeroDraft] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [privacyNoticeRead, setPrivacyNoticeRead] = useState(false);
  const [showAdminNamePrompt, setShowAdminNamePrompt] = useState(false);
  const [adminFirstNameInput, setAdminFirstNameInput] = useState('');
  const [adminLastNameInput, setAdminLastNameInput] = useState('');
  const [savingAdminName, setSavingAdminName] = useState(false);
  const [uploadingAdminPhoto, setUploadingAdminPhoto] = useState(false);
  const inactivityTimerRef = useRef(null);
  const privacyNoticeRef = useRef(null);
  const adminInstructionRef = useRef(null);
  const adminContentTopRef = useRef(null);
  const confirmationResolverRef = useRef(null);
  const canViewDeveloperPanel = isSiteDeveloperAdmin(currentAdmin);
  const canManageSiteAdmins = isRootSiteDeveloper(currentAdmin);
  const adminRoleLabel = canManageSiteAdmins ? 'Site Developer' : 'Site Admin';
  const hasUnsavedHeroAnnouncementChanges = ['heroSlide', 'announcement'].includes(formView) && heroFormUnsavedDraft.isDirty;
  const adminSectionOptions = [
    { value: 'worshipEvents', label: 'Calendar of Worship', icon: CalendarHeart, instructions: 'Create and maintain worship services, special observances, dates, times, and worship calendar details.' },
    { value: 'sermons', label: 'Sermons', icon: PlaySquare, instructions: 'Manage sermon recordings, titles, dates, speakers, Scripture(s) references, and links for the Sermons page.' },
    { value: 'bulletins', label: 'Worship Bulletins', icon: FileText, instructions: 'Upload and organize worship bulletins so visitors can find current and previous service materials.' },
    { value: 'banners', label: 'Homepage Banner', icon: MessageSquare, instructions: 'Update the homepage banner message used for short, high-visibility notices and welcome information.' },
    { value: 'heroSlides', label: 'Hero Slides & Announcements', icon: LayoutTemplate, instructions: 'Use this section to manage the hero slides shown on the homepage and the announcements shown on the Updates page. You may drag and drop slide cards or use arrows to reorder. Review hidden or inactive slides and announcements, then restore or permanently delete them.' },
    { value: 'sitePopups', label: 'Homepage Popups', icon: BellRing, instructions: 'Create temporary homepage popups for urgent notices, service changes, and important church updates.' },
    { value: 'newsletter', label: 'Newsletter', icon: Mail, instructions: 'Manage newsletter subscribers, message templates, drafts, tests, scheduled sends, and broadcast history.' },
    ...(canViewDeveloperPanel ? [{ value: 'developer', label: 'Developer Panel', icon: Code2, instructions: 'Review admin activity, site administrators, and developer-only maintenance information.' }] : []),
  ];
  const selectedAdminSection = adminSectionOptions.find((option) => option.value === view) || adminSectionOptions[0];
  const SelectedAdminSectionIcon = selectedAdminSection?.icon || LayoutTemplate;
  const selectedAdminInstructions = selectedAdminSection?.instructions || '';
  const canExpandAdminInstructions = adminInstructionOverflows;

  const requestConfirmation = ({ title = 'Please confirm', description, confirmLabel = 'Confirm', tone = 'default' }) => (
    new Promise((resolve) => {
      confirmationResolverRef.current?.(false);
      confirmationResolverRef.current = resolve;
      setConfirmationDialog({ title, description, confirmLabel, tone });
    })
  );

  const resolveConfirmation = (confirmed) => {
    const resolve = confirmationResolverRef.current;
    confirmationResolverRef.current = null;
    setConfirmationDialog(null);
    resolve?.(confirmed);
  };

  const showSuccess = (message) => {
    const notification = toast({
      title: (
        <span className="flex items-center gap-2 text-emerald-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          Success
        </span>
      ),
      description: message,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xl',
    });
    window.setTimeout(notification.dismiss, ADMIN_TOAST_DISMISS_MS);
  };

  const showError = (message) => {
    const notification = toast({
      title: (
        <span className="flex items-center gap-2 text-red-950">
          <XCircle className="h-5 w-5 text-red-600" />
          Action failed
        </span>
      ),
      description: message,
      variant: 'destructive',
      className: 'border-red-700 bg-red-600 text-white shadow-xl',
    });
    window.setTimeout(notification.dismiss, ADMIN_TOAST_DISMISS_MS);
  };

  const requestAdminTransition = (transition) => {
    if (hasUnsavedHeroAnnouncementChanges) {
      setPendingAdminTransition(() => transition);
      return;
    }
    transition();
  };

  const completePendingAdminTransition = () => {
    const transition = pendingAdminTransition;
    setPendingAdminTransition(null);
    setHeroFormUnsavedDraft({ isDirty: false, draft: null });
    if (typeof transition === 'function') transition();
  };

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
      if (isSiteDeveloperAdmin(actor)) {
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
      setSiteAdminLoadError('');
      return;
    }

    const currentDeveloperAdmin = currentAdmin ? {
      uid: currentAdmin.id || firebaseAuth?.currentUser?.uid || '',
      email: String(currentAdmin.email || SITE_DEVELOPER_EMAIL).trim().toLowerCase(),
      first_name: currentAdmin.first_name || currentAdmin.firstName || '',
      last_name: currentAdmin.last_name || currentAdmin.lastName || '',
      has_saved_name: Boolean((currentAdmin.first_name || currentAdmin.firstName) && (currentAdmin.last_name || currentAdmin.lastName)),
      created_date: currentAdmin.created_date || '',
      updated_date: currentAdmin.updated_date || '',
      role: ADMIN_ROLES.SITE_DEVELOPER,
      role_label: 'Site Developer',
    } : null;

    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) {
      setSiteAdminComparison(currentDeveloperAdmin ? [currentDeveloperAdmin] : []);
      setSiteAdminLoadError('Signed in, but the developer session token was not available. Refresh the page and try again.');
      return;
    }

    setLoadingSiteAdmins(true);
    setSiteAdminLoadError('');
    try {
      const response = await fetch('/api/admin/site-admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Unable to load site administrators.');
      const admins = Array.isArray(body?.admins) ? body.admins : [];
      const hasCurrentDeveloper = currentDeveloperAdmin && admins.some((admin) => (
        String(admin.uid || '') === String(currentDeveloperAdmin.uid || '')
        || String(admin.email || '').trim().toLowerCase() === currentDeveloperAdmin.email
      ));
      setSiteAdminComparison(currentDeveloperAdmin && !hasCurrentDeveloper
        ? [currentDeveloperAdmin, ...admins]
        : admins);
    } catch (error) {
      console.error('Unable to compare site administrators:', error);
      setSiteAdminComparison(currentDeveloperAdmin ? [currentDeveloperAdmin] : []);
      setSiteAdminLoadError(error.message || 'Unable to load the full site administrator list.');
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
      ['landing image', loadLandingImages],
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
    if (typeof window === 'undefined') return;
    if (ADMIN_VIEWS.has(view)) {
      window.localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, view);
    }
  }, [view]);

  useEffect(() => {
    if (view === 'developer' && currentAdmin && !canViewDeveloperPanel) {
      setView('heroSlides');
      setFormView(null);
    }
  }, [view, currentAdmin, canViewDeveloperPanel]);

  useEffect(() => {
    const checkInstructionOverflow = () => {
      const node = adminInstructionRef.current;
      if (!node) return;

      const computedStyle = window.getComputedStyle(node);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 16;
      const maxCollapsedHeight = lineHeight * 2 + 1;
      const measureNode = node.cloneNode(true);
      measureNode.classList.remove('line-clamp-2');
      measureNode.style.position = 'absolute';
      measureNode.style.visibility = 'hidden';
      measureNode.style.pointerEvents = 'none';
      measureNode.style.width = `${node.clientWidth}px`;
      measureNode.style.height = 'auto';
      measureNode.style.maxHeight = 'none';
      measureNode.style.overflow = 'visible';
      measureNode.style.webkitLineClamp = 'unset';
      measureNode.style.display = 'block';
      document.body.appendChild(measureNode);
      const fullTextHeight = measureNode.scrollHeight;
      document.body.removeChild(measureNode);

      setAdminInstructionOverflows(fullTextHeight > maxCollapsedHeight);
    };

    const animationFrame = window.requestAnimationFrame(checkInstructionOverflow);
    const timeout = window.setTimeout(checkInstructionOverflow, 250);
    document.fonts?.ready?.then(checkInstructionOverflow).catch(() => {});
    window.addEventListener('resize', checkInstructionOverflow);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
      window.removeEventListener('resize', checkInstructionOverflow);
    };
  }, [selectedAdminInstructions, adminInstructionExpanded]);

  useEffect(() => {
    if (!hasUnsavedHeroAnnouncementChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedHeroAnnouncementChanges]);

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
    setSiteAdminLoadError('');
    if (view === 'developer') {
      setView('heroSlides');
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
    let data = await HomeBannerMessages.list('-created_date', 100);

    if (data.length === 0) {
      const legacyBanners = await LegacyBanner.list('-created_date', 100);
      if (legacyBanners.length > 0) {
        data = await Promise.all(
          legacyBanners.map(({ id: _id, ...banner }, index) => HomeBannerMessages.create({
            ...banner,
            order: banner.order ?? index + 1,
          }))
        );
      }
    }

    const timedBibleStudyBanners = data.filter(isTimedBibleStudyBanner);
    if (timedBibleStudyBanners.length > 0) {
      await Promise.allSettled(timedBibleStudyBanners.map((banner) => HomeBannerMessages.delete(banner.id)));
    }

    data = data.filter((banner) => !isTimedBibleStudyBanner(banner));

    if (!data.some(isAutomaticYoutubeLiveBanner)) {
      const youtubeLiveBanner = await HomeBannerMessages.create({
        message: DEFAULT_YOUTUBE_LIVE_BANNER_MESSAGE,
        status: 'active',
        is_youtube_live_banner: true,
        order: 0,
      });
      data = [youtubeLiveBanner, ...data];
    }

    setBanners(data);
  };

  const loadHeroSlides = async () => {
    const data = await HeroSlide.list('order', 50);
    setHeroSlides(data.filter((slide) => !isLegacyLandingHeroSlide(slide)));
  };

  const loadLandingImages = async () => {
    const data = await LandingImage.list('-updated_date', 10);
    setLandingImages(data);
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
      const emailKey = encodeURIComponent(normalizedEmail);
      const unsubscribeToken = createUnsubscribeToken();

      await NewsletterSubscriptions.create({
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        email: normalizedEmail,
        email_key: emailKey,
        unsubscribe_token: unsubscribeToken,
        status: 'active',
      });

      let welcomeEmailSent = false;
      let welcomeEmailError = '';
      try {
        const welcomeResponse = await fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            emailKey,
            unsubscribeToken,
            host: window.location.host,
            protocol: window.location.protocol.replace(':', ''),
          }),
        });

        if (!welcomeResponse.ok) {
          welcomeEmailError = await getApiErrorMessage(welcomeResponse, 'The welcome email could not be sent.');
        } else {
          welcomeEmailSent = true;
        }
      } catch (error) {
        welcomeEmailError = `The welcome email request failed: ${error.message}`;
      }

      await logAdminActivity({
        action: 'created',
        section: 'Newsletter',
        itemType: 'newsletter subscriber',
        itemLabel: normalizedEmail,
        details: {
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          welcome_email_sent: welcomeEmailSent,
          welcome_email_error: welcomeEmailError,
        },
      });
      await loadNewsletterAdmin();
      if (welcomeEmailError) {
        showError(`Subscriber added, but ${welcomeEmailError}`);
      } else {
        showSuccess('The newsletter subscriber was added successfully.');
      }
    } catch (error) {
      console.error('Unable to add newsletter subscriber:', error);
      if (error?.message === 'already-subscribed' || error?.status === 409) {
        showError('That email address is already subscribed.');
        return;
      }
      showError(getSaveErrorMessage(error));
    }
  };

  const handleDeleteNewsletterSubscriber = async (id) => {
    if (!await requestConfirmation({
      title: 'Remove subscriber?',
      description: 'This email address will be removed from the newsletter list.',
      confirmLabel: 'Remove subscriber',
      tone: 'danger',
    })) return;

    try {
      await NewsletterSubscriptions.delete(id);
      await logAdminActivity({
        action: 'deleted',
        section: 'Newsletter',
        itemType: 'newsletter subscriber',
        itemId: id,
      });
      await loadNewsletterAdmin();
      showSuccess('The newsletter subscriber was removed successfully.');
    } catch (error) {
      console.error('Unable to delete newsletter subscriber:', error);
      showError(getSaveErrorMessage(error));
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
      showError(getSaveErrorMessage(error));
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

  const handleDeleteNewsletterBroadcast = async (id, broadcast = {}) => {
    await NewsletterBroadcasts.delete(id);
    await logAdminActivity({
      action: 'deleted',
      section: 'Newsletter',
      itemType: 'newsletter broadcast',
      itemId: id,
      itemLabel: broadcast.subject || '',
      details: {
        status: broadcast.status || 'draft',
        recipient_count: broadcast.recipient_count || broadcast.recipient_ids?.length || broadcast.sent_count || 0,
        attachment_count: broadcast.attachments?.length || 0,
      },
    });
    await loadNewsletterAdmin();
  };

  const handleAddNew = (type) => {
    requestAdminTransition(() => {
      setEditingItem(null);
      setHeroFormUnsavedDraft({ isDirty: false, draft: null });
      setFormView(type);
    });
  };

  const handleEdit = (item, type) => {
    requestAdminTransition(() => {
      setEditingItem(item);
      setHeroFormUnsavedDraft({ isDirty: false, draft: null });
      setFormView(type);
      if (type === 'bulletin') {
        window.requestAnimationFrame(() => {
          adminContentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
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

    const confirmed = await requestConfirmation({
      title: `Delete this ${entityInfo.name}?`,
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await entityInfo.entity.delete(id);
      await logAdminActivity({
        action: 'deleted',
        section: FORM_LOG_META[type]?.section || 'Admin Content',
        itemType: entityInfo.name,
        itemId: id,
      });
      await refreshDataForType(type);
      showSuccess(type === 'heroSlide'
        ? 'Slide data with its corresponding announcement and banner were deleted successfully.'
        : `The ${entityInfo.name} was deleted successfully.`);
    } catch (error) {
      console.error(`Unable to delete ${entityInfo.name}:`, error);
      showError(`Unable to delete this ${entityInfo.name}. Please try again.`);
    }
  };

  const handleDeleteSelectedHeroSlides = async (ids) => {
    if (!ids.length) return false;

    const slideLabel = ids.length === 1 ? 'hero slide' : 'hero slides';
    if (!await requestConfirmation({
      title: `Delete ${ids.length} selected ${slideLabel}?`,
      description: 'Linked announcements and managed images that are no longer used will also be deleted. This action cannot be undone.',
      confirmLabel: ids.length === 1 ? 'Delete slide' : 'Delete slides',
      tone: 'danger',
    })) {
      return false;
    }

    const results = [];
    for (const id of ids) {
      try {
        results.push({ status: 'fulfilled', value: await HeroSlide.delete(id) });
      } catch (reason) {
        results.push({ status: 'rejected', reason });
      }
    }
    await Promise.all([loadHeroSlides(), loadAnnouncements()]);

    const failedDeletes = results.filter((result) => result.status === 'rejected');
    if (failedDeletes.length > 0) {
      console.error('Unable to delete some selected hero slides:', failedDeletes);
      showError(`${failedDeletes.length} selected ${failedDeletes.length === 1 ? 'hero slide was' : 'hero slides were'} not deleted. Please try again.`);
      return false;
    }

    await logAdminActivity({
      action: 'deleted',
      section: 'Hero Slides & Announcements',
      itemType: slideLabel,
      itemId: ids.join(', '),
      itemLabel: `${ids.length} selected ${slideLabel}`,
    });
    showSuccess(ids.length === 1
      ? 'Slide data with its corresponding announcement and banner were deleted successfully.'
      : `${ids.length} slides and their corresponding announcements and banners were deleted successfully.`);
    return true;
  };

  const handleSetHeroSlideVisibility = async (ids, isActive) => {
    if (!ids.length) return false;

    const slideLabel = ids.length === 1 ? 'hero slide' : 'hero slides';
    const actionLabel = isActive ? 'restore' : 'hide';
    const confirmMessage = isActive
      ? `Restore ${ids.length} selected ${slideLabel} to the homepage slideshow?`
      : `Hide ${ids.length} selected ${slideLabel} from the homepage slideshow? The images will stay saved for reuse.`;

    if (!await requestConfirmation({
      title: isActive ? `Restore ${ids.length} ${slideLabel}?` : `Hide ${ids.length} ${slideLabel}?`,
      description: confirmMessage,
      confirmLabel: isActive ? 'Restore' : 'Hide',
      tone: isActive ? 'default' : 'warning',
    })) {
      return false;
    }

    const slidesById = new Map(heroSlides.map((slide) => [String(slide.id), slide]));
    const lastActiveHeroSlideOrder = heroSlides
      .filter((slide) => slide.is_active !== false)
      .reduce((maxOrder, slide) => Math.max(maxOrder, Number(slide.order) || 0), 0);
    const results = await Promise.allSettled(ids.map((id) => {
      const slide = slidesById.get(String(id));
      if (!slide) throw new Error(`Hero slide ${id} was not found.`);
      const { id: _id, ...slideData } = slide;
      const restoredIndex = ids.findIndex((selectedId) => String(selectedId) === String(id));
      const restoredOrder = isActive ? lastActiveHeroSlideOrder + restoredIndex + 1 : slideData.order;
      return HeroSlide.update(id, { ...slideData, is_active: isActive, order: restoredOrder });
    }));
    const selectedSlides = ids.map((id) => slidesById.get(String(id))).filter(Boolean);
    const linkedAnnouncementIds = Array.from(new Set(selectedSlides.map((slide) => {
          if (slide.announcement_id) return String(slide.announcement_id);

          const slideTitle = normalizeMatchText(slide.alt_text);
          if (!slideTitle) return "";

          const matchedAnnouncement = announcements.find((announcement) => {
            const announcementTitle = normalizeMatchText(announcement.title);
            return announcementTitle && (
              announcementTitle === slideTitle
              || announcementTitle.includes(slideTitle)
              || slideTitle.includes(announcementTitle)
            );
          });
          return matchedAnnouncement?.id ? String(matchedAnnouncement.id) : "";
        }).filter(Boolean)));
    const announcementResults = await Promise.allSettled(linkedAnnouncementIds.map((announcementId) => {
      const announcement = announcements.find((item) => String(item.id) === String(announcementId));
      if (!announcement) throw new Error(`Announcement ${announcementId} was not found.`);
      const { id: _id, ...announcementData } = announcement;
      return AnnouncementsEvents.update(announcementId, {
        ...announcementData,
        status: isActive ? 'Active' : 'Hidden',
      });
    }));

    await loadHeroSlides();
    if (linkedAnnouncementIds.length > 0) {
      await loadAnnouncements();
    }

    const failedUpdates = results.filter((result) => result.status === 'rejected');
    const failedAnnouncementUpdates = announcementResults.filter((result) => result.status === 'rejected');
    if (failedUpdates.length > 0 || failedAnnouncementUpdates.length > 0) {
      console.error(`Unable to ${actionLabel} some selected hero slides or announcements:`, { failedUpdates, failedAnnouncementUpdates });
      const messages = [];
      if (failedUpdates.length > 0) {
        messages.push(`${failedUpdates.length} selected ${failedUpdates.length === 1 ? 'hero slide was' : 'hero slides were'} not updated`);
      }
      if (failedAnnouncementUpdates.length > 0) {
        messages.push(`${failedAnnouncementUpdates.length} linked ${failedAnnouncementUpdates.length === 1 ? 'announcement was' : 'announcements were'} not hidden`);
      }
      showError(`${messages.join(' and ')}. Please try again.`);
      return false;
    }

    await logAdminActivity({
      action: isActive ? 'restored' : 'hidden',
      section: 'Hero Slides & Announcements',
      itemType: slideLabel,
      itemId: ids.join(', '),
      itemLabel: `${ids.length} selected ${slideLabel}`,
      details: { is_active: isActive, linkedAnnouncementIds },
    });

    showSuccess(isActive
      ? `${ids.length === 1 ? 'The slide' : `${ids.length} slides`} and linked content were restored successfully.`
      : `${ids.length === 1 ? 'The slide' : `${ids.length} slides`} and linked content were hidden successfully.`);

    return true;
  };

  const handleSetAnnouncementVisibility = async (id, status) => {
    const announcement = announcements.find((item) => String(item.id) === String(id));
    if (!announcement) return false;

    const isRestoring = status !== 'Hidden';
    const confirmMessage = isRestoring
      ? 'Restore this announcement or event so it appears on the Updates page?'
      : 'Move this announcement or event to the hidden section? It will stay saved for reuse.';

    if (!await requestConfirmation({
      title: isRestoring ? 'Restore announcement?' : 'Hide announcement?',
      description: confirmMessage,
      confirmLabel: isRestoring ? 'Restore' : 'Hide',
      tone: isRestoring ? 'default' : 'warning',
    })) {
      return false;
    }

    try {
      const { id: _id, ...announcementData } = announcement;
      const linkedSlides = heroSlides.filter((slide) =>
        String(slide.announcement_id || '') === String(id)
      );
      await AnnouncementsEvents.update(id, { ...announcementData, status });
      await Promise.all(linkedSlides.map((slide) => {
        const { id: slideId, ...slideData } = slide;
        return HeroSlide.update(slideId, { ...slideData, is_active: isRestoring });
      }));
      await logAdminActivity({
        action: isRestoring ? 'restored' : 'hidden',
        section: 'Hero Slides & Announcements',
        itemType: 'announcement',
        itemId: id,
        itemLabel: announcement.title || '',
        details: { status },
      });
      await Promise.all([loadAnnouncements(), loadHeroSlides()]);
      showSuccess(isRestoring
        ? 'The announcement and its corresponding slide and banner were restored successfully.'
        : 'The announcement and its corresponding slide and banner were hidden successfully.');
      return true;
    } catch (error) {
      console.error('Unable to update announcement visibility:', error);
      showError('Unable to update this announcement or event. Please try again.');
      return false;
    }
  };

  const handleReorderVisibleHeroSlides = async (orderedVisibleSlides) => {
    const hiddenSlides = heroSlides.filter((slide) => slide.is_active === false);
    const reorderedVisibleSlides = orderedVisibleSlides.map((slide, index) => ({
      ...slide,
      order: index + 1,
    }));

    setHeroSlides([...reorderedVisibleSlides, ...hiddenSlides]);

    try {
      await Promise.all(reorderedVisibleSlides.map((slide) => {
        const { id, ...slideData } = slide;
        return HeroSlide.update(id, slideData);
      }));

      await logAdminActivity({
        action: 'reordered',
        section: 'Hero Slides & Announcements',
        itemType: 'hero slides',
        itemLabel: `${reorderedVisibleSlides.length} visible hero slides`,
        details: {
          order: reorderedVisibleSlides.map((slide) => ({
            id: slide.id,
            order: slide.order,
            label: slide.alt_text || '',
          })),
        },
      });
      await loadHeroSlides();
    } catch (error) {
      console.error('Unable to reorder hero slides:', error);
      showError('Unable to save the new hero slide order. Please try again.');
      await loadHeroSlides();
    }
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

    if (await requestConfirmation({
      title: `Duplicate this ${entityInfo.name}?`,
      description: 'A separate copy will be created for you to edit.',
      confirmLabel: 'Duplicate',
    })) {
        const { id: _id, created_date: _createdDate, updated_date: _updatedDate, created_by: _createdBy, ...duplicatableData } = item;
        const duplicatedItem = {
            ...duplicatableData,
        };
        
        // Add [COPY] prefix to title or message field
        if (type === 'banner' && item.message) {
            duplicatedItem.message = `[COPY] ${item.message}`;
            duplicatedItem.status = 'inactive';
            delete duplicatedItem.is_bible_study_live_banner;
            delete duplicatedItem.is_youtube_live_banner;
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
        showSuccess(`The ${entityInfo.name} was duplicated successfully.`);
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
        await Promise.all([loadHeroSlides(), loadAnnouncements()]);
        break;
      case 'sitePopup':
        await loadSitePopups();
        break;
      default:
        break;
    }
  };

  const handleFormSubmit = async (formData, options = {}) => {
    const isEditing = editingItem && editingItem.id && !editingItem.is_unsaved_fallback;
    const isDraftSave = options.asDraft === true;
    const logMeta = FORM_LOG_META[formView] || { section: 'Admin Content', itemType: formView || 'item' };
    let savedItemId = isEditing ? editingItem.id : '';
    let savedItemCount = Array.isArray(formData) ? formData.length : 1;

    try {
        const stripEntityId = ({ id: _id, ...data } = {}) => data;
        const syncAnnouncementImageFromSlide = async (announcementId, imageUrl) => {
            if (!announcementId || !imageUrl) return;
            const announcement = announcements.find((item) => String(item.id) === String(announcementId));
            if (!announcement || announcement.image_upload === imageUrl) return;
            const { id: _id, ...announcementData } = announcement;
            await AnnouncementsEvents.update(announcementId, {
                ...announcementData,
                image_upload: imageUrl,
            });
        };

        const saveHeroAnnouncementPair = async (payload) => {
            const slideImageUrl = payload.slide?.image_url || "";
            const announcementData = {
                ...stripEntityId(payload.announcement || {}),
                ...(slideImageUrl ? { image_upload: slideImageUrl } : {}),
            };
            let announcementId = payload.announcement?.id || payload.slide?.announcement_id || '';

            if (!announcementId && formView === 'announcement' && isEditing) {
                announcementId = editingItem.id;
            }

            if (announcementId) {
                await AnnouncementsEvents.update(announcementId, announcementData);
            } else {
                const createdAnnouncement = await AnnouncementsEvents.create(announcementData);
                announcementId = createdAnnouncement?.id || '';
            }

            if (payload.slide?.image_url) {
                const slideData = stripEntityId(payload.slide);
                const slideId = payload.slide?.id || (formView === 'heroSlide' && isEditing ? editingItem.id : '');
                const preparedSlideData = {
                    ...slideData,
                    announcement_id: announcementId,
                };

                if (slideId) {
                    await HeroSlide.update(slideId, preparedSlideData);
                } else {
                    await HeroSlide.create(preparedSlideData);
                }
            }

            return announcementId;
        };

        const prepareHeroSlideData = async (submittedData) => {
            const slides = Array.isArray(submittedData) ? submittedData : [submittedData];
            const draftSource = slides.find((slide) => slide.related_announcement_draft?.create);
            let createdAnnouncementId = '';

            if (draftSource?.related_announcement_draft) {
                const draft = draftSource.related_announcement_draft;
                const createdAnnouncementIds = await Promise.all(
                    slides.map(async (slide) => {
                        if (slide.announcement_id) return slide.announcement_id;
                        const createdAnnouncement = await AnnouncementsEvents.create({
                            title: String(draft.title || '').trim(),
                            content: String(draft.content || '').trim(),
                            live_banner_message: draft.live_banner_message || '',
                            date: draft.date || '',
                            end_date: draft.end_date || '',
                            time: draft.time || '',
                            end_time: draft.end_time || '',
                            frequency: draft.frequency || '',
                            location_type: draft.location_type || 'physical',
                            location: draft.location || '',
                            virtual_platform: draft.virtual_platform || '',
                            zoom_link: draft.zoom_link || '',
                            chat_link: draft.chat_link || '',
                            one_tap_mobile: draft.one_tap_mobile || '',
                            call_in_numbers: draft.call_in_numbers || '',
                            meeting_id: draft.meeting_id || '',
                            meeting_passcode: draft.meeting_passcode || '',
                            contact_email: draft.contact_email || '',
                            contact_phone: draft.contact_phone || '',
                            directions_url: draft.directions_url || '',
                            file_upload: draft.file_upload || '',
                            file_label: draft.file_label || '',
                            category: draft.category || 'church_wide',
                            status: draft.status || 'Active',
                            image_upload: slide.image_url || '',
                            created_date: new Date().toISOString(),
                        });
                        return createdAnnouncement?.id || '';
                    })
                );
                const preparedSlides = slides.map(({ related_announcement_draft: _draft, ...slide }, index) => ({
                    ...slide,
                    announcement_id: createdAnnouncementIds[index] || slide.announcement_id || '',
                }));

                return Array.isArray(submittedData) ? preparedSlides : preparedSlides[0];
            }

            const preparedSlides = slides.map(({ related_announcement_draft: _draft, ...slide }) => ({
                ...slide,
                announcement_id: createdAnnouncementId || slide.announcement_id || '',
            }));

            return Array.isArray(submittedData) ? preparedSlides : preparedSlides[0];
        };

        switch (formView) {
            case 'announcement':
                if (formData.__announcement_only) {
                    const announcementData = formData.announcement || {};
                    if (isEditing) {
                        await AnnouncementsEvents.update(editingItem.id, announcementData);
                    } else {
                        const created = await AnnouncementsEvents.create(announcementData);
                        savedItemId = created?.id || '';
                    }
                    break;
                }
                if (formData.__hero_with_announcement) {
                    savedItemId = await saveHeroAnnouncementPair(formData);
                    break;
                }
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
                {
                if (formData.__announcement_only) {
                    const created = await AnnouncementsEvents.create(formData.announcement || {});
                    savedItemId = created?.id || '';
                    break;
                }
                if (formData.__hero_with_announcement) {
                    savedItemId = await saveHeroAnnouncementPair(formData);
                    break;
                }
                const preparedHeroData = await prepareHeroSlideData(formData);
                if (isEditing && Array.isArray(preparedHeroData)) {
                    const [firstSlide, ...additionalSlides] = preparedHeroData;
                    await HeroSlide.update(editingItem.id, firstSlide);
                    await syncAnnouncementImageFromSlide(firstSlide.announcement_id, firstSlide.image_url);
                    const createdSlides = await Promise.all(additionalSlides.map((slideData) => HeroSlide.create(slideData)));
                    await Promise.all(additionalSlides.map((slideData) => syncAnnouncementImageFromSlide(slideData.announcement_id, slideData.image_url)));
                    savedItemId = [editingItem.id, ...createdSlides.map((slide) => slide?.id)].filter(Boolean).join(', ');
                } else if (isEditing) {
                    await HeroSlide.update(editingItem.id, preparedHeroData);
                    await syncAnnouncementImageFromSlide(preparedHeroData.announcement_id, preparedHeroData.image_url);
                } else if (Array.isArray(preparedHeroData)) {
                    const createdSlides = await Promise.all(preparedHeroData.map((slideData) => HeroSlide.create(slideData)));
                    await Promise.all(preparedHeroData.map((slideData) => syncAnnouncementImageFromSlide(slideData.announcement_id, slideData.image_url)));
                    savedItemId = createdSlides.map((slide) => slide?.id).filter(Boolean).join(', ');
                } else {
                    const created = await HeroSlide.create(preparedHeroData);
                    await syncAnnouncementImageFromSlide(preparedHeroData.announcement_id, preparedHeroData.image_url);
                    savedItemId = created?.id || '';
                }
                formData = preparedHeroData;
                break;
                }
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
          action: isDraftSave ? 'saved_draft' : isEditing ? 'updated' : 'created',
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
        setHeroFormUnsavedDraft({ isDirty: false, draft: null });
        setFormView(null);
        setEditingItem(null);
        return true;

    } catch (error) {
        console.error("Error in handleFormSubmit:", error);
        showError(getSaveErrorMessage(error));
        return false;
    }
  };

  const handleCancelForm = () => {
    requestAdminTransition(() => {
      setFormView(null);
      setEditingItem(null);
      setHeroFormUnsavedDraft({ isDirty: false, draft: null });
    });
  };

  const handleSavePendingHeroDraft = async () => {
    if (!heroFormUnsavedDraft.draft) {
      showError('There is nothing draftable to save yet. Add a hero image or announcement details before saving a draft.');
      return;
    }

    setSavingHeroDraft(true);
    try {
      const saved = await handleFormSubmit(heroFormUnsavedDraft.draft, { asDraft: true });
      if (saved) {
        showSuccess('Draft saved. It is now in the Inactive Slides & Announcements section and will not show publicly.');
        completePendingAdminTransition();
      }
    } finally {
      setSavingHeroDraft(false);
    }
  };

  const handleDiscardPendingHeroDraft = () => {
    completePendingAdminTransition();
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
      itemType: 'site admin',
      itemId: body.uid,
      itemLabel: email,
      details: {
        role: ADMIN_ROLES.SITE_ADMIN,
        invitation_email_sent: true,
        invitation_expires_at: body.expiresAt || '',
        name_collected_on_first_sign_in: true,
      },
    });
    await loadSiteAdminComparison();
    await loadAdminActivityLogs();
    return body;
  };

  const handleUpdateSiteAdminRole = async (admin, role) => {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Please sign in again before changing this administrator role.');
    }

    const response = await fetch(`/api/admin/site-admins/${encodeURIComponent(admin.uid)}/role`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error || 'Unable to update this administrator role.');
    }

    await logAdminActivity({
      action: role === ADMIN_ROLES.SITE_DEVELOPER ? 'promoted' : 'demoted',
      section: 'Developer Panel',
      itemType: role === ADMIN_ROLES.SITE_DEVELOPER ? 'site developer' : 'site admin',
      itemId: admin.uid,
      itemLabel: admin.email || '',
      details: {
        previous_role: admin.role || '',
        role,
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
      showError(getSaveErrorMessage(error));
    } finally {
      setSavingAdminName(false);
    }
  };

  const handleAdminPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentAdmin?.id) return;
    if (!file.type.startsWith('image/')) {
      showError('Please choose an image file.');
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
      showError(getSaveErrorMessage(error));
    } finally {
      setUploadingAdminPhoto(false);
    }
  };

  if (loading) {
    return (
      <PageLoadingScreen backgroundClassName="bg-gray-100" />
    );
  }

  if (!isAdmin) {
    if (firebaseEnabled) {
      return (
      <div className="min-h-screen bg-gray-100 flex items-start justify-center px-4 pt-5 pb-4">
        <form onSubmit={handleSignIn} className="w-full max-w-md space-y-4 bg-white p-5 rounded-lg shadow-md">
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
          <div className="text-center p-5 bg-white rounded-lg shadow-md">
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
  // Sort PAST events: Newest-past first (descending)
  const pastAnnouncements = allPast.sort((a, b) => new Date(b.date) - new Date(a.date));
  const inactiveAnnouncements = [...allHidden, ...pastAnnouncements];
  const linkedAnnouncementIds = new Set(
    heroSlides
      .map((slide) => slide.announcement_id)
      .filter(Boolean)
      .map(String)
  );
  const standaloneInactiveAnnouncements = inactiveAnnouncements.filter((announcement) =>
    !linkedAnnouncementIds.has(String(announcement.id))
  );

  const otherAdminProfiles = adminProfiles.filter((profile) => profile.id !== currentAdmin?.id);
  const nextHeroSlideOrder = heroSlides
    .filter((slide) => slide.is_active !== false)
    .reduce((maxOrder, slide) => Math.max(maxOrder, Number(slide.order) || 0), 0) + 1;
  const activeHeroSlideCount = heroSlides.filter((slide) => slide.is_active !== false).length;
  const inactiveHeroSlideCount = heroSlides.filter((slide) => slide.is_active === false).length;
  const activeHeroAnnouncementItemCount = activeHeroSlideCount;
  const inactiveHeroAnnouncementItemCount = inactiveHeroSlideCount + standaloneInactiveAnnouncements.length;
  const filterHeroSlidesByAdminSearch = (slidesToFilter, isActive, searchTerm) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return slidesToFilter.filter((slide) => {
      const matchesState = isActive ? slide.is_active !== false : slide.is_active === false;
      if (!matchesState) return false;
      if (!normalizedSearch) return true;

      return [
        slide.alt_text,
        slide.link_label,
        slide.link_url,
        slide.image_url,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  };
  const activeHeroSlidesForSelection = filterHeroSlidesByAdminSearch(heroSlides, true, activeHeroAnnouncementSearch);
  const inactiveHeroSlidesForSelection = filterHeroSlidesByAdminSearch(heroSlides, false, inactiveHeroAnnouncementSearch);
  const activeHeroSlideSelectionSet = new Set(activeHeroSlidesForSelection.map((slide) => slide.id));
  const inactiveHeroSlideSelectionSet = new Set(inactiveHeroSlidesForSelection.map((slide) => slide.id));
  const selectedActiveHeroSlideIdsInView = selectedActiveHeroSlideIds.filter((id) => activeHeroSlideSelectionSet.has(id));
  const selectedInactiveHeroSlideIdsInView = selectedInactiveHeroSlideIds.filter((id) => inactiveHeroSlideSelectionSet.has(id));
  const allActiveHeroSlidesSelected = activeHeroSlidesForSelection.length > 0 && selectedActiveHeroSlideIdsInView.length === activeHeroSlidesForSelection.length;
  const allInactiveHeroSlidesSelected = inactiveHeroSlidesForSelection.length > 0 && selectedInactiveHeroSlideIdsInView.length === inactiveHeroSlidesForSelection.length;
  const updateActiveHeroSlideSelection = (ids) => {
    setSelectedActiveHeroSlideIds(ids);
    if (ids.length > 0) setSelectedInactiveHeroSlideIds([]);
  };
  const updateInactiveHeroSlideSelection = (ids) => {
    setSelectedInactiveHeroSlideIds(ids);
    if (ids.length > 0) setSelectedActiveHeroSlideIds([]);
  };
  const getLinkedAnnouncementForSlide = (slide) => {
    if (!slide?.announcement_id) return null;
    return announcements.find((announcement) => String(announcement.id) === String(slide.announcement_id)) || null;
  };
  const getLinkedHeroSlideForAnnouncement = (announcement) => {
    if (!announcement?.id) return null;
    return heroSlides.find((slide) => String(slide.announcement_id) === String(announcement.id)) || null;
  };
  const manualHomepageBanners = banners.filter((banner) => !isAutomaticYoutubeLiveBanner(banner));
  const youtubeAutomaticBanner = banners.find(isAutomaticYoutubeLiveBanner);
  const youtubeAutomaticHomepageBanner = youtubeAutomaticBanner
    ? {
        id: `youtube-live-${youtubeAutomaticBanner.id}`,
        homeBanner: youtubeAutomaticBanner,
        source: youtubeAutomaticBanner,
        sourceTitle: 'YouTube Live Service',
        sourceLabel: 'Automatic YouTube live detection',
        message: youtubeAutomaticBanner.message || DEFAULT_YOUTUBE_LIVE_BANNER_MESSAGE,
        scheduleLabel: 'Shows only while the YouTube channel is live',
        isEnabled: !['inactive', 'hidden', 'draft'].includes(String(youtubeAutomaticBanner.status || 'active').toLowerCase()),
        isLiveNow: false,
        isYoutubeLiveBanner: true,
      }
    : null;
  const automaticHomepageBanners = [
    youtubeAutomaticHomepageBanner,
    ...heroSlides
    .map((slide) => {
      const announcement = getLinkedAnnouncementForSlide(slide);
      const source = announcement || slide;
      if (!source?.date || !source?.time || !source?.end_time) return null;

      const normalizedStatus = String(source.status || '').toLowerCase();
      const sourceTitle = source.title || slide.alt_text || 'Scheduled hero slide';
      const isEnabled = slide.is_active !== false && !['hidden', 'inactive', 'draft'].includes(normalizedStatus);

      return {
        id: `auto-${slide.id}-${announcement?.id || 'slide'}`,
        slide,
        announcement,
        source,
        sourceTitle,
        sourceLabel: announcement ? 'Hero slide linked announcement' : 'Hero slide schedule',
        message: getAutomaticBannerMessage(slide, source, sourceTitle),
        scheduleLabel: getAdminScheduleLabel(source),
        isEnabled,
        isLiveNow: isEnabled && isAdminEventLiveNow(source),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (Number(a.slide.order) || 0) - (Number(b.slide.order) || 0)),
  ].filter(Boolean);
  const handleEditAutomaticBanner = (banner) => {
    if (banner?.isYoutubeLiveBanner) return;

    if (banner?.slide) {
      handleEdit(banner.slide, 'heroSlide');
      return;
    }
    if (banner?.announcement) {
      handleEdit(banner.announcement, 'announcement');
    }
  };
  const handleUpdateAutomaticBannerMessage = async (banner, updates) => {
    const updateData = typeof updates === 'string' ? { live_banner_message: updates } : { ...(updates || {}) };
    const nextMessage = String(updateData.live_banner_message || '').trim();
    if (!banner || !nextMessage) return;
    const preparedUpdates = {
      ...updateData,
      live_banner_message: nextMessage,
    };

    if (banner.homeBanner?.id) {
      const { id: _id, ...bannerData } = banner.homeBanner;
      await HomeBannerMessages.update(banner.homeBanner.id, {
        ...bannerData,
        message: nextMessage,
        status: updateData.status || banner.homeBanner.status || 'active',
        is_youtube_live_banner: true,
      });
    } else if (banner.announcement?.id) {
      const { id: _id, ...announcementData } = banner.announcement;
      await AnnouncementsEvents.update(banner.announcement.id, {
        ...announcementData,
        ...preparedUpdates,
      });
    } else if (banner.slide?.id) {
      const { id: _id, ...slideData } = banner.slide;
      await HeroSlide.update(banner.slide.id, {
        ...slideData,
        ...preparedUpdates,
      });
    } else {
      return;
    }

    await logAdminActivity({
      action: 'updated',
      section: 'Homepage Banner',
      itemType: 'automatic live banner message',
      itemId: banner.homeBanner?.id || banner.announcement?.id || banner.slide?.id || '',
      itemLabel: banner.sourceTitle || nextMessage,
      details: preparedUpdates,
    });
    await Promise.all([loadBanners(), loadHeroSlides(), loadAnnouncements()]);
  };
  const HeroAnnouncementSectionHeader = ({
    title,
    description,
    viewMode,
    onViewModeChange,
    searchOpen,
    onSearchOpenChange,
    searchValue,
    onSearchValueChange,
    showAddButton = false,
    itemCount = 0,
    itemStateLabel = 'active',
    showReorderHint = false,
    selectableCount = 0,
    selectedCount = 0,
    allSelected = false,
    onToggleSelectAll,
    selectionActions = null,
  }) => (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>
            <span className="text-lg font-extrabold text-amber-700">{itemCount}</span>{' '}
            {itemStateLabel} {itemCount === 1 ? 'item' : 'items'}
          </span>
          {selectableCount > 0 && typeof onToggleSelectAll === 'function' && (
            <>
              <span className="h-4 w-px bg-gray-300" aria-hidden="true" />
              <label className="inline-flex items-center gap-2 align-middle text-sm font-medium text-gray-700">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onToggleSelectAll(checked === true)}
                  aria-label={`Select all ${itemStateLabel} hero slides`}
                />
                Select all
                {selectedCount > 0 && (
                  <span className="text-xs font-semibold text-amber-700">({selectedCount})</span>
                )}
              </label>
            </>
          )}
          {selectionActions}
        </div>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        {showReorderHint && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            Drag visible slides to adjust their homepage order.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {searchOpen && (
          <Input
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder="Search slides and announcements"
            className="h-10 w-64"
          />
        )}
        <Button
          type="button"
          variant={searchOpen ? 'default' : 'outline'}
          onClick={() => onSearchOpenChange(!searchOpen)}
          className={`gap-2 ${searchOpen ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
        >
          <Search className="h-4 w-4" /> Search
        </Button>
        <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${viewMode === 'grid' ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            aria-pressed={viewMode === 'grid'}
          >
            <Grid2X2 className="h-4 w-4" /> Grid
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${viewMode === 'list' ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" /> List
          </button>
        </div>
        {showAddButton && (
          <Button onClick={() => handleAddNew('heroSlide')} className="gap-2 bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4" /> Add Slide or Event
          </Button>
        )}
      </div>
    </div>
  );
  const renderContent = () => {
    switch (formView) {
      case 'announcement':
        return <HeroSlideForm
          slide={getLinkedHeroSlideForAnnouncement(editingItem)}
          announcement={editingItem}
          announcementMode
          defaultOrder={nextHeroSlideOrder}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          onUnsavedDraftChange={setHeroFormUnsavedDraft}
          onImageUpload={(upload) => logAdminActivity({
            action: 'uploaded',
            section: 'Hero Slides & Announcements',
            itemType: 'hero image',
            itemLabel: upload.filenames?.join(', ') || `${upload.count} hero image upload`,
            details: {
              count: upload.count,
              filenames: upload.filenames || [],
              original_filenames: upload.originalFilenames || [],
              processed_dimensions: '1920x1080',
            },
          })}
        />;
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
          announcement={getLinkedAnnouncementForSlide(editingItem)}
          defaultOrder={nextHeroSlideOrder}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          onUnsavedDraftChange={setHeroFormUnsavedDraft}
          onImageUpload={(upload) => logAdminActivity({
            action: 'uploaded',
            section: 'Hero Slides & Announcements',
            itemType: 'hero image',
            itemLabel: upload.filenames?.join(', ') || `${upload.count} hero image upload`,
            details: {
              count: upload.count,
              filenames: upload.filenames || [],
              original_filenames: upload.originalFilenames || [],
              processed_dimensions: '1920x1080',
            },
          })}
        />;
      case 'sitePopup':
        return <SitePopupForm popup={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
      default:
        break;
    }

    switch (view) {
      case 'worshipEvents':
        return <WorshipEventList
          events={worshipEvents}
          onEdit={(item) => handleEdit(item, 'worshipEvent')}
          onDelete={(id) => handleDelete(id, 'worshipEvent')}
          onAddNew={() => handleAddNew('worshipEvent')}
          onDuplicate={(item) => handleDuplicate(item, 'worshipEvent')}
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
          banners={manualHomepageBanners}
          automaticBanners={automaticHomepageBanners}
          onEdit={(item) => handleEdit(item, 'banner')}
          onDelete={(id) => handleDelete(id, 'banner')}
          onAddNew={() => handleAddNew('banner')}
          onDuplicate={(item) => handleDuplicate(item, 'banner')}
          onEditAutomaticBanner={handleEditAutomaticBanner}
          onUpdateAutomaticBannerMessage={handleUpdateAutomaticBannerMessage}
        />;
      case 'heroSlides':
        return (
          <div className="space-y-5">
            <section aria-labelledby="active-slides-announcements-heading" className="space-y-2 rounded-lg bg-white p-2.5 shadow-md">
              <HeroAnnouncementSectionHeader
                title="Active Slides & Announcements"
                description=""
                viewMode={activeHeroAnnouncementView}
                onViewModeChange={setActiveHeroAnnouncementView}
                searchOpen={activeHeroAnnouncementSearchOpen}
                onSearchOpenChange={setActiveHeroAnnouncementSearchOpen}
                searchValue={activeHeroAnnouncementSearch}
                onSearchValueChange={setActiveHeroAnnouncementSearch}
                itemCount={activeHeroAnnouncementItemCount}
                itemStateLabel="active"
                selectableCount={activeHeroSlidesForSelection.length}
                selectedCount={selectedActiveHeroSlideIdsInView.length}
                allSelected={allActiveHeroSlidesSelected}
                onToggleSelectAll={(checked) => updateActiveHeroSlideSelection(checked ? activeHeroSlidesForSelection.map((slide) => slide.id) : [])}
                selectionActions={selectedActiveHeroSlideIdsInView.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const changed = await handleSetHeroSlideVisibility(selectedActiveHeroSlideIdsInView, false);
                      if (changed) setSelectedActiveHeroSlideIds([]);
                    }}
                    className="h-8 gap-2 border-gray-300 px-3 text-gray-700 hover:bg-gray-50"
                  >
                    <EyeOff className="h-4 w-4" /> Hide Selected ({selectedActiveHeroSlideIdsInView.length})
                  </Button>
                )}
                showReorderHint
                showAddButton
              />
              <HeroSlideList
                slides={heroSlides}
                onEdit={(item) => handleEdit(item, 'heroSlide')}
                onDelete={(id) => handleDelete(id, 'heroSlide')}
                onDeleteSelected={handleDeleteSelectedHeroSlides}
                onHideSelected={(ids) => handleSetHeroSlideVisibility(ids, false)}
                onRestoreSelected={(ids) => handleSetHeroSlideVisibility(ids, true)}
                onReorderVisible={handleReorderVisibleHeroSlides}
                onAddNew={() => handleAddNew('heroSlide')}
                visibleTitle=""
                showHidden={false}
                showHeader={false}
                viewModeOverride={activeHeroAnnouncementView}
                searchTerm={activeHeroAnnouncementSearch}
                selectedVisibleIds={selectedActiveHeroSlideIds}
                onSelectedVisibleIdsChange={updateActiveHeroSlideSelection}
                getLinkedAnnouncementForSlide={getLinkedAnnouncementForSlide}
                hideSelectAll
              />
            </section>

            <section aria-labelledby="inactive-slides-announcements-heading" className="space-y-2 rounded-lg bg-white p-2.5 shadow-md">
              <HeroAnnouncementSectionHeader
                title="Inactive Slides and Announcements"
                description=""
                viewMode={inactiveHeroAnnouncementView}
                onViewModeChange={setInactiveHeroAnnouncementView}
                searchOpen={inactiveHeroAnnouncementSearchOpen}
                onSearchOpenChange={setInactiveHeroAnnouncementSearchOpen}
                searchValue={inactiveHeroAnnouncementSearch}
                onSearchValueChange={setInactiveHeroAnnouncementSearch}
                itemCount={inactiveHeroAnnouncementItemCount}
                itemStateLabel="inactive"
                selectableCount={inactiveHeroSlidesForSelection.length}
                selectedCount={selectedInactiveHeroSlideIdsInView.length}
                allSelected={allInactiveHeroSlidesSelected}
                onToggleSelectAll={(checked) => updateInactiveHeroSlideSelection(checked ? inactiveHeroSlidesForSelection.map((slide) => slide.id) : [])}
                selectionActions={selectedInactiveHeroSlideIdsInView.length > 0 && (
                  <div className="inline-flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const changed = await handleSetHeroSlideVisibility(selectedInactiveHeroSlideIdsInView, true);
                        if (changed) setSelectedInactiveHeroSlideIds([]);
                      }}
                      className="h-8 gap-2 border-green-300 px-3 text-green-700 hover:bg-green-50"
                    >
                      <RotateCcw className="h-4 w-4" /> Restore Selected ({selectedInactiveHeroSlideIdsInView.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const deleted = await handleDeleteSelectedHeroSlides(selectedInactiveHeroSlideIdsInView);
                        if (deleted) setSelectedInactiveHeroSlideIds([]);
                      }}
                      className="h-8 gap-2 border-red-300 px-3 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Selected ({selectedInactiveHeroSlideIdsInView.length})
                    </Button>
                  </div>
                )}
              />
              <HeroSlideList
                slides={heroSlides}
                onEdit={(item) => handleEdit(item, 'heroSlide')}
                onDelete={(id) => handleDelete(id, 'heroSlide')}
                onDeleteSelected={handleDeleteSelectedHeroSlides}
                onHideSelected={(ids) => handleSetHeroSlideVisibility(ids, false)}
                onRestoreSelected={(ids) => handleSetHeroSlideVisibility(ids, true)}
                onReorderVisible={handleReorderVisibleHeroSlides}
                onAddNew={() => handleAddNew('heroSlide')}
                hiddenTitle=""
                showVisible={false}
                showHeader={false}
                viewModeOverride={inactiveHeroAnnouncementView}
                searchTerm={inactiveHeroAnnouncementSearch}
                selectedHiddenIds={selectedInactiveHeroSlideIds}
                onSelectedHiddenIdsChange={updateInactiveHeroSlideSelection}
                getLinkedAnnouncementForSlide={getLinkedAnnouncementForSlide}
                hideSelectAll
              />
              <AnnouncementList
                announcements={standaloneInactiveAnnouncements}
                onEdit={(item) => handleEdit(item, 'announcement')}
                onDelete={(id) => handleDelete(id, 'announcement')}
                onRestore={(id) => handleSetAnnouncementVisibility(id, 'Active')}
                onDuplicate={(item) => handleDuplicate(item, 'announcement')}
                title="Inactive Announcements"
                showAddNew={false}
                mode="hidden"
                showHeader={false}
                viewModeOverride={inactiveHeroAnnouncementView}
                searchTerm={inactiveHeroAnnouncementSearch}
              />
            </section>

            <LandingImageManager
              landingImage={landingImages[0]}
              onSaved={loadLandingImages}
            />
          </div>
        );
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
          onSendBroadcast={handleSendNewsletterBroadcast}
          onSaveBroadcastDraft={handleSaveNewsletterBroadcastDraft}
          onScheduleBroadcast={handleScheduleNewsletterBroadcast}
          onMarkBroadcastSent={handleMarkNewsletterBroadcastSent}
          onDeleteBroadcast={handleDeleteNewsletterBroadcast}
          onConfirm={requestConfirmation}
          onSuccess={showSuccess}
          onError={showError}
        />;
      case 'developer':
        return canViewDeveloperPanel
          ? <DeveloperPanel
              logs={adminActivityLogs}
              admins={siteAdminComparison}
              adminLoadError={siteAdminLoadError}
              loading={loadingDeveloperLogs || loadingSiteAdmins}
              onRefresh={async () => {
                await Promise.all([loadAdminActivityLogs(), loadSiteAdminComparison()]);
              }}
              onCreateAdmin={handleCreateSiteAdmin}
              onDeleteAdmin={handleDeleteSiteAdmin}
              onUpdateAdminRole={handleUpdateSiteAdminRole}
              canManageAdmins={canManageSiteAdmins}
              currentAdminEmail={currentAdmin?.email || ''}
              onConfirm={requestConfirmation}
              onSuccess={showSuccess}
              onError={showError}
            />
          : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-1 pb-4">
      {confirmationDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
            <div className="flex items-start gap-4 p-6">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${confirmationDialog.tone === 'danger' ? 'bg-red-100 text-red-700' : confirmationDialog.tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="admin-confirm-title" className="text-xl font-bold text-slate-950">{confirmationDialog.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{confirmationDialog.description}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => resolveConfirmation(false)}>Cancel</Button>
              <Button
                type="button"
                onClick={() => resolveConfirmation(true)}
                className={confirmationDialog.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : confirmationDialog.tone === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'}
              >
                {confirmationDialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
      {pendingAdminTransition && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Unsaved Changes</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">Save this as a draft?</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                You have unsaved changes in this hero slide or announcement. If you save as draft, it will be saved in the
                <span className="font-semibold text-gray-900"> Inactive Slides & Announcements</span> section and will not show publicly.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingAdminTransition(null)}
                disabled={savingHeroDraft}
              >
                Continue Editing
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscardPendingHeroDraft}
                disabled={savingHeroDraft}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Discard
              </Button>
              <Button
                type="button"
                onClick={handleSavePendingHeroDraft}
                disabled={savingHeroDraft}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {savingHeroDraft ? 'Saving Draft...' : 'Save as Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showAdminNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-5">
          <form onSubmit={handleSaveAdminName} className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/65 px-4 py-5 backdrop-blur-md" role="dialog" aria-modal="true">
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
      <div className="w-full px-2 sm:px-3 lg:px-4">
        <div className="mb-1 overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-[#4b342a]" />
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
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
                <Button variant="outline" onClick={() => requestAdminTransition(handleSignOut)} className="gap-2 border-amber-200 bg-white hover:bg-amber-50">
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
        
        <div className="mb-2 rounded-xl border border-amber-100 bg-white p-1.5 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-center">
            <div className="relative flex h-full min-h-[57px] flex-col justify-between">
              <p className="mb-0.5 text-sm font-medium tracking-wide text-amber-800">Content Section Switcher</p>
              <button
                type="button"
                onClick={() => setAdminSectionMenuOpen((open) => !open)}
                className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-left shadow-inner outline-none transition hover:bg-amber-100/70 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                aria-expanded={adminSectionMenuOpen}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-600 text-white shadow-sm">
                    <SelectedAdminSectionIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-sm font-bold text-gray-950">{selectedAdminSection?.label}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-amber-700 transition-transform ${adminSectionMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {adminSectionMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-amber-200 bg-white shadow-xl">
                  {adminSectionOptions.map((option) => {
                    const OptionIcon = option.icon;
                    const isSelected = option.value === view;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          requestAdminTransition(() => {
                            setView(option.value);
                            setFormView(null);
                            setEditingItem(null);
                            setHeroFormUnsavedDraft({ isDirty: false, draft: null });
                            setAdminInstructionExpanded(false);
                            setAdminSectionMenuOpen(false);
                          });
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition ${isSelected ? 'bg-amber-50 text-amber-800' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <OptionIcon className={`h-4 w-4 ${isSelected ? 'text-amber-700' : 'text-gray-500'}`} />
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              </div>
            <div className="ml-0 mr-0 flex min-h-[62px] w-full min-w-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-sm text-red-700">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm">
                <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
              <div className="relative min-w-0 flex-1">
                <p ref={adminInstructionRef} className={`leading-4 ${!adminInstructionExpanded ? 'line-clamp-2' : ''}`}>
                  {selectedAdminInstructions}
                </p>
                {canExpandAdminInstructions && !adminInstructionExpanded && (
                  <button
                    type="button"
                    onClick={() => setAdminInstructionExpanded(true)}
                    className="absolute bottom-0 right-0 inline-flex items-center gap-1 bg-amber-50/95 pl-1 text-xs font-bold text-amber-700 underline-offset-2 hover:underline"
                  >
                    Read more
                    <ChevronDown className="h-3 w-3" />
                  </button>
                )}
                {canExpandAdminInstructions && adminInstructionExpanded && (
                  <button
                    type="button"
                    onClick={() => setAdminInstructionExpanded(false)}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-700 underline-offset-2 hover:underline"
                  >
                    Show less
                    <ChevronDown className="h-3 w-3 rotate-180" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div ref={adminContentTopRef} className="scroll-mt-[160px]" />
        {renderContent()}
      </div>
    </div>
  );
}
