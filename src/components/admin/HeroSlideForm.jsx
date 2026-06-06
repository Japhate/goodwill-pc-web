import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localApi } from "@/api/localApiClient";
import { Loader2, Upload } from "lucide-react";
import ConfirmedDateTimePicker from "@/components/admin/ConfirmedDateTimePicker";

const HERO_IMAGE_MAX_WIDTH = 1920;
const HERO_IMAGE_MAX_HEIGHT = 1080;
const HERO_IMAGE_QUALITIES = [0.72, 0.66, 0.6, 0.54];
const HERO_IMAGE_TARGET_BYTES = 420 * 1024;
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
  meeting_id: "",
  meeting_passcode: "",
  directions_url: "",
  file_upload: "",
  file_label: "",
  category: "church_wide",
  status: "Active",
};
const RELATED_ANNOUNCEMENT_DEFAULT_ONLY_FIELDS = new Set(["category", "status", "location_type"]);

function hasRelatedAnnouncementDraftStarted(draft) {
  return Object.entries(draft).some(([field, value]) => {
    if (RELATED_ANNOUNCEMENT_DEFAULT_ONLY_FIELDS.has(field)) return false;
    return String(value || "").trim() !== "";
  });
}

function getScaledImageSize(sourceWidth, sourceHeight, maxWidth, maxHeight) {
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
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

async function canvasToOptimizedHeroBlob(canvas) {
  let smallestBlob = null;

  for (const quality of HERO_IMAGE_QUALITIES) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    smallestBlob = !smallestBlob || blob.size < smallestBlob.size ? blob : smallestBlob;
    if (blob.size <= HERO_IMAGE_TARGET_BYTES) return blob;
  }

  return smallestBlob;
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
  return `${baseName}-optimized.jpg`;
}

