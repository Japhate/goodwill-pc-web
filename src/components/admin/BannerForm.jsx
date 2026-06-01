import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BannerForm({ banner, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    message: "",
    status: "inactive",
    ...banner,
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (banner) {
      setFormData(banner);
      setValidationErrors({});
    }
  }, [banner]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!String(formData.message || "").trim()) nextErrors.message = "Enter the banner message.";
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{banner ? "Edit Banner" : "Add New Banner"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {Object.values(validationErrors).some(Boolean) && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Please complete the highlighted required fields before saving this banner.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Banner Message<span className="ml-1 text-red-600">*</span></label>
            <Input
              type="text"
              value={formData.message}
              onChange={(e) => {
                setFormData({ ...formData, message: e.target.value });
                setValidationErrors((errors) => ({ ...errors, message: "" }));
              }}
              placeholder="Enter banner message..."
              className={validationErrors.message ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {validationErrors.message && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select
              value={formData.status || "inactive"}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live (Red Priority Ticker)</SelectItem>
                <SelectItem value="active">Active (Standard Ticker)</SelectItem>
                <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Live banners appear first on the homepage ticker with a red background. Active banners show in the standard ticker. Inactive banners are hidden.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
              {banner ? "Update" : "Create"} Banner
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
