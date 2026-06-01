import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const DEFAULT_POPUP = {
  title: "",
  eyebrow: "Important Church Update",
  message: "",
  detail: "",
  scripture: "",
  time_label: "",
  location: "",
  cta_label: "",
  cta_url: "",
  start_at: "",
  end_at: "",
  priority: 1,
  status: "Active",
  dismissible: true,
};

export default function SitePopupForm({ popup, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({ ...DEFAULT_POPUP, ...popup });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    setFormData({ ...DEFAULT_POPUP, ...popup });
    setValidationErrors({});
  }, [popup]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!String(formData.title || "").trim()) nextErrors.title = "Enter the popup title.";
    if (!String(formData.message || "").trim()) nextErrors.message = "Enter the key message.";
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      ...formData,
      priority: Number(formData.priority) || 1,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5 rounded-lg bg-white p-8 shadow-md" noValidate>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{popup ? "Edit Popup" : "Create Popup"}</h2>
        <p className="mt-1 text-sm text-gray-600">Create a dismissible homepage alert that appears during a scheduled time window.</p>
      </div>
      {Object.values(validationErrors).some(Boolean) && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Please complete the highlighted required fields before saving this popup.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Eyebrow</label>
          <Input value={formData.eyebrow || ""} onChange={(event) => handleChange("eyebrow", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Title<span className="ml-1 text-red-600">*</span></label>
          <Input
            value={formData.title || ""}
            onChange={(event) => handleChange("title", event.target.value)}
            className={validationErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {validationErrors.title && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.title}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Key Message<span className="ml-1 text-red-600">*</span></label>
        <Textarea
          value={formData.message || ""}
          onChange={(event) => handleChange("message", event.target.value)}
          rows={3}
          className={validationErrors.message ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {validationErrors.message && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Additional Detail</label>
        <Textarea value={formData.detail || ""} onChange={(event) => handleChange("detail", event.target.value)} rows={2} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Scripture / Spiritual Note</label>
        <Input value={formData.scripture || ""} onChange={(event) => handleChange("scripture", event.target.value)} placeholder="e.g. Let us consider how to stir up one another to love..." />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Time Label</label>
          <Input value={formData.time_label || ""} onChange={(event) => handleChange("time_label", event.target.value)} placeholder="Today at 10:30 AM" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Location</label>
          <Input value={formData.location || ""} onChange={(event) => handleChange("location", event.target.value)} placeholder="Second Presbyterian Church, Sumter, SC" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Button Label</label>
          <Input value={formData.cta_label || ""} onChange={(event) => handleChange("cta_label", event.target.value)} placeholder="Get Directions" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Button URL</label>
          <Input value={formData.cta_url || ""} onChange={(event) => handleChange("cta_url", event.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Starts</label>
          <Input type="datetime-local" value={formData.start_at || ""} onChange={(event) => handleChange("start_at", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Ends</label>
          <Input type="datetime-local" value={formData.end_at || ""} onChange={(event) => handleChange("end_at", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Priority</label>
          <Input type="number" value={formData.priority ?? 1} onChange={(event) => handleChange("priority", event.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Status</label>
          <Select value={formData.status || "Active"} onValueChange={(value) => handleChange("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 rounded-md border bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            <Switch checked={formData.dismissible !== false} onCheckedChange={(value) => handleChange("dismissible", value)} />
            Visitor can dismiss once
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700">{popup ? "Save Popup" : "Create Popup"}</Button>
      </div>
    </form>
  );
}
