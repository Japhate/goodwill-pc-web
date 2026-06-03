import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EyeOff, ExternalLink, GripVertical, Link, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

function SlideGrid({
  title,
  emptyMessage,
  slides,
  selectedIds,
  onToggleSelected,
  onToggleAll,
  onEdit,
  onDelete,
  onHide,
  onRestore,
  onBulkHide,
  onBulkRestore,
  onBulkDelete,
  onReorder,
  mode,
}) {
  const allSelected = slides.length > 0 && selectedIds.length === slides.length;
  const isDraggable = mode === "visible" && typeof onReorder === "function";

  const handleDragStart = (event, slideId) => {
    if (!isDraggable) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(slideId));
  };

  const handleDragOver = (event) => {
    if (!isDraggable) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event, targetId) => {
    if (!isDraggable) return;
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === String(targetId)) return;

    const fromIndex = slides.findIndex((slide) => String(slide.id) === draggedId);
    const toIndex = slides.findIndex((slide) => String(slide.id) === String(targetId));
    if (fromIndex < 0 || toIndex < 0) return;

    const reorderedSlides = [...slides];
    const [movedSlide] = reorderedSlides.splice(fromIndex, 1);
    reorderedSlides.splice(toIndex, 0, movedSlide);
    onReorder(reorderedSlides);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{slides.length} {slides.length === 1 ? "slide" : "slides"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {slides.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
              />
              Select all
            </label>
          )}
          {selectedIds.length > 0 && mode === "visible" && (
            <Button
              variant="outline"
              onClick={onBulkHide}
              className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <EyeOff className="h-4 w-4" /> Hide Selected ({selectedIds.length})
            </Button>
          )}
          {selectedIds.length > 0 && mode === "hidden" && (
            <>
              <Button
                variant="outline"
                onClick={onBulkRestore}
                className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <RotateCcw className="h-4 w-4" /> Restore Selected ({selectedIds.length})
              </Button>
              <Button
                variant="outline"
                onClick={onBulkDelete}
                className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete Selected ({selectedIds.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {slides.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide, index) => (
            <Card
              key={slide.id}
              draggable={isDraggable}
              onDragStart={(event) => handleDragStart(event, slide.id)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, slide.id)}
              className={`overflow-hidden ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${selectedIds.includes(slide.id) ? "ring-2 ring-amber-500" : ""}`}
            >
              <div className="relative">
                <div className="flex aspect-[48/19] w-full items-center justify-center bg-gray-950">
                  <img
                    src={slide.image_url}
                    alt={slide.alt_text || "Slide"}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute bottom-2 left-2 rounded bg-white/95 p-2 shadow-sm">
                  <Checkbox
                    checked={selectedIds.includes(slide.id)}
                    onCheckedChange={(checked) => onToggleSelected(slide.id, checked === true)}
                    aria-label={`Select ${slide.alt_text || "slide"}`}
                  />
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  {slide.is_priority_announcement && (
                    <Badge className="bg-red-600">Priority</Badge>
                  )}
                  <Badge className={mode === "visible" ? "bg-green-600" : "bg-gray-500"}>
                    {mode === "visible" ? "Visible" : "Hidden"}
                  </Badge>
                </div>
                <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                  #{index + 1}
                </div>
                {isDraggable && (
                  <div className="absolute bottom-2 right-2 rounded bg-white/95 p-2 text-gray-700 shadow-sm" title="Drag to reorder">
                    <GripVertical className="h-4 w-4" />
                  </div>
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                <p className="truncate text-sm font-medium text-gray-800">{slide.alt_text || "No description"}</p>
                {slide.link_url ? (
                  <div className="flex items-center gap-1 truncate text-xs text-blue-600">
                    <Link className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{slide.link_label || slide.link_url}</span>
                    <a href={slide.link_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No link</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => onEdit(slide)} className="flex-1 gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  {mode === "visible" ? (
                    <Button size="sm" variant="outline" onClick={() => onHide([slide.id])} className="gap-1 border-gray-300 text-gray-700 hover:bg-gray-50">
                      <EyeOff className="h-3 w-3" /> Hide
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onRestore([slide.id])} className="gap-1 border-green-300 text-green-700 hover:bg-green-50">
                      <RotateCcw className="h-3 w-3" /> Restore
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onDelete(slide.id)} className="border-red-300 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HeroSlideList({
  slides,
  onEdit,
  onDelete,
  onDeleteSelected,
  onAddNew,
  onHideSelected,
  onRestoreSelected,
  onReorderVisible,
}) {
  const [selectedVisibleIds, setSelectedVisibleIds] = useState([]);
  const [selectedHiddenIds, setSelectedHiddenIds] = useState([]);

  const visibleSlides = useMemo(
    () => slides.filter((slide) => slide.is_active !== false),
    [slides]
  );
  const hiddenSlides = useMemo(
    () => slides.filter((slide) => slide.is_active === false),
    [slides]
  );

  useEffect(() => {
    const visibleIds = new Set(visibleSlides.map((slide) => slide.id));
    const hiddenIds = new Set(hiddenSlides.map((slide) => slide.id));
    setSelectedVisibleIds((ids) => ids.filter((id) => visibleIds.has(id)));
    setSelectedHiddenIds((ids) => ids.filter((id) => hiddenIds.has(id)));
  }, [visibleSlides, hiddenSlides]);

  const toggleVisibleSelected = (id, checked) => {
    setSelectedVisibleIds((ids) => (
      checked ? [...new Set([...ids, id])] : ids.filter((selectedId) => selectedId !== id)
    ));
  };

  const toggleHiddenSelected = (id, checked) => {
    setSelectedHiddenIds((ids) => (
      checked ? [...new Set([...ids, id])] : ids.filter((selectedId) => selectedId !== id)
    ));
  };

  const hideSlides = async (ids) => {
    const changed = await onHideSelected(ids);
    if (changed) setSelectedVisibleIds((selectedIds) => selectedIds.filter((id) => !ids.includes(id)));
  };

  const restoreSlides = async (ids) => {
    const changed = await onRestoreSelected(ids);
    if (changed) setSelectedHiddenIds((selectedIds) => selectedIds.filter((id) => !ids.includes(id)));
  };

  const deleteVisibleSelected = async () => {
    const deleted = await onDeleteSelected(selectedVisibleIds);
    if (deleted) setSelectedVisibleIds([]);
  };

  const deleteHiddenSelected = async () => {
    const deleted = await onDeleteSelected(selectedHiddenIds);
    if (deleted) setSelectedHiddenIds([]);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hero Slideshow Images</h2>
          <p className="text-sm text-gray-500">Hide slides to keep them reusable without showing them on the homepage.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedVisibleIds.length > 0 && (
            <Button
              variant="outline"
              onClick={deleteVisibleSelected}
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete Selected ({selectedVisibleIds.length})
            </Button>
          )}
          <Button onClick={onAddNew} className="gap-2 bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4" /> Add Slide
          </Button>
        </div>
      </div>

      <SlideGrid
        title="Visible Images"
        emptyMessage="No visible slides. Restore a hidden slide or add a new one."
        slides={visibleSlides}
        selectedIds={selectedVisibleIds}
        onToggleSelected={toggleVisibleSelected}
        onToggleAll={(checked) => setSelectedVisibleIds(checked ? visibleSlides.map((slide) => slide.id) : [])}
        onEdit={onEdit}
        onDelete={onDelete}
        onHide={hideSlides}
        onRestore={restoreSlides}
        onBulkHide={() => hideSlides(selectedVisibleIds)}
        onBulkRestore={() => restoreSlides(selectedHiddenIds)}
        onBulkDelete={deleteVisibleSelected}
        onReorder={onReorderVisible}
        mode="visible"
      />

      <SlideGrid
        title="Hidden Images"
        emptyMessage="No hidden hero images."
        slides={hiddenSlides}
        selectedIds={selectedHiddenIds}
        onToggleSelected={toggleHiddenSelected}
        onToggleAll={(checked) => setSelectedHiddenIds(checked ? hiddenSlides.map((slide) => slide.id) : [])}
        onEdit={onEdit}
        onDelete={onDelete}
        onHide={hideSlides}
        onRestore={restoreSlides}
        onBulkHide={() => hideSlides(selectedVisibleIds)}
        onBulkRestore={() => restoreSlides(selectedHiddenIds)}
        onBulkDelete={deleteHiddenSelected}
        mode="hidden"
      />
    </div>
  );
}
