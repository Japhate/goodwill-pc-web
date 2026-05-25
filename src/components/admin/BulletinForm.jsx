import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadFile } from "@/integrations/Core";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BulletinForm({ bulletin, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(bulletin || {
    title: '',
    date: '',
    status: 'Past',
    file_url: '',
    thumbnail_url: ''
  });
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  useEffect(() => {
    if (bulletin) {
        const initialData = { ...bulletin };
        if (bulletin.date) {
            try {
                initialData.date = new Date(bulletin.date).toISOString().split('T')[0];
            } catch {
                console.error("Invalid date format", bulletin.date);
                initialData.date = '';
            }
        }
        if (!initialData.status) {
            initialData.status = 'Past';
        }
        setFormData(initialData);
    }
  }, [bulletin]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e, field, uploaderStateSetter) => {
    const file = e.target.files[0];
    if (!file) return;

    uploaderStateSetter(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleChange(field, file_url);
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      uploaderStateSetter(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800">{bulletin ? 'Edit' : 'Create'} Bulletin</h2>
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title (e.g., Homecoming Sunday) *</label>
        <Input id="title" value={formData.title} onChange={e => handleChange('title', e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <Input id="date" type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                  <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="Current">Current (For This Week's Bulletin)</SelectItem>
                  <SelectItem value="Past">Past (For Archive)</SelectItem>
              </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label htmlFor="file_upload" className="block text-sm font-medium text-gray-700 mb-1">Bulletin PDF File *</label>
        <div className="flex items-center gap-4">
            <Input id="file_upload" type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'file_url', setIsUploadingFile)} className="max-w-xs" />
            {isUploadingFile && <Loader2 className="w-6 h-6 animate-spin text-gray-500" />}
        </div>
        {formData.file_url && !isUploadingFile && (
          <p className="text-xs text-green-600 mt-2 truncate">Current file: {formData.file_url}</p>
        )}
      </div>

      <div>
        <label htmlFor="thumb_upload" className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image *</label>
        <div className="flex items-center gap-4">
            <Input id="thumb_upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'thumbnail_url', setIsUploadingThumb)} className="max-w-xs" />
            {isUploadingThumb && <Loader2 className="w-6 h-6 animate-spin text-gray-500" />}
        </div>
        {formData.thumbnail_url && !isUploadingThumb && (
          <div className="mt-4">
            <img src={formData.thumbnail_url} alt="Thumbnail Preview" className="h-32 w-auto rounded-md object-cover border p-1" />
            <p className="text-xs text-gray-500 mt-1 truncate">Current image: {formData.thumbnail_url}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={isUploadingFile || isUploadingThumb}>
          {isUploadingFile || isUploadingThumb ? 'Uploading...' : (bulletin ? 'Save Changes' : 'Create Bulletin')}
        </Button>
      </div>
    </form>
  );
}
