import { Button } from '@/components/ui/button';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { Edit, Trash, PlusCircle, Copy, ImageOff } from 'lucide-react';

export default function AnnouncementList({ announcements, onEdit, onDelete, onAddNew, onDuplicate, title, showAddNew = true }) {
  const today = startOfDay(new Date());

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        {showAddNew && (
          <Button onClick={onAddNew} className="bg-amber-600 hover:bg-amber-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add New
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 w-12">#</th>
              <th scope="col" className="px-6 py-3">Image</th>
              <th scope="col" className="px-6 py-3">Title</th>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">Time</th>
              <th scope="col" className="px-6 py-3">Location</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((announcement, index) => {
              const isPast = announcement.date && isBefore(parseISO(announcement.date), today);
              return (
              <tr key={announcement.id} className={`border-b transition-colors ${isPast ? 'bg-gray-100 text-gray-600' : 'bg-white hover:bg-gray-50'}`}>
                <td className="px-6 py-4 font-bold">{index + 1}</td>
                <td className="px-6 py-4">
                  {announcement.image_upload ? (
                    <img 
                      src={announcement.image_upload} 
                      alt={announcement.title}
                      className="h-16 w-24 object-cover rounded-md bg-gray-100 border"
                    />
                  ) : (
                    <div className="h-16 w-24 flex items-center justify-center bg-gray-200 rounded-md border text-gray-400">
                        <ImageOff className="w-6 h-6" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{announcement.title}</td>
                <td className="px-6 py-4">
                  {announcement.date ? format(parseISO(announcement.date), 'MMM dd, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4">{announcement.time || 'N/A'}</td>
                <td className="px-6 py-4">{announcement.location || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    (announcement.status === 'Active' || !announcement.status) ? 'bg-green-100 text-green-800' :
                    announcement.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                    announcement.status === 'Timeless' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {announcement.status || 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(announcement)} title="Edit">
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDuplicate(announcement)} title="Duplicate">
                    <Copy className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(announcement.id)} title="Delete">
                    <Trash className="w-4 h-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}