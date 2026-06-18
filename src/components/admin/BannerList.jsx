import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Pencil, Trash2, Copy, Plus } from "lucide-react";

export default function BannerList({ banners, automaticBanners = [], onAddNew, onEdit, onDelete, onDuplicate, onEditAutomaticBanner }) {
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
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">Automatic Live Banners</h3>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                These are generated from hero slide form schedules. Edit the source slide and announcement to change the message, date, time, frequency, Zoom link, or visibility.
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-950">Automatic Live Banners</h3>
            <Badge className="bg-amber-600 text-white">{automaticBanners.length}</Badge>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2">Source Slide</th>
                  <th className="text-left p-2">Live Message</th>
                  <th className="text-left p-2">Schedule</th>
                  <th className="text-left p-2">State</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {automaticBanners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-gray-500">
                      No scheduled hero-slide live banners found.
                    </td>
                  </tr>
                ) : (
                  automaticBanners.map((banner) => (
                    <tr key={banner.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 max-w-xs">
                        <p className="truncate font-semibold text-gray-950">{banner.sourceTitle}</p>
                        <p className="mt-1 text-xs text-gray-500">{banner.sourceLabel}</p>
                      </td>
                      <td className="p-2 max-w-md">
                        <p className="truncate">{banner.message}</p>
                      </td>
                      <td className="p-2 text-sm text-gray-700">{banner.scheduleLabel}</td>
                      <td className="p-2">
                        <Badge className={banner.isEnabled ? (banner.isLiveNow ? "bg-red-600" : "bg-blue-600") : "bg-gray-400"}>
                          {banner.isEnabled ? (banner.isLiveNow ? "Live Now" : "Scheduled") : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          onClick={() => onEditAutomaticBanner?.(banner)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
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
      </CardContent>
    </Card>
  );
}
