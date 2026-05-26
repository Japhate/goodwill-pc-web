import { useState, useEffect } from 'react';
import { AnnouncementsEvents } from '@/entities/AnnouncementsEvents';
import { WorshipEvent } from '@/entities/WorshipEvent';
import { Sermons } from '@/entities/Sermons';
import { Bulletins } from '@/entities/Bulletins';
import { Banner } from '@/entities/Banner';
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
import { HeroSlide } from '@/entities/HeroSlide';
import { firebaseEnabled } from '@/lib/firebase';
import { Loader2, ShieldAlert, Megaphone, CalendarHeart, Images, PlaySquare, FileText, MessageSquare, EyeOff, LayoutTemplate, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [worshipEvents, setWorshipEvents] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [banners, setBanners] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [view, setView] = useState('announcements'); // 'announcements', 'worshipEvents', 'pastEvents', 'sermons', 'bulletins', 'banners', 'hiddenAnnouncements', 'heroSlides'
  const [formView, setFormView] = useState(null); // 'announcement', 'worshipEvent', 'sermon', 'bulletin', 'banner', 'heroSlide', or null
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const checkUserAndLoadData = async () => {
      setLoading(true);
      try {
        const user = await User.me();
        if (user && user.role === 'admin') {
          setIsAdmin(true);
          await Promise.all([
            loadAnnouncements(), 
            loadWorshipEvents(),
            loadSermons(),
            loadBulletins(),
            loadBanners(),
            loadHeroSlides()
          ]);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        setIsAdmin(false);
        console.error("User not authenticated or not an admin", error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

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
    const data = await Banner.list('-created_date', 100);
    setBanners(data);
  };

  const loadHeroSlides = async () => {
    const data = await HeroSlide.list('order', 50);
    setHeroSlides(data);
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
      banner: { name: 'banner', entity: Banner },
      heroSlide: { name: 'hero slide', entity: HeroSlide },
    };

    const entityInfo = entityMap[type];
    if (!entityInfo) return;

    if (window.confirm(`Are you sure you want to delete this ${entityInfo.name}?`)) {
      try {
        await entityInfo.entity.delete(id);
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

    return true;
  };

  const handleDuplicate = async (item, type) => {
    if (type === 'pastEvent') type = 'announcement';
    
    const entityMap = {
      announcement: { name: 'announcement', entity: AnnouncementsEvents },
      worshipEvent: { name: 'worship event', entity: WorshipEvent },
      sermon: { name: 'sermon', entity: Sermons },
      bulletin: { name: 'bulletin', entity: Bulletins },
      banner: { name: 'banner', entity: Banner },
      heroSlide: { name: 'hero slide', entity: HeroSlide },
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
            duplicatedItem.is_active = false; // Don't duplicate as active
        } else if (item.title) {
            duplicatedItem.title = `[COPY] ${item.title}`;
        }
        
        await entityInfo.entity.create(duplicatedItem);
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
      default:
        break;
    }
  };

  const handleFormSubmit = async (formData) => {
    const isEditing = editingItem && editingItem.id;

    try {
        switch (formView) {
            case 'announcement':
                if (isEditing) {
                    await AnnouncementsEvents.update(editingItem.id, formData);
                } else {
                    await AnnouncementsEvents.create(formData);
                }
                break;
            case 'worshipEvent':
                if (isEditing) {
                    await WorshipEvent.update(editingItem.id, formData);
                } else {
                    await WorshipEvent.create(formData);
                }
                break;
            case 'sermon':
                if (isEditing) {
                    await Sermons.update(editingItem.id, formData);
                } else {
                    await Sermons.create(formData);
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
                    await Bulletins.create(formData);
                }
                break;
            case 'banner':
                if (isEditing) {
                    await Banner.update(editingItem.id, formData);
                } else {
                    await Banner.create(formData);
                }
                break;
            case 'heroSlide':
                if (isEditing && Array.isArray(formData)) {
                    const [firstSlide, ...additionalSlides] = formData;
                    await HeroSlide.update(editingItem.id, firstSlide);
                    await Promise.all(additionalSlides.map((slideData) => HeroSlide.create(slideData)));
                } else if (isEditing) {
                    await HeroSlide.update(editingItem.id, formData);
                } else if (Array.isArray(formData)) {
                    await Promise.all(formData.map((slideData) => HeroSlide.create(slideData)));
                } else {
                    await HeroSlide.create(formData);
                }
                break;
            default:
                console.error("Unknown form view:", formView);
                return;
        }

        await refreshDataForType(formView);
        setFormView(null);
        setEditingItem(null);

    } catch (error) {
        console.error("Error in handleFormSubmit:", error);
        // Here you could set an error state to show a message to the user
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
    try {
      await User.signIn(loginEmail, loginPassword);
      await checkUserAndLoadData();
    } catch (error) {
      setLoginError(error.message || 'Unable to sign in.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await User.logout();
    setIsAdmin(false);
    setEditingItem(null);
    setFormView(null);
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center pt-20 px-4">
          <form onSubmit={handleSignIn} className="w-full max-w-md space-y-5 bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">Admin Sign In</h1>
            <p className="text-sm text-gray-600">Sign in with your approved Firebase administrator account.</p>
            <div>
              <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input id="admin_email" type="email" autoComplete="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
        return <HeroSlideForm slide={editingItem} onSubmit={handleFormSubmit} onCancel={handleCancelForm} />;
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-28 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-center gap-4">
          <h1 className="text-4xl font-bold text-gray-900 text-center">Admin Panel</h1>
          {firebaseEnabled && (
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          )}
        </div>
        
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
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}
