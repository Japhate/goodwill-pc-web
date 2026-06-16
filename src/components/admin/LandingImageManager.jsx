import { useEffect, useMemo, useState } from "react";
import { ImageUp, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localApi } from "@/api/localApiClient";

const LANDING_IMAGE_ID = "landing-image";

const DEFAULT_LANDING_IMAGE = {
  id: LANDING_IMAGE_ID,
  image_url: "/images/hero/goodwill-presbyterian-church-hero.png",
  alt_text: "Welcome to Goodwill Presbyterian Church",
  link_url: "/About",
  link_label: "Learn More",
  is_active: true,
};

function formatBytes(bytes = 0) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LandingImageManager({ landingImage, onSaved }) {
  const initialImage = landingImage || DEFAULT_LANDING_IMAGE;
  const [formData, setFormData] = useState(initialImage);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const previewImage = previewUrl || formData.image_url || DEFAULT_LANDING_IMAGE.image_url;
  const fileSizeLabel = useMemo(() => formatBytes(selectedFile?.size), [selectedFile]);

  useEffect(() => {
    setFormData(landingImage || DEFAULT_LANDING_IMAGE);
  }, [landingImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setError("");

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      let imageUrl = formData.image_url || DEFAULT_LANDING_IMAGE.image_url;

      if (selectedFile) {
        const uploaded = await localApi.integrations.Core.UploadFile({
          file: selectedFile,
          destination: "landingImage",
        });
        imageUrl = uploaded.file_url;
      }

      const payload = {
        ...DEFAULT_LANDING_IMAGE,
        ...formData,
        id: LANDING_IMAGE_ID,
        image_url: imageUrl,
        alt_text: formData.alt_text || DEFAULT_LANDING_IMAGE.alt_text,
        link_url: formData.link_url || DEFAULT_LANDING_IMAGE.link_url,
        link_label: formData.link_label || DEFAULT_LANDING_IMAGE.link_label,
        is_active: true,
      };

      let saved;
      if (landingImage?.id) {
        saved = await localApi.entities.LandingImage.update(landingImage.id, payload);
      } else {
        saved = await localApi.entities.LandingImage.create(payload);
      }

      setFormData(saved);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      await onSaved?.();
    } catch (saveError) {
      console.error("Landing image save failed:", saveError);
      setError(saveError?.message || "Unable to save landing image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg bg-white p-3 shadow-md">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <ImageUp className="h-5 w-5 text-amber-700" />
            Landing Image
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            This controls the special first hero image with the welcome text. It is stored separately and uploaded without the hero-slide optimization used for regular slides.
          </p>
        </div>
        <Button type="button" onClick={handleSave} disabled={isSaving} className="gap-2 bg-amber-600 hover:bg-amber-700">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Landing Image
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-950">
          <img src={previewImage} alt={formData.alt_text || "Landing image preview"} className="aspect-video w-full object-cover" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Upload landing image</label>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
            <p className="mt-1 text-xs text-gray-500">
              This upload keeps the original file. Use a high-quality 16:9 image with room for text on the left side.
              {fileSizeLabel ? ` Selected file: ${fileSizeLabel}.` : ""}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Alt text</label>
            <Input
              value={formData.alt_text || ""}
              onChange={(event) => setFormData((current) => ({ ...current, alt_text: event.target.value }))}
              placeholder="Welcome to Goodwill Presbyterian Church"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Button label</label>
              <Input
                value={formData.link_label || ""}
                onChange={(event) => setFormData((current) => ({ ...current, link_label: event.target.value }))}
                placeholder="Learn More"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Button link</label>
              <Input
                value={formData.link_url || ""}
                onChange={(event) => setFormData((current) => ({ ...current, link_url: event.target.value }))}
                placeholder="/About"
              />
            </div>
          </div>

          {formData.image_url && (
            <p className="truncate rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500">
              Current image: {formData.image_url}
            </p>
          )}

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
