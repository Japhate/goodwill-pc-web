import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { localApi } from "@/api/localApiClient";
import { Loader2, Upload } from "lucide-react";

const BIBLE_STUDY_ZOOM = "https://us06web.zoom.us/j/82013337566?pwd=mULnQC1Zjg5GWkoTTKGvx3PyAFaCeZ.1";
const HERO_IMAGE_WIDTH = 1920;
const HERO_IMAGE_HEIGHT = 760;
const HERO_IMAGE_QUALITY = 0.82;
const DEFAULT_RELATED_ANNOUNCEMENT = {
  title: "",
  content: "",
  date: "",
  end_date: "",
  time: "",
  end_time: "",
  frequency: "",
  location_type: "physical",
  location: "",
  virtual_platform: "",
  zoom_link: "",
  directions_url: "",
  file_upload: "",
  file_label: "",
  category: "church_wide",
  status: "Active",
};

function getCoverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

function getContainRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Unable to optimize this hero image."));
    }, type, quality);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read this image file."));
    };
    image.src = objectUrl;
  });
}

function optimizedHeroFileName(fileName) {
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-") || "hero-image";
  return `${baseName}-1920x760.jpg`;
}

async function prepareHeroImageForUpload(file) {
  const image = await loadImageElement(file);
  if (image.naturalWidth !== HERO_IMAGE_WIDTH || image.naturalHeight !== HERO_IMAGE_HEIGHT) {
    throw new Error(
      `This image is ${image.naturalWidth}x${image.naturalHeight}. Hero images must be exactly ${HERO_IMAGE_WIDTH}x${HERO_IMAGE_HEIGHT} pixels. Please edit the image to that size and upload it again.`
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = HERO_IMAGE_WIDTH;
  canvas.height = HERO_IMAGE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare this hero image.");

  const coverRect = getCoverRect(image.naturalWidth, image.naturalHeight, HERO_IMAGE_WIDTH, HERO_IMAGE_HEIGHT);
  context.save();
  context.filter = "blur(28px)";
  context.globalAlpha = 0.9;
  context.drawImage(image, coverRect.x, coverRect.y, coverRect.width, coverRect.height);
  context.restore();

  context.fillStyle = "rgba(0, 0, 0, 0.08)";
  context.fillRect(0, 0, HERO_IMAGE_WIDTH, HERO_IMAGE_HEIGHT);

  const containRect = getContainRect(image.naturalWidth, image.naturalHeight, HERO_IMAGE_WIDTH, HERO_IMAGE_HEIGHT);
  context.drawImage(image, containRect.x, containRect.y, containRect.width, containRect.height);

  const blob = await canvasToBlob(canvas, "image/jpeg", HERO_IMAGE_QUALITY);
  return new File([blob], optimizedHeroFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default function HeroSlideForm({ slide, defaultOrder = 0, onSubmit, onCancel, onImageUpload }) {
  const [formData, setFormData] = useState({
    image_url: "",
    alt_text: "",
    link_url: "",
    link_label: "More",
    announcement_id: "",
    is_zoom_bible_study: false,
    is_priority_announcement: false,
    priority_start: "",
    priority_end: "",
    order: defaultOrder,
    is_active: true,
    ...slide,
    is_zoom_bible_study: slide?.is_zoom_bible_study === true
      || slide?.alt_text?.toLowerCase().includes("bible study")
      || slide?.alt_text?.toLowerCase().includes("zoom")
      || slide?.link_url?.includes("zoom.us")
      || slide?.image_url?.toLowerCase().includes("zoom")
      || false,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [announcementOptions, setAnnouncementOptions] = useState([]);
  const [createRelatedAnnouncement, setCreateRelatedAnnouncement] = useState(false);
  const [relatedAnnouncementDraft, setRelatedAnnouncementDraft] = useState(DEFAULT_RELATED_ANNOUNCEMENT);
  const [relatedFileUploading, setRelatedFileUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAnnouncements = async () => {
      try {
        const announcements = await localApi.entities.AnnouncementsEvents.list("-created_date", 200);
        if (!isMounted) return;

        setAnnouncementOptions(
          announcements
            .filter((announcement) => announcement.status !== "Hidden")
            .map((announcement) => ({
              id: announcement.id,
              title: announcement.title || "Untitled announcement",
              status: announcement.status || "Active",
            }))
        );
      } catch (error) {
        console.error("Unable to load announcement options:", error);
        if (isMounted) setAnnouncementOptions([]);
      }
    };

    loadAnnouncements();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleRelatedAnnouncementChange = (field, value) => {
    setRelatedAnnouncementDraft((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [`related_${field}`]: "" }));
  };

  const handleRelatedAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRelatedFileUploading(true);
    try {
      const { file_url } = await localApi.integrations.Core.UploadFile({ file, destination: "announcementFile" });
      setRelatedAnnouncementDraft((prev) => ({
        ...prev,
        file_upload: file_url,
        file_label: prev.file_label || file.name.replace(/\.[^.]+$/, ""),
      }));
    } catch (error) {
      console.error("Related announcement attachment upload failed:", error);
      setUploadError(error?.message || "Attachment upload failed. Please try again.");
    } finally {
      setRelatedFileUploading(false);
    }
  };

  const handleCreateRelatedAnnouncementChange = (checked) => {
    setCreateRelatedAnnouncement(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, announcement_id: "" }));
      setRelatedAnnouncementDraft((prev) => ({
        ...prev,
        title: prev.title || formData.alt_text || "",
        zoom_link: prev.zoom_link || formData.link_url || "",
      }));
    }
    setValidationErrors((prev) => ({
      ...prev,
      related_title: "",
      related_content: "",
    }));
  };

  const handleZoomSlideChange = (checked) => {
    setFormData((prev) => ({
      ...prev,
      is_zoom_bible_study: checked,
      alt_text: checked && !prev.alt_text ? "Join us every Wednesday at 6:30 PM for Zoom Bible Study" : prev.alt_text,
      link_url: checked && !prev.link_url ? BIBLE_STUDY_ZOOM : prev.link_url,
      link_label: checked && (!prev.link_label || prev.link_label === "More") ? "Join Zoom" : prev.link_label,
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadError("");
    try {
      const preparedFiles = await Promise.all(files.map(prepareHeroImageForUpload));
      const uploaded = await Promise.all(
        preparedFiles.map((file) => localApi.integrations.Core.UploadFile({ file, destination: "heroImage" }))
      );
      const imageUrls = uploaded.map(({ file_url }) => file_url);
      setUploadedImages(imageUrls);
      handleChange("image_url", imageUrls[0] || "");
      onImageUpload?.({
        count: imageUrls.length,
        filenames: preparedFiles.map((file) => file.name),
        originalFilenames: files.map((file) => file.name),
        imageUrls,
      });
    } catch (error) {
      console.error("Hero image upload failed:", error);
      setUploadError(error?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const order = Number(formData.order);
    const nextErrors = {};

    if (!String(formData.image_url || "").trim()) nextErrors.image_url = "Upload an image or paste an image URL.";
    if (formData.is_priority_announcement) {
      if (!formData.priority_start) nextErrors.priority_start = "Choose when this priority slide starts.";
      if (!formData.priority_end) nextErrors.priority_end = "Choose when this priority slide ends.";
    }
    if (createRelatedAnnouncement) {
      if (!String(relatedAnnouncementDraft.title || "").trim()) nextErrors.related_title = "Enter the related announcement title.";
      if (!String(relatedAnnouncementDraft.content || "").trim()) nextErrors.related_content = "Enter the related announcement details.";
    }
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const relatedAnnouncementPayload = createRelatedAnnouncement
      ? { ...relatedAnnouncementDraft, create: true }
      : null;

    if (uploadedImages.length > 1) {
      onSubmit(uploadedImages.map((imageUrl, index) => ({
        ...formData,
        image_url: imageUrl,
        order: order + index,
        related_announcement_draft: index === 0 ? relatedAnnouncementPayload : null,
      })));
      return;
    }

    onSubmit({ ...formData, order, related_announcement_draft: relatedAnnouncementPayload });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{slide ? "Edit Slide" : "Add New Slide"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {Object.values(validationErrors).some(Boolean) && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Please complete the highlighted required fields before saving this slide.
            </p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {slide ? "Hero Image" : "Images"}<span className="ml-1 text-red-600">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <label className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md text-sm transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {slide ? "Replace Image" : "Upload Images"}
                <input type="file" accept="image/*" multiple={!slide} className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              <span className="text-gray-400 self-center text-sm">
                {slide ? "choose a new image, or paste a replacement URL below" : "select one or several, or paste one URL below"}
              </span>
            </div>
            <Input
              value={formData.image_url}
              onChange={(e) => {
                setUploadedImages([]);
                handleChange("image_url", e.target.value);
              }}
              placeholder="https://..."
              className={validationErrors.image_url ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {validationErrors.image_url && <p className="text-xs font-semibold text-red-600 mt-2">{validationErrors.image_url}</p>}
            {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Hero images must be exactly 1920x760 pixels. Accepted images are compressed before they are saved.
            </p>
            {uploadedImages.length > 1 ? (
              <>
                <p className="text-xs text-green-700 mt-2">
                  {slide
                    ? `${uploadedImages.length} images ready. The first will update this slide and the others will be added as new slides.`
                    : `${uploadedImages.length} images ready. Each image will be created as its own slide.`}
                </p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={imageUrl} className="flex aspect-[48/19] w-full items-center justify-center rounded-md border bg-gray-950">
                      <img src={imageUrl} alt={`Preview ${index + 1}`} className="h-full w-full object-contain" />
                    </div>
                  ))}
                </div>
              </>
            ) : formData.image_url && (
              <div className="mt-2 flex aspect-[48/19] w-full items-center justify-center rounded-md border bg-gray-950">
                <img src={formData.image_url} alt="Preview" className="h-full w-full object-contain" />
              </div>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Link Button Label (optional)</label>
            <Input
              value={formData.link_label}
              onChange={(e) => handleChange("link_label", e.target.value)}
              placeholder="More"
            />
            <p className="text-xs text-gray-500 mt-1">Defaults to More. You can change it to Read More, Learn More, Join Zoom, or any short action text.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Link URL (optional)</label>
            <Input
              value={formData.link_url}
              onChange={(e) => handleChange("link_url", e.target.value)}
              placeholder="e.g. https://us02web.zoom.us/j/..."
            />
            <p className="text-xs text-gray-500 mt-1">When set, this button opens the link in a new tab.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Related Announcement (optional)</label>
            <select
              value={formData.announcement_id || ""}
              onChange={(e) => {
                handleChange("announcement_id", e.target.value);
                if (e.target.value) setCreateRelatedAnnouncement(false);
              }}
              disabled={createRelatedAnnouncement}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">No related announcement</option>
              {announcementOptions.map((announcement) => (
                <option key={announcement.id} value={announcement.id}>
                  {announcement.title} ({announcement.status})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Adds a Read More button that opens this announcement on the Updates page.
            </p>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={createRelatedAnnouncement}
                onCheckedChange={handleCreateRelatedAnnouncementChange}
              />
              <label className="text-sm font-semibold text-gray-700">Create an announcement for this hero slide</label>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Saves the full announcement to the Updates page and connects this hero slide to it automatically.
            </p>
            {createRelatedAnnouncement && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Announcement Title<span className="ml-1 text-red-600">*</span></label>
                  <Input
                    value={relatedAnnouncementDraft.title}
                    onChange={(e) => handleRelatedAnnouncementChange("title", e.target.value)}
                    className={validationErrors.related_title ? "border-red-500 focus-visible:ring-red-500" : ""}
                    placeholder="e.g. Celebrations, Accomplishments & Thanksgiving Recognition"
                  />
                  {validationErrors.related_title && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.related_title}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Announcement<span className="ml-1 text-red-600">*</span></label>
                  <textarea
                    value={relatedAnnouncementDraft.content}
                    onChange={(e) => handleRelatedAnnouncementChange("content", e.target.value)}
                    rows={7}
                    className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${validationErrors.related_content ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    placeholder="Enter the complete announcement that should appear on the Updates page."
                  />
                  {validationErrors.related_content && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.related_content}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                    <Input type="date" value={relatedAnnouncementDraft.date} onChange={(e) => handleRelatedAnnouncementChange("date", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                    <Input type="date" value={relatedAnnouncementDraft.end_date} onChange={(e) => handleRelatedAnnouncementChange("end_date", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                    <Input type="time" value={relatedAnnouncementDraft.time} onChange={(e) => handleRelatedAnnouncementChange("time", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                    <Input type="time" value={relatedAnnouncementDraft.end_time} onChange={(e) => handleRelatedAnnouncementChange("end_time", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Frequency</label>
                    <Input placeholder="e.g. Daily, Weekly, Every evening" value={relatedAnnouncementDraft.frequency} onChange={(e) => handleRelatedAnnouncementChange("frequency", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Location Type</label>
                    <select
                      value={relatedAnnouncementDraft.location_type || "physical"}
                      onChange={(e) => handleRelatedAnnouncementChange("location_type", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="physical">Physical</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </div>
                  {(relatedAnnouncementDraft.location_type || "physical") === "virtual" ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Platform</label>
                        <Input placeholder="e.g. Zoom, Teams, YouTube" value={relatedAnnouncementDraft.virtual_platform} onChange={(e) => handleRelatedAnnouncementChange("virtual_platform", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Link</label>
                        <Input type="url" value={relatedAnnouncementDraft.zoom_link} onChange={(e) => handleRelatedAnnouncementChange("zoom_link", e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Place Name</label>
                        <Input placeholder="e.g. Goodwill Presbyterian Church" value={relatedAnnouncementDraft.location} onChange={(e) => handleRelatedAnnouncementChange("location", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Google Maps Directions</label>
                        <Input type="url" placeholder="https://maps.google.com/..." value={relatedAnnouncementDraft.directions_url} onChange={(e) => handleRelatedAnnouncementChange("directions_url", e.target.value)} />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={relatedAnnouncementDraft.status}
                      onChange={(e) => handleRelatedAnnouncementChange("status", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="Active">Active</option>
                      <option value="Timeless">Timeless</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Hidden">Hidden</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-md border border-amber-200 bg-white/70 p-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Form / PDF Attachment</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleRelatedAttachmentUpload}
                      disabled={relatedFileUploading}
                      className="max-w-xs"
                    />
                    {relatedFileUploading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
                  </div>
                  {relatedAnnouncementDraft.file_upload && (
                    <div className="mt-3 space-y-2">
                      <Input
                        value={relatedAnnouncementDraft.file_label}
                        onChange={(e) => handleRelatedAnnouncementChange("file_label", e.target.value)}
                        placeholder="Attachment button label"
                      />
                      <p className="text-xs text-gray-500 truncate">Current attachment: {relatedAnnouncementDraft.file_upload}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
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

          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_zoom_bible_study}
                onCheckedChange={handleZoomSlideChange}
              />
              <label className="text-sm font-semibold text-gray-700">Zoom Bible Study slide</label>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Enables the Join Zoom button and the countdown to the next Wednesday Bible Study meeting.
            </p>
          </div>

          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_priority_announcement === true}
                onCheckedChange={(val) => handleChange("is_priority_announcement", val)}
              />
              <label className="text-sm font-semibold text-gray-700">Priority announcement slide</label>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              When active during the scheduled window, this slide is shown by itself and the homepage slideshow does not rotate.
            </p>
            {formData.is_priority_announcement && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Starts<span className="ml-1 text-red-600">*</span></label>
                  <Input
                    type="datetime-local"
                    value={formData.priority_start || ""}
                    onChange={(e) => handleChange("priority_start", e.target.value)}
                    className={validationErrors.priority_start ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {validationErrors.priority_start && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.priority_start}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ends<span className="ml-1 text-red-600">*</span></label>
                  <Input
                    type="datetime-local"
                    value={formData.priority_end || ""}
                    onChange={(e) => handleChange("priority_end", e.target.value)}
                    className={validationErrors.priority_end ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {validationErrors.priority_end && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.priority_end}</p>}
                </div>
              </div>
            )}
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
