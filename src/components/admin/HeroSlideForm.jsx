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
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadError, setUploadError] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadError("");
    try {
      const uploaded = await Promise.all(
        files.map((file) => localApi.integrations.Core.UploadFile({ file, destination: "heroImage" }))
      );
      const imageUrls = uploaded.map(({ file_url }) => file_url);
      setUploadedImages(imageUrls);
      handleChange("image_url", imageUrls[0] || "");
    } catch (error) {
      console.error("Hero image upload failed:", error);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const order = Number(formData.order);

    if (uploadedImages.length > 1) {
      onSubmit(uploadedImages.map((imageUrl, index) => ({
        ...formData,
        image_url: imageUrl,
        order: order + index,
      })));
      return;
    }

    onSubmit({ ...formData, order });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{slide ? "Edit Slide" : "Add New Slide"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Images *
            </label>
            <div className="flex gap-2 mb-2">
              <label className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md text-sm transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Images
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              <span className="text-gray-400 self-center text-sm">
                select one or several, or paste one URL below
              </span>
            </div>
            <Input
              value={formData.image_url}
              onChange={(e) => {
                setUploadedImages([]);
                handleChange("image_url", e.target.value);
              }}
              placeholder="https://..."
              required
            />
            {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
            {uploadedImages.length > 1 ? (
              <>
                <p className="text-xs text-green-700 mt-2">
                  {slide
                    ? `${uploadedImages.length} images ready. The first will update this slide and the others will be added as new slides.`
                    : `${uploadedImages.length} images ready. Each image will be created as its own slide.`}
                </p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uploadedImages.map((imageUrl, index) => (
                    <img key={imageUrl} src={imageUrl} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-md border" />
                  ))}
                </div>
              </>
            ) : formData.image_url && (
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
            <p className="text-xs text-gray-500 mt-1">
              {uploadedImages.length > 1
                ? `Lower numbers appear first. This batch will use orders ${Number(formData.order)} through ${Number(formData.order) + uploadedImages.length - 1}.`
                : "Lower numbers appear first."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(val) => handleChange("is_active", val)}
            />
            <label className="text-sm font-semibold text-gray-700">Active (show on homepage)</label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 flex-1" disabled={uploading}>
              {slide
                ? uploadedImages.length > 1 ? `Save And Add ${uploadedImages.length - 1} Slides` : "Save Changes"
                : uploadedImages.length > 1 ? `Add ${uploadedImages.length} Slides` : "Add Slide"}
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
