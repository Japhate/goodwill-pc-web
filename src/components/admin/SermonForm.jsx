import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_SPEAKERS = ["Rev. Dr. Joe W. Rigsby, Pastor"];

export default function SermonForm({ sermon, onSubmit, onCancel }) {
  const [speakers, setSpeakers] = useState(() => {
    const saved = localStorage.getItem('sermonSpeakers');
    return saved ? JSON.parse(saved) : DEFAULT_SPEAKERS;
  });
  const [showCustomSpeaker, setShowCustomSpeaker] = useState(false);
  const [customSpeaker, setCustomSpeaker] = useState('');

  const [formData, setFormData] = useState(sermon || {
    title: '',
    speaker: '',
    date: '',
    scripture: '',
    status: 'Draft',
    series: '',
    youtube_url: '',
    notes: '',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    if (sermon) {
        const initialData = { ...sermon };
        if (sermon.date) {
            try {
                initialData.date = new Date(sermon.date).toISOString().split('T')[0];
            } catch {
                console.error("Invalid date format", sermon.date);
                initialData.date = '';
            }
        }
        // Ensure status is initialized if sermon object exists but might not have status
        if (!initialData.status) {
            initialData.status = 'Draft';
        }
        setFormData(initialData);
    }
  }, [sermon]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800">{sermon ? 'Edit' : 'Create'} Sermon</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <Input id="title" value={formData.title} onChange={e => handleChange('title', e.target.value)} />
        </div>
        <div>
          <label htmlFor="speaker" className="block text-sm font-medium text-gray-700 mb-1">Speaker</label>
          <Select 
            value={showCustomSpeaker ? '__other__' : formData.speaker} 
            onValueChange={(value) => {
              if (value === '__other__') {
                setShowCustomSpeaker(true);
                handleChange('speaker', '');
              } else {
                setShowCustomSpeaker(false);
                setCustomSpeaker('');
                handleChange('speaker', value);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a speaker" />
            </SelectTrigger>
            <SelectContent>
              {speakers.map((speaker) => (
                <SelectItem key={speaker} value={speaker}>{speaker}</SelectItem>
              ))}
              <SelectItem value="__other__">Other...</SelectItem>
            </SelectContent>
          </Select>
          {showCustomSpeaker && (
            <div className="mt-2 flex gap-2">
              <Input 
                placeholder="Enter speaker name" 
                value={customSpeaker} 
                onChange={(e) => setCustomSpeaker(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  if (customSpeaker.trim()) {
                    const newSpeakers = [...speakers, customSpeaker.trim()];
                    setSpeakers(newSpeakers);
                    localStorage.setItem('sermonSpeakers', JSON.stringify(newSpeakers));
                    handleChange('speaker', customSpeaker.trim());
                    setShowCustomSpeaker(false);
                    setCustomSpeaker('');
                  }
                }}
              >
                Add
              </Button>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <Input id="date" type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} />
        </div>
        <div>
          <label htmlFor="scripture" className="block text-sm font-medium text-gray-700 mb-1">Scripture(s)</label>
          <Input id="scripture" value={formData.scripture} onChange={e => handleChange('scripture', e.target.value)} />
        </div>
        <div>
          <label htmlFor="series" className="block text-sm font-medium text-gray-700 mb-1">Series</label>
          <Input id="series" value={formData.series} onChange={e => handleChange('series', e.target.value)} />
        </div>
        <div>
          <label htmlFor="youtube_url" className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
          <Input id="youtube_url" type="url" value={formData.youtube_url} onChange={e => handleChange('youtube_url', e.target.value)} />
        </div>
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">Start Time (seconds)</label>
          <Input id="start_time" value={formData.start_time} onChange={e => handleChange('start_time', e.target.value)} placeholder="e.g., 90" />
        </div>
        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">End Time (seconds)</label>
          <Input id="end_time" value={formData.end_time} onChange={e => handleChange('end_time', e.target.value)} placeholder="e.g., 300" />
        </div>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger className="w-full md:w-1/2">
                <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Draft">Draft (Hidden)</SelectItem>
                <SelectItem value="Live">Live (For Live Stream)</SelectItem>
                <SelectItem value="Active">Active (For Latest Sermon)</SelectItem>
                <SelectItem value="Inactive">Inactive (For Sermon Archive)</SelectItem>
            </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">Note: Only one sermon should be 'Live' and one 'Active' at a time.</p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <Textarea id="notes" value={formData.notes} onChange={e => handleChange('notes', e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end space-x-4 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
          {sermon ? 'Save Changes' : 'Create Sermon'}
        </Button>
      </div>
    </form>
  );
}
