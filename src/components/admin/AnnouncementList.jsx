import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { CalendarDays, Copy, Edit, EyeOff, Grid2X2, ImageOff, List, PlusCircle, RotateCcw, Trash } from 'lucide-react';

function AnnouncementStatus({ status }) {
  const value = status || 'Active';
  const className =
    value === 'Active' ? 'bg-green-100 text-green-800' :
    value === 'Inactive' ? 'bg-gray-100 text-gray-800' :
    value === 'Timeless' ? 'bg-blue-100 text-blue-800' :
    'bg-red-100 text-red-800';

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{value}</span>;
}

function AnnouncementCategory({ category }) {
  const labels = {
    church_wide: 'Church-Wide',
    mens_ministry: "Men's Ministry",
    womens_ministry: "Women's Ministry",
    youth_ministry: 'Youth Ministry',
    session_leadership: 'Session & Leadership',
  };

  return (
    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
      {labels[category] || 'Church-Wide'}
    </span>
  );
}

function AnnouncementImage({ announcement, className = 'h-16 w-24' }) {
  return announcement.image_upload ? (
    <img
      src={announcement.image_upload}
      alt={announcement.title}
      className={`${className} rounded-md border bg-gray-100 object-cover`}
    />
  ) : (
    <div className={`${className} flex items-center justify-center rounded-md border bg-gray-200 text-gray-400`}>
      <ImageOff className="h-6 w-6" />
    </div>
  );
}

function getAnnouncementLocationSummary(announcement) {
  const locationType = announcement.location_type || (
    (announcement.location || announcement.directions_url) && (announcement.virtual_platform || announcement.zoom_link)
      ? 'both'
      : announcement.virtual_platform || announcement.zoom_link ? 'virtual' : 'physical'
  );
  const parts = [];
  if (['physical', 'both'].includes(locationType) && announcement.location) parts.push(announcement.location);
  if (['virtual', 'both'].includes(locationType) && announcement.virtual_platform) parts.push(announcement.virtual_platform);
  return parts.join(' / ') || 'N/A';
}

function formatAnnouncementDate(date) {
  return date ? format(parseISO(date), 'MMM dd, yyyy') : 'N/A';
}

export default function AnnouncementList({
  announcements,
  onEdit,
  onDelete,
  onHide,
  onRestore,
  onAddNew,
  onDuplicate,
  title,
  description = '',
  addLabel = 'Add Event',
  showAddNew = true,
  mode = 'active',
  showHeader = true,
  viewModeOverride = null,
  searchTerm = '',
}) {
  const [viewMode, setViewMode] = useState('grid');
  const today = startOfDay(new Date());
  const isHiddenMode = mode === 'hidden';
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleAnnouncements = announcements.filter((announcement) => {
    if (!normalizedSearch) return true;
    return [
      announcement.title,
      announcement.content,
      announcement.category,
      announcement.location,
      announcement.virtual_platform,
      announcement.status,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
  });
  const effectiveViewMode = viewModeOverride || viewMode;

  if (!showHeader && visibleAnnouncements.length === 0) {
    return null;
  }

  const renderActions = (announcement) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => onEdit(announcement)} className="gap-1">
        <Edit className="h-3 w-3" /> Edit
      </Button>
      {onDuplicate && (
        <Button variant="outline" size="sm" onClick={() => onDuplicate(announcement)} className="gap-1 border-green-300 text-green-700 hover:bg-green-50">
          <Copy className="h-3 w-3" /> Copy
        </Button>
      )}
      {isHiddenMode ? (
        <>
          {onRestore && (
            <Button variant="outline" size="sm" onClick={() => onRestore(announcement.id)} className="gap-1 border-green-300 text-green-700 hover:bg-green-50">
              <RotateCcw className="h-3 w-3" /> Restore
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onDelete(announcement.id)} className="gap-1 border-red-300 text-red-600 hover:bg-red-50">
            <Trash className="h-3 w-3" /> Delete
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={() => (onHide ? onHide(announcement.id) : onDelete(announcement.id))} className="gap-1 border-gray-300 text-gray-700 hover:bg-gray-50">
          <EyeOff className="h-3 w-3" /> Hide
        </Button>
      )}
    </div>
  );

  return (
    <div className={showHeader ? "space-y-3 rounded-lg bg-white p-4 shadow-md" : "space-y-2"}>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${viewMode === 'grid' ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                aria-pressed={viewMode === 'grid'}
              >
                <Grid2X2 className="h-4 w-4" /> Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${viewMode === 'list' ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" /> List
              </button>
            </div>
            {showAddNew && (
              <Button onClick={onAddNew} className="gap-2 bg-amber-600 hover:bg-amber-700">
                <PlusCircle className="h-4 w-4" /> {addLabel}
              </Button>
            )}
          </div>
        </div>
      )}
      {visibleAnnouncements.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 py-3 text-center text-sm text-gray-500">
          No announcements or events in this section.
        </div>
      ) : effectiveViewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">#</th>
                <th scope="col" className="px-4 py-3">Image</th>
                <th scope="col" className="px-4 py-3">Title</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Time</th>
                <th scope="col" className="px-4 py-3">Location</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAnnouncements.map((announcement, index) => {
                const isPast = announcement.date && isBefore(parseISO(announcement.date), today);
                return (
                  <tr key={announcement.id} className={`border-b transition-colors ${isPast ? 'bg-gray-100 text-gray-600' : 'bg-white hover:bg-gray-50'}`}>
                    <td className="px-4 py-4 font-bold">{index + 1}</td>
                    <td className="px-4 py-4"><AnnouncementImage announcement={announcement} /></td>
                    <td className="px-4 py-4 font-medium text-gray-900">{announcement.title}</td>
                    <td className="px-4 py-4"><AnnouncementCategory category={announcement.category} /></td>
                    <td className="px-4 py-4">{formatAnnouncementDate(announcement.date)}</td>
                    <td className="px-4 py-4">{announcement.time || 'N/A'}</td>
                    <td className="px-4 py-4">{getAnnouncementLocationSummary(announcement)}</td>
                    <td className="px-4 py-4"><AnnouncementStatus status={announcement.status} /></td>
                    <td className="px-4 py-4">{renderActions(announcement)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleAnnouncements.map((announcement, index) => (
            <article key={announcement.id} className="overflow-hidden rounded-md border bg-white shadow-sm">
              <AnnouncementImage announcement={announcement} className="aspect-[16/9] w-full" />
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full bg-black/70 px-2 py-1 text-xs text-white">#{index + 1}</div>
                    <AnnouncementStatus status={announcement.status} />
                  </div>
                  <AnnouncementCategory category={announcement.category} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{announcement.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  <span>{formatAnnouncementDate(announcement.date)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-600">{announcement.content || 'No announcement details.'}</p>
                {renderActions(announcement)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
