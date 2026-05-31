import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Plus, Link, ExternalLink } from "lucide-react";

export default function HeroSlideList({ slides, onEdit, onDelete, onDeleteSelected, onAddNew }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const allSelected = slides.length > 0 && selectedIds.length === slides.length;

  useEffect(() => {
    const displayedIds = new Set(slides.map((slide) => slide.id));
    setSelectedIds((ids) => ids.filter((id) => displayedIds.has(id)));
  }, [slides]);

  const toggleSelected = (id, checked) => {
    setSelectedIds((ids) => (
      checked ? [...new Set([...ids, id])] : ids.filter((selectedId) => selectedId !== id)
    ));
  };

  const toggleAll = (checked) => {
    setSelectedIds(checked ? slides.map((slide) => slide.id) : []);
  };

  const deleteSelected = async () => {
    const deleted = await onDeleteSelected(selectedIds);
    if (deleted) setSelectedIds([]);
  };

  return (
    <div>
      <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
        <h2 className="text-2xl font-bold text-gray-900">Hero Slideshow Images</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {slides.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => toggleAll(checked === true)}
              />
              Select all
            </label>
          )}
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              onClick={deleteSelected}
              className="text-red-600 border-red-300 hover:bg-red-50 gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={onAddNew} className="bg-amber-600 hover:bg-amber-700 gap-2">
            <Plus className="w-4 h-4" /> Add Slide
          </Button>
        </div>
      </div>

      {slides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No slides yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {slides.map((slide) => (
            <Card key={slide.id} className={`overflow-hidden ${selectedIds.includes(slide.id) ? "ring-2 ring-amber-500" : ""}`}>
              <div className="relative">
                <img
                  src={slide.image_url}
                  alt={slide.alt_text || "Slide"}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute bottom-2 left-2 rounded bg-white/95 p-2 shadow-sm">
                  <Checkbox
                    checked={selectedIds.includes(slide.id)}
                    onCheckedChange={(checked) => toggleSelected(slide.id, checked === true)}
                    aria-label={`Select ${slide.alt_text || "slide"}`}
                  />
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  {slide.is_priority_announcement && (
                    <Badge className="bg-red-600">
                      Priority
                    </Badge>
                  )}
                  <Badge className={slide.is_active ? "bg-green-600" : "bg-gray-400"}>
                    {slide.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  #{slide.order ?? 0}
                </div>
              </div>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-gray-800 truncate">{slide.alt_text || "No description"}</p>
                {slide.link_url ? (
                  <div className="flex items-center gap-1 text-xs text-blue-600 truncate">
                    <Link className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{slide.link_label || slide.link_url}</span>
                    <a href={slide.link_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No link</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => onEdit(slide)} className="flex-1 gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete(slide.id)} className="text-red-600 border-red-300 hover:bg-red-50">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
