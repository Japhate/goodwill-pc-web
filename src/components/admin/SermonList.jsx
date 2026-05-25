import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash, PlusCircle, Copy } from 'lucide-react';

export default function SermonList({ sermons, onEdit, onDelete, onAddNew, onDuplicate }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Live':
        return <Badge className="bg-red-500 text-white">Live</Badge>;
      case 'Active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'Inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Sermons</h2>
        <Button onClick={onAddNew} className="bg-amber-600 hover:bg-amber-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add New Sermon
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 w-12">#</th>
              <th scope="col" className="px-6 py-3">Title</th>
              <th scope="col" className="px-6 py-3">Speaker</th>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sermons.map((sermon, index) => (
              <tr key={sermon.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-bold">{index + 1}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{sermon.title}</td>
                <td className="px-6 py-4">{sermon.speaker}</td>
                <td className="px-6 py-4">{sermon.date ? format(parseISO(sermon.date), 'MMM dd, yyyy') : ''}</td>
                <td className="px-6 py-4">{getStatusBadge(sermon.status)}</td>
                <td className="px-6 py-4 flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(sermon)} title="Edit">
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDuplicate(sermon)} title="Duplicate">
                    <Copy className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(sermon.id)} title="Delete">
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