async function prepareHeroImageForUpload(file) {
  const image = await loadImageElement(file);
  const imageSize = getScaledImageSize(image.naturalWidth, image.naturalHeight, HERO_IMAGE_MAX_WIDTH, HERO_IMAGE_MAX_HEIGHT);

  const canvas = document.createElement("canvas");
  canvas.width = imageSize.width;
  canvas.height = imageSize.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare this hero image.");

  context.drawImage(image, 0, 0, imageSize.width, imageSize.height);

  const blob = await canvasToOptimizedHeroBlob(canvas);
  return new File([blob], optimizedHeroFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function getInitialAnnouncementDraft(announcement) {
  if (!announcement) return DEFAULT_RELATED_ANNOUNCEMENT;
  return {
    ...DEFAULT_RELATED_ANNOUNCEMENT,
    ...announcement,
    date: announcement.date ? new Date(announcement.date).toISOString().split("T")[0] : "",
    end_date: announcement.end_date ? new Date(announcement.end_date).toISOString().split("T")[0] : "",
  };
}

export default function HeroSlideForm({ slide, announcement, announcementMode = false, defaultOrder = 0, onSubmit, onCancel, onImageUpload, onUnsavedDraftChange }) {
  const isAnnouncementWorkflow = announcementMode || Boolean(announcement && !slide);
  const isLinkedPairEdit = Boolean(slide?.id && announcement?.id);
  const [formData, setFormData] = useState({
    image_url: "",
    alt_text: slide?.alt_text || announcement?.title || "",
    link_url: "",
    link_label: "More",
    details_button_label: "More",
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
  const [relatedAnnouncementDraft, setRelatedAnnouncementDraft] = useState(getInitialAnnouncementDraft(announcement));
  const [relatedFileUploading, setRelatedFileUploading] = useState(false);
  const initialFormSnapshot = useMemo(() => JSON.stringify({
    formData: {
      image_url: formData.image_url || "",
      alt_text: formData.alt_text || "",
      link_url: formData.link_url || "",
      link_label: formData.link_label || "",
      details_button_label: formData.details_button_label || "",
      announcement_id: formData.announcement_id || "",
      is_zoom_bible_study: formData.is_zoom_bible_study === true,
      is_priority_announcement: formData.is_priority_announcement === true,
      priority_start: formData.priority_start || "",
      priority_end: formData.priority_end || "",
      order: Number(formData.order) || 0,
      is_active: formData.is_active !== false,
    },
    relatedAnnouncementDraft,
    uploadedImages,
  }), []);

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

  const buildSubmissionPayload = ({ asDraft = false } = {}) => {
    const order = Number(formData.order);
    const hasHeroImage = String(formData.image_url || "").trim() !== "";
    const announcementTitle = String(formData.alt_text || relatedAnnouncementDraft.title || "").trim();
    const fullAnnouncement = String(relatedAnnouncementDraft.content || "").trim();
    const hasRelatedAnnouncement = Boolean(fullAnnouncement) || isAnnouncementWorkflow || isLinkedPairEdit;
    const relatedAnnouncementPayload = hasRelatedAnnouncement
      ? { ...relatedAnnouncementDraft, title: announcementTitle, content: fullAnnouncement, create: true, status: asDraft ? "Hidden" : relatedAnnouncementDraft.status || "Active" }
      : null;
    const slideData = {
      ...(hasRelatedAnnouncement ? { ...formData, announcement_id: "" } : formData),
      is_active: asDraft ? false : formData.is_active,
    };
    const announcementData = {
      ...relatedAnnouncementDraft,
      title: announcementTitle || (asDraft ? "Draft announcement" : ""),
      content: fullAnnouncement || (asDraft ? "Draft saved from the admin panel." : ""),
      status: asDraft ? "Hidden" : relatedAnnouncementDraft.status || "Active",
    };

    if (asDraft && !hasHeroImage && !announcementTitle && !hasRelatedAnnouncement) return null;

    if ((isAnnouncementWorkflow || isLinkedPairEdit) && (hasHeroImage || asDraft)) {
      return {
        __hero_with_announcement: hasHeroImage,
        __announcement_only: !hasHeroImage,
        announcement: announcementData,
        slide: hasHeroImage ? {
          ...slideData,
          order,
          announcement_id: announcement?.id || slideData.announcement_id || "",
        } : undefined,
      };
    }

    if (!hasHeroImage) {
      return {
        __announcement_only: true,
        announcement: announcementData,
      };
    }

    if (uploadedImages.length > 1) {
      return uploadedImages.map((imageUrl, index) => ({
        ...slideData,
        image_url: imageUrl,
        order: order + index,
        related_announcement_draft: index === 0 ? relatedAnnouncementPayload : null,
      }));
    }

    return { ...slideData, order, related_announcement_draft: relatedAnnouncementPayload };
  };

  useEffect(() => {
    const currentSnapshot = JSON.stringify({
      formData: {
        image_url: formData.image_url || "",
        alt_text: formData.alt_text || "",
        link_url: formData.link_url || "",
        link_label: formData.link_label || "",
        details_button_label: formData.details_button_label || "",
        announcement_id: formData.announcement_id || "",
        is_zoom_bible_study: formData.is_zoom_bible_study === true,
        is_priority_announcement: formData.is_priority_announcement === true,
        priority_start: formData.priority_start || "",
        priority_end: formData.priority_end || "",
        order: Number(formData.order) || 0,
        is_active: formData.is_active !== false,
      },
      relatedAnnouncementDraft,
      uploadedImages,
    });
    const hasDraftableContent = Boolean(buildSubmissionPayload({ asDraft: true }));
    onUnsavedDraftChange?.({
      isDirty: currentSnapshot !== initialFormSnapshot && hasDraftableContent,
      draft: buildSubmissionPayload({ asDraft: true }),
    });
  }, [formData, relatedAnnouncementDraft, uploadedImages, initialFormSnapshot, onUnsavedDraftChange]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};

    const hasHeroImage = String(formData.image_url || "").trim() !== "";
    const title = String(formData.alt_text || "").trim();
    const fullAnnouncement = String(relatedAnnouncementDraft.content || "").trim();
    const hasRelatedAnnouncement = Boolean(fullAnnouncement) || isAnnouncementWorkflow || isLinkedPairEdit;
    if (!hasHeroImage && !hasRelatedAnnouncement) {
      nextErrors.image_url = "Add a hero image, full announcement details, or both.";
      nextErrors.related_content = "Enter the full announcement details if this should be an announcement only.";
    }
    if ((hasHeroImage || hasRelatedAnnouncement) && !title) {
      nextErrors.alt_text = "Enter a title.";
    }
    if (isAnnouncementWorkflow && !fullAnnouncement) {
      nextErrors.related_content = "Enter the full announcement details.";
    }
    if (String(formData.link_url || "").trim() && !hasHeroImage) {
      nextErrors.link_url = "Upload or enter a hero image before adding a virtual or external button link.";
    }
    if (hasRelatedAnnouncement) {
      if (!fullAnnouncement) nextErrors.related_content = "Enter the full announcement details.";
    }
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(buildSubmissionPayload());
  };

  const fullAnnouncementDetails = String(relatedAnnouncementDraft.content || "").trim();
  const hasHeroImage = String(formData.image_url || "").trim() !== "";
  const isTitleRequired = hasHeroImage || isAnnouncementWorkflow || isLinkedPairEdit || Boolean(fullAnnouncementDetails);
  const canEditDetailsButtonLabel = Boolean(hasHeroImage && fullAnnouncementDetails);

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>
          {slide ? "Edit Hero Slide & Announcement" : isAnnouncementWorkflow ? "Create or Edit Announcement" : "Create Hero Slide & Announcement"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {Object.values(validationErrors).some(Boolean) && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Please complete the highlighted required fields before saving this slide.
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-lg font-bold text-gray-900">Hero Slide</h3>
                <p className="text-sm text-gray-600">Create or edit the selected hero slide. The title is required for hero slides, announcements, and linked slide announcements.</p>
              </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {slide ? "Hero Image" : "Images"}
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
              Uploaded images are kept intact, converted to optimized JPG, and compressed before they are saved.
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Slide/Announcement Title{isTitleRequired && <span className="ml-1 text-red-600">*</span>}
            </label>
            <Input
              value={formData.alt_text}
              onChange={(e) => handleChange("alt_text", e.target.value)}
              placeholder="e.g. Join us for Wednesday Zoom Bible Study"
              className={validationErrors.alt_text ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {validationErrors.alt_text && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.alt_text}</p>}
            <p className="mt-1 text-xs text-gray-500">
              This title is used for the hero image and accessibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ConfirmedDateTimePicker
              id="related_start_date"
              label="Start Date"
              type="date"
              value={relatedAnnouncementDraft.date}
              onChange={(value) => handleRelatedAnnouncementChange("date", value)}
            />
            <ConfirmedDateTimePicker
              id="related_end_date"
              label="End Date"
              type="date"
              value={relatedAnnouncementDraft.end_date}
              onChange={(value) => handleRelatedAnnouncementChange("end_date", value)}
            />
            <ConfirmedDateTimePicker
              id="related_start_time"
              label="Start Time"
              type="time"
              value={relatedAnnouncementDraft.time}
              onChange={(value) => handleRelatedAnnouncementChange("time", value)}
            />
            <ConfirmedDateTimePicker
              id="related_end_time"
              label="End Time"
              type="time"
              value={relatedAnnouncementDraft.end_time}
              onChange={(value) => handleRelatedAnnouncementChange("end_time", value)}
            />
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
                <option value="both">Physical & Virtual</option>
              </select>
            </div>
            {["virtual", "both"].includes(relatedAnnouncementDraft.location_type || "physical") && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Platform</label>
                  <Input placeholder="e.g. Zoom, Teams, YouTube" value={relatedAnnouncementDraft.virtual_platform} onChange={(e) => handleRelatedAnnouncementChange("virtual_platform", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Link</label>
                  <Input type="url" value={relatedAnnouncementDraft.zoom_link} onChange={(e) => handleRelatedAnnouncementChange("zoom_link", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Meeting ID</label>
                  <Input placeholder="e.g. 820 1333 7566" value={relatedAnnouncementDraft.meeting_id || ""} onChange={(e) => handleRelatedAnnouncementChange("meeting_id", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Passcode</label>
                  <Input placeholder="e.g. 123456" value={relatedAnnouncementDraft.meeting_passcode || ""} onChange={(e) => handleRelatedAnnouncementChange("meeting_passcode", e.target.value)} />
                </div>
              </>
            )}
            {["physical", "both"].includes(relatedAnnouncementDraft.location_type || "physical") && (
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
          </div>
            </div>

            <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">New Announcement Details</h3>
            <p className="mt-2 text-xs text-gray-600">
              Start with the full announcement details. If this box is filled, an announcement is created and linked to the hero image when one is provided.
            </p>
            <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Announcement{(isAnnouncementWorkflow || isLinkedPairEdit || fullAnnouncementDetails) && <span className="ml-1 text-red-600">*</span>}
                  </label>
                  <textarea
                    value={relatedAnnouncementDraft.content}
                    onChange={(e) => handleRelatedAnnouncementChange("content", e.target.value)}
                    rows={7}
                    className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${validationErrors.related_content ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    placeholder="Enter the full announcement that should appear on the Updates page."
                  />
                  {validationErrors.related_content && <p className="mt-1 text-xs font-semibold text-red-600">{validationErrors.related_content}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    Filling this box creates an announcement and links it to the hero image when one is provided.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Details Button Label</label>
                  <Input
                    value={formData.details_button_label || "More"}
                    onChange={(e) => handleChange("details_button_label", e.target.value)}
                    placeholder="More"
                    disabled={!canEditDetailsButtonLabel}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This button appears on the hero image and opens the full announcement. It becomes available after a hero image and full announcement details are both added.
                  </p>
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
          </div>
            </div>
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
