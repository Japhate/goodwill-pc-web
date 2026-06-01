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
  const [validationErrors, setValidationErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!String(formData.title || "").trim()) nextErrors.title = "Enter the event title.";
    if (!formData.event_date) nextErrors.event_date = "Choose the event date.";
    if (!formData.month_group) nextErrors.month_group = "Choose the month group.";
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setValidationErrors(prev => ({ ...prev, [field]: "" }));
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{event ? "Edit Worship Event" : "Add New Worship Event"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {Object.values(validationErrors).some(Boolean) && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Please complete the highlighted required fields before saving this event.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title<span className="ml-1 text-red-600">*</span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className={validationErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
              placeholder="e.g., Bible Study"
            />
            {validationErrors.title && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Date<span className="ml-1 text-red-600">*</span>
            </label>
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => handleChange("event_date", e.target.value)}
              className={validationErrors.event_date ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {validationErrors.event_date && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.event_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month Group<span className="ml-1 text-red-600">*</span>
            </label>
            <Select
              value={formData.month_group}
              onValueChange={(value) => handleChange("month_group", value)}
            >
              <SelectTrigger className={validationErrors.month_group ? "border-red-500 focus:ring-red-500" : ""}>
                <SelectValue placeholder="Select month group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ongoing Events">Ongoing Events</SelectItem>
                <SelectItem value="October 2025">October 2025</SelectItem>
                <SelectItem value="November 2025">November 2025</SelectItem>
                <SelectItem value="December 2025">December 2025</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.month_group && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.month_group}</p>}
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
