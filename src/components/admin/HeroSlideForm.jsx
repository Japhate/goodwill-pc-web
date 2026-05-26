import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { localApi } from "@/api/localApiClient";
import { Loader2, Upload } from "lucide-react";

export default function HeroSlideForm({ slide, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    image_url: "",
    alt_text: "",
    link_url: "",
    link_label: "",
    order: 0,
    is_active: true,
    ...slide,
  });
  const [uploading, setUploading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await localApi.integrations.Core.UploadFile({ file, destination: "heroImage" });
    handleChange("image_url", file_url);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, order: Number(formData.order) });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{slide ? "Edit Slide" : "Add New Slide"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload or URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Image *</label>
            <div className="flex gap-2 mb-2">
              <label className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md text-sm transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Image
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              <span className="text-gray-400 self-center text-sm">or paste URL below</span>
            </div>
            <Input
              value={formData.image_url}
              onChange={(e) => handleChange("image_url", e.target.value)}
              placeholder="https://..."
              required
            />
            {formData.image_url && (
              <img src={formData.image_url} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-md border" />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description / Alt Text</label>
            <Input
              value={formData.alt_text}
              onChange={(e) => handleChange("alt_text", e.target.value)}
              placeholder="e.g. Join us for Wednesday Zoom Bible Study"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Link URL (optional)</label>
            <Input
              value={formData.link_url}
              onChange={(e) => handleChange("link_url", e.target.value)}
              placeholder="e.g. https://us02web.zoom.us/j/..."
            />
            <p className="text-xs text-gray-500 mt-1">When set, clicking the slide will open this link in a new tab.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Link Button Label (optional)</label>
            <Input
              value={formData.link_label}
              onChange={(e) => handleChange("link_label", e.target.value)}
              placeholder="e.g. Join Zoom Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Display Order</label>
            <Input
              type="number"
              value={formData.order}
              onChange={(e) => handleChange("order", e.target.value)}
              placeholder="0"
              className="w-28"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first.</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(val) => handleChange("is_active", val)}
            />
            <label className="text-sm font-semibold text-gray-700">Active (show on homepage)</label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 flex-1">
              {slide ? "Save Changes" : "Add Slide"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
