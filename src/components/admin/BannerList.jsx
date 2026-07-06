import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarClock, Check, Pencil, Trash2, Copy, Plus, X } from "lucide-react";

export default function BannerList({
  banners,
  automaticBanners = [],
  onAddNew,
  onEdit,
  onDelete,
  onDuplicate,
  onEditAutomaticBanner,
  onUpdateAutomaticBannerMessage,
}) {
  const [editingAutomaticBannerId, setEditingAutomaticBannerId] = useState("");
  const [automaticBannerDraft, setAutomaticBannerDraft] = useState({});
  const [savingAutomaticBannerId, setSavingAutomaticBannerId] = useState("");

  const beginAutomaticMessageEdit = (banner) => {
    const source = banner.source || {};
    setEditingAutomaticBannerId(banner.id);
    setAutomaticBannerDraft({
      live_banner_message: banner.message || source.live_banner_message || "",
      date: source.date || "",
      end_date: source.end_date || "",
      time: source.time || "",
      end_time: source.end_time || "",
      frequency: source.frequency || "",
      status: source.status || "Active",
      location_type: source.location_type || "physical",
      location: source.location || "",
      virtual_platform: source.virtual_platform || "",
      zoom_link: source.zoom_link || "",
      chat_link: source.chat_link || "",
      one_tap_mobile: source.one_tap_mobile || "",
      call_in_numbers: source.call_in_numbers || "",
      meeting_id: source.meeting_id || "",
      meeting_passcode: source.meeting_passcode || "",
      contact_email: source.contact_email || "",
      contact_phone: source.contact_phone || "",
      directions_url: source.directions_url || "",
    });
  };

  const cancelAutomaticMessageEdit = () => {
    setEditingAutomaticBannerId("");
    setAutomaticBannerDraft({});
  };

  const updateAutomaticBannerDraft = (field, value) => {
    setAutomaticBannerDraft((draft) => ({ ...draft, [field]: value }));
  };

  const saveAutomaticMessage = async (banner) => {
    const nextMessage = String(automaticBannerDraft.live_banner_message || "").trim();
    if (!nextMessage) return;

    setSavingAutomaticBannerId(banner.id);
    try {
      await onUpdateAutomaticBannerMessage?.(banner, {
        ...automaticBannerDraft,
        live_banner_message: nextMessage,
      });
      cancelAutomaticMessageEdit();
    } finally {
      setSavingAutomaticBannerId("");
    }
  };

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Homepage Banners</CardTitle>
        <Button onClick={onAddNew} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Banner
        </Button>
      </CardHeader>
      <CardContent>
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-950">Manual Ticker Messages</h3>
            <Badge className="bg-green-600 text-white">{banners.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Message</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner, index) => (
                  <tr key={banner.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 max-w-md">
                      <p className="truncate">{banner.message}</p>
                      {banner.is_special_service_banner && (
                        <p className="mt-1 text-xs font-semibold text-amber-700">Special service homepage banner</p>
                      )}
                      {banner.is_bible_study_live_banner && (
                        <p className="mt-1 text-xs font-semibold text-amber-700">Timed Zoom Bible Study banner</p>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge className={
                        banner.status === "live" ? "bg-red-500" :
                        banner.status === "active" ? "bg-green-500" : 
                        "bg-gray-400"
                      }>
                        {banner.status === "live" ? "Live" :
                         banner.status === "active" ? "Active" : 
                         "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-2 text-right space-x-2">
                      <Button
                        onClick={() => onEdit(banner)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => onDuplicate(banner)}
                        variant="outline"
                        size="sm"
                        className="text-purple-600"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => onDelete(banner.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">Automatic Live Banners</h3>
              <p className="mt-1 text-sm leading-5 text-amber-900">
                YouTube live detection and scheduled hero-slide events can temporarily replace the normal homepage ticker.
              </p>
            </div>
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-950">Automatic Live Banners</h3>
            <Badge className="bg-amber-600 text-white">{automaticBanners.length}</Badge>
          </div>
          <div className="space-y-3">
            {automaticBanners.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No scheduled hero-slide live banners found.
              </div>
            ) : (
              automaticBanners.map((banner) => {
                    const isEditingMessage = editingAutomaticBannerId === banner.id;
                    const isSaving = savingAutomaticBannerId === banner.id;

                    return (
                      <article key={banner.id} className="rounded-lg border bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-gray-950">{banner.sourceTitle}</h4>
                              <Badge className={banner.isEnabled ? (banner.isLiveNow ? "bg-red-600" : "bg-blue-600") : "bg-gray-400"}>
                                {banner.isEnabled ? (banner.isYoutubeLiveBanner ? "Automatic" : (banner.isLiveNow ? "Live Now" : "Scheduled")) : "Disabled"}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{banner.sourceLabel}</p>
                          </div>
                          {!isEditingMessage && (
                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => beginAutomaticMessageEdit(banner)} variant="outline" size="sm" className="text-blue-600">
                                <Pencil className="mr-1.5 h-4 w-4" /> Edit
                              </Button>
                              {!banner.isYoutubeLiveBanner && (
                                <Button onClick={() => onEditAutomaticBanner?.(banner)} variant="outline" size="sm" className="text-amber-700">
                                  <CalendarClock className="mr-1.5 h-4 w-4" /> Open Source
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditingMessage ? (
                          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <label className="block text-xs font-semibold text-gray-700 sm:col-span-2">
                                Message
                                <Input
                                  value={automaticBannerDraft.live_banner_message || ""}
                                  onChange={(event) => updateAutomaticBannerDraft("live_banner_message", event.target.value)}
                                  className="mt-1 bg-white"
                                />
                              </label>
                              {!banner.isYoutubeLiveBanner && (
                              <>
                              <label className="block text-xs font-semibold text-gray-700">
                                Start Date
                                <Input type="date" value={automaticBannerDraft.date || ""} onChange={(event) => updateAutomaticBannerDraft("date", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                End Date
                                <Input type="date" value={automaticBannerDraft.end_date || ""} onChange={(event) => updateAutomaticBannerDraft("end_date", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Start Time
                                <Input type="time" value={automaticBannerDraft.time || ""} onChange={(event) => updateAutomaticBannerDraft("time", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                End Time
                                <Input type="time" value={automaticBannerDraft.end_time || ""} onChange={(event) => updateAutomaticBannerDraft("end_time", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Frequency
                                <select
                                  value={automaticBannerDraft.frequency || ""}
                                  onChange={(event) => updateAutomaticBannerDraft("frequency", event.target.value)}
                                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="">No repeat</option>
                                  <option value="Daily">Daily</option>
                                  <option value="Weekly">Weekly</option>
                                  <option value="Monthly">Monthly</option>
                                  <option value="Every weekday">Every weekday</option>
                                  <option value="Every evening">Every evening</option>
                                </select>
                              </label>
                              </>
                              )}
                              <label className="block text-xs font-semibold text-gray-700">
                                Status
                                <select
                                  value={automaticBannerDraft.status || (banner.isYoutubeLiveBanner ? "active" : "Active")}
                                  onChange={(event) => updateAutomaticBannerDraft("status", event.target.value)}
                                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  {banner.isYoutubeLiveBanner ? (
                                    <>
                                      <option value="active">Enabled</option>
                                      <option value="inactive">Disabled</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Active">Active</option>
                                      <option value="Hidden">Hidden</option>
                                      <option value="Inactive">Inactive</option>
                                      <option value="Draft">Draft</option>
                                    </>
                                  )}
                                </select>
                              </label>
                            </div>

                            {!banner.isYoutubeLiveBanner && (
                            <details className="mt-4 border-t border-amber-200 pt-3">
                              <summary className="cursor-pointer select-none text-sm font-semibold text-amber-900">
                                Advanced location and contact details
                              </summary>
                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <label className="block text-xs font-semibold text-gray-700">
                                Location Type
                                <select
                                  value={automaticBannerDraft.location_type || "physical"}
                                  onChange={(event) => updateAutomaticBannerDraft("location_type", event.target.value)}
                                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="physical">Physical</option>
                                  <option value="virtual">Virtual</option>
                                  <option value="both">Physical & Virtual</option>
                                </select>
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Platform
                                <Input value={automaticBannerDraft.virtual_platform || ""} onChange={(event) => updateAutomaticBannerDraft("virtual_platform", event.target.value)} className="mt-1 bg-white" placeholder="Zoom, Teams, YouTube" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Join Link
                                <Input type="url" value={automaticBannerDraft.zoom_link || ""} onChange={(event) => updateAutomaticBannerDraft("zoom_link", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Chat Link
                                <Input type="url" value={automaticBannerDraft.chat_link || ""} onChange={(event) => updateAutomaticBannerDraft("chat_link", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                One-Tap Mobile
                                <Input value={automaticBannerDraft.one_tap_mobile || ""} onChange={(event) => updateAutomaticBannerDraft("one_tap_mobile", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700 sm:col-span-2">
                                Call-in Numbers
                                <textarea
                                  value={automaticBannerDraft.call_in_numbers || ""}
                                  onChange={(event) => updateAutomaticBannerDraft("call_in_numbers", event.target.value)}
                                  rows={3}
                                  className="mt-1 flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Meeting ID
                                <Input value={automaticBannerDraft.meeting_id || ""} onChange={(event) => updateAutomaticBannerDraft("meeting_id", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Passcode
                                <Input value={automaticBannerDraft.meeting_passcode || ""} onChange={(event) => updateAutomaticBannerDraft("meeting_passcode", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Place Name
                                <Input value={automaticBannerDraft.location || ""} onChange={(event) => updateAutomaticBannerDraft("location", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Directions Link
                                <Input type="url" value={automaticBannerDraft.directions_url || ""} onChange={(event) => updateAutomaticBannerDraft("directions_url", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Contact Email
                                <Input type="email" value={automaticBannerDraft.contact_email || ""} onChange={(event) => updateAutomaticBannerDraft("contact_email", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              <label className="block text-xs font-semibold text-gray-700">
                                Contact Phone
                                <Input type="tel" value={automaticBannerDraft.contact_phone || ""} onChange={(event) => updateAutomaticBannerDraft("contact_phone", event.target.value)} className="mt-1 bg-white" />
                              </label>
                              </div>
                            </details>
                            )}

                            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-amber-200 pt-4">
                              <Button onClick={cancelAutomaticMessageEdit} variant="outline" size="sm" disabled={isSaving}>
                                <X className="mr-1.5 h-4 w-4" /> Cancel
                              </Button>
                              <Button
                                onClick={() => saveAutomaticMessage(banner)}
                                size="sm"
                                className="bg-green-700 hover:bg-green-800"
                                disabled={isSaving || !String(automaticBannerDraft.live_banner_message || "").trim()}
                              >
                                <Check className="mr-1.5 h-4 w-4" /> {isSaving ? "Saving..." : "Save Banner"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-3 border-t pt-3 md:grid-cols-[minmax(0,1fr)_minmax(14rem,auto)]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live message</p>
                              <p className={`mt-1 text-sm ${banner.message ? "text-gray-800" : "italic text-gray-500"}`}>
                                {banner.message || "No live banner message set"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Schedule</p>
                              <p className="mt-1 text-sm text-gray-700">{banner.scheduleLabel}</p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
              })
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
