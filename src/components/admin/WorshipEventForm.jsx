import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function WorshipEventForm({ event, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(event || {
    title: "",
    event_date: "",
    month_group: "November 2025",
    description: "",
    is_completed: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{event ? "Edit Worship Event" : "Add New Worship Event"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              required
              placeholder="e.g., Bible Study"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Date *
            </label>
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => handleChange("event_date", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month Group *
            </label>
            <Select
              value={formData.month_group}
              onValueChange={(value) => handleChange("month_group", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select month group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ongoing Events">Ongoing Events</SelectItem>
                <SelectItem value="October 2025">October 2025</SelectItem>
                <SelectItem value="November 2025">November 2025</SelectItem>
                <SelectItem value="December 2025">December 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="e.g., 3:00-5:00 p.m."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_completed"
              checked={formData.is_completed}
              onCheckedChange={(checked) => handleChange("is_completed", checked)}
            />
            <label
              htmlFor="is_completed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mark as completed
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
              {event ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}