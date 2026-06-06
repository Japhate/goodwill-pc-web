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
  const [validationErrors, setValidationErrors] = useState({});

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
        setValidationErrors({});
    }
  }, [bulletin]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = async (e, field, destination, uploaderStateSetter) => {
    const file = e.target.files[0];
    if (!file) return;

    uploaderStateSetter(true);
    try {
      const { file_url } = await UploadFile({ file, destination });
      handleChange(field, file_url);
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      uploaderStateSetter(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!String(formData.title || '').trim()) nextErrors.title = 'Enter the bulletin title.';
    if (!formData.date) nextErrors.date = 'Choose the bulletin date.';
    if (!formData.status) nextErrors.status = 'Choose the bulletin status.';
    if (!formData.file_url) nextErrors.file_url = 'Upload the bulletin PDF file.';
    if (!formData.thumbnail_url) nextErrors.thumbnail_url = 'Upload the thumbnail image.';
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-lg shadow-md" noValidate>
      <h2 className="text-2xl font-bold text-gray-800">{bulletin ? 'Edit' : 'Create'} Bulletin</h2>
      {Object.values(validationErrors).some(Boolean) && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Please complete the highlighted required fields before saving this bulletin.
        </p>
      )}
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title (e.g., Homecoming Sunday)<span className="ml-1 text-red-600">*</span></label>
        <Input
          id="title"
          value={formData.title}
          onChange={e => handleChange('title', e.target.value)}
          className={validationErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {validationErrors.title && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.title}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date<span className="ml-1 text-red-600">*</span></label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={e => handleChange('date', e.target.value)}
            className={validationErrors.date ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {validationErrors.date && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.date}</p>}
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status<span className="ml-1 text-red-600">*</span></label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger className={validationErrors.status ? "border-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="Current">Current (For This Week's Bulletin)</SelectItem>
                  <SelectItem value="Past">Past (For Archive)</SelectItem>
              </SelectContent>
          </Select>
          {validationErrors.status && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.status}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="file_upload" className="block text-sm font-medium text-gray-700 mb-1">Bulletin PDF File<span className="ml-1 text-red-600">*</span></label>
        <div className="flex items-center gap-4">
            <Input
              id="file_upload"
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'file_url', 'bulletinPdf', setIsUploadingFile)}
              className={`max-w-xs ${validationErrors.file_url ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {isUploadingFile && <Loader2 className="w-6 h-6 animate-spin text-gray-500" />}
        </div>
        {validationErrors.file_url && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.file_url}</p>}
        {formData.file_url && !isUploadingFile && (
          <p className="text-xs text-green-600 mt-2 truncate">Current file: {formData.file_url}</p>
        )}
      </div>

      <div>
        <label htmlFor="thumb_upload" className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image<span className="ml-1 text-red-600">*</span></label>
        <div className="flex items-center gap-4">
            <Input
              id="thumb_upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'thumbnail_url', 'bulletinThumbnail', setIsUploadingThumb)}
              className={`max-w-xs ${validationErrors.thumbnail_url ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {isUploadingThumb && <Loader2 className="w-6 h-6 animate-spin text-gray-500" />}
        </div>
        {validationErrors.thumbnail_url && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.thumbnail_url}</p>}
        {formData.thumbnail_url && !isUploadingThumb && (
          <div className="mt-4">
            <img src={formData.thumbnail_url} alt="Thumbnail Preview" className="h-32 w-auto rounded-md object-cover border p-1" />
            <p className="text-xs text-gray-500 mt-1 truncate">Current image: {formData.thumbnail_url}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={isUploadingFile || isUploadingThumb}>
          {isUploadingFile || isUploadingThumb ? 'Uploading...' : (bulletin ? 'Save Changes' : 'Create Bulletin')}
        </Button>
      </div>
    </form>
  );
}
