import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile } from "@/integrations/Core";
import { Loader2 } from "lucide-react";

export default function AnnouncementForm({ announcement, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(announcement || {
    title: '',
    content: '',
    date: '',
    time: '',
    end_time: '',
    location: '',
    zoom_link: '',
    category: 'church_wide',
    image_upload: '',
    status: 'Active'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // If an announcement is passed, format the date correctly for the input
    if (announcement) {
        const initialData = { ...announcement };
        if (announcement.date) {
            try {
                initialData.date = new Date(announcement.date).toISOString().split('T')[0];
            } catch {
                console.error("Invalid date format", announcement.date);
                initialData.date = '';
            }
        }
        setFormData(initialData);
        setValidationErrors({});
    }
  }, [announcement]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file, destination: "announcementImage" });
      handleChange('image_upload', file_url);
    } catch (error) {
      console.error("File upload failed:", error);
      // You could add some user-facing error state here
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!String(formData.title || '').trim()) nextErrors.title = 'Enter the announcement title.';
    if (!String(formData.content || '').trim()) nextErrors.content = 'Enter the announcement content.';
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(formData);
  };
  
  const categories = [
    { value: "church_wide", label: "Church-Wide" },
    { value: "mens_ministry", label: "Men's Ministry" },
    { value: "womens_ministry", label: "Women's Ministry" },
    { value: "youth_ministry", label: "Youth Ministry" },
    { value: "session_leadership", label: "Session & Leadership" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md" noValidate>
      <h2 className="text-2xl font-bold text-gray-800">{announcement ? 'Edit' : 'Create'} Announcement</h2>
      {Object.values(validationErrors).some(Boolean) && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Please complete the highlighted required fields before saving this announcement.
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title<span className="ml-1 text-red-600">*</span></label>
          <Input
            id="title"
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            className={validationErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {validationErrors.title && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.title}</p>}
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <Input id="date" type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} />
        </div>

        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <Input id="time" type="time" value={formData.time} onChange={e => handleChange('time', e.target.value)} />
        </div>

        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <Input id="end_time" type="time" value={formData.end_time} onChange={e => handleChange('end_time', e.target.value)} />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <Input id="location" value={formData.location} onChange={e => handleChange('location', e.target.value)} />
        </div>

        <div>
          <label htmlFor="zoom_link" className="block text-sm font-medium text-gray-700 mb-1">Zoom Link</label>
          <Input id="zoom_link" type="url" placeholder="https://zoom.us/j/..." value={formData.zoom_link} onChange={e => handleChange('zoom_link', e.target.value)} />
        </div>
      </div>
      
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content<span className="ml-1 text-red-600">*</span></label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={e => handleChange('content', e.target.value)}
          rows={5}
          className={validationErrors.content ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {validationErrors.content && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.content}</p>}
      </div>

      <div>
        <label htmlFor="image_upload" className="block text-sm font-medium text-gray-700 mb-1">Image</label>
        <div className="flex items-center gap-4">
            <Input id="image_upload" type="file" onChange={handleFileChange} className="max-w-xs" />
            {isUploading && <Loader2 className="w-6 h-6 animate-spin text-gray-500" />}
        </div>
        {formData.image_upload && !isUploading && (
          <div className="mt-4">
            <img src={formData.image_upload} alt="Preview" className="h-32 w-auto rounded-md object-cover border p-1" />
            <p className="text-xs text-gray-500 mt-1 truncate">Current image: {formData.image_upload}</p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <Select value={formData.status || 'Active'} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active (Homepage & Current Announcements)</SelectItem>
            <SelectItem value="Inactive">Inactive (Past Events Gallery)</SelectItem>
            <SelectItem value="Timeless">Timeless (Always Shows)</SelectItem>
            <SelectItem value="Hidden">Hidden (Not Displayed)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">Active: Shows on homepage and current announcements. Inactive: Past events gallery. Timeless: Always visible. Hidden: Not displayed anywhere.</p>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={isUploading}>
          {isUploading ? 'Uploading...' : (announcement ? 'Save Changes' : 'Create Announcement')}
        </Button>
      </div>
    </form>
  );
}
