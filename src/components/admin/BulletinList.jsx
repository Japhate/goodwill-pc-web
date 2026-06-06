
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash, PlusCircle, Copy, ImageOff } from 'lucide-react';

export default function BulletinList({ bulletins, onEdit, onDelete, onAddNew, onDuplicate }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Current':
        return <Badge className="bg-blue-500 text-white">Current</Badge>;
      case 'Past':
        return <Badge variant="outline">Past</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Worship Bulletins</h2>
        <Button onClick={onAddNew} className="bg-amber-600 hover:bg-amber-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add New Bulletin
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 w-12">#</th>
              <th scope="col" className="px-6 py-3">Thumbnail</th>
              <th scope="col" className="px-6 py-3">Title</th>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bulletins.map((bulletin, index) => (
              <tr key={bulletin.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-bold">{index + 1}</td>
                 <td className="px-6 py-4">
                  {bulletin.thumbnail_url ? (
                    <img 
                      src={bulletin.thumbnail_url} 
                      alt={bulletin.title}
                      className="h-24 w-auto object-contain rounded-md bg-gray-100 border"
                    />
                  ) : (
                    <div className="h-24 w-16 flex items-center justify-center bg-gray-200 rounded-md border text-gray-400">
                        <ImageOff className="w-6 h-6" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{bulletin.title}</td>
                <td className="px-6 py-4">{bulletin.date ? format(parseISO(bulletin.date), 'MMM dd, yyyy') : ''}</td>
                <td className="px-6 py-4">{getStatusBadge(bulletin.status)}</td>
                <td className="px-6 py-4 flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(bulletin)} title="Edit">
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDuplicate(bulletin)} title="Duplicate">
                    <Copy className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(bulletin.id)} title="Delete">
                    <Trash className="w-4 h-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
