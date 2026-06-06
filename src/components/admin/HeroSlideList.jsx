import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp, CalendarDays, Clock, EyeOff, ExternalLink, GripVertical, Grid2X2, Link, List, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

function formatDateLabel(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(value) {
  if (!value) return "";
  const [hourValue, minuteValue = "0"] = String(value).split(":").map(Number);
  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) return value;
  const suffix = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${suffix}`;
}

function getScheduleDetails(slide, getLinkedAnnouncementForSlide) {
  const announcement = getLinkedAnnouncementForSlide?.(slide) || {};
  const startDate = announcement.date || slide.date || "";
  const endDate = announcement.end_date || slide.end_date || "";
  const startTime = announcement.time || slide.time || "";
  const endTime = announcement.end_time || slide.end_time || "";

  return {
    startDate: formatDateLabel(startDate),
    endDate: formatDateLabel(endDate),
    startTime: formatTimeLabel(startTime),
    endTime: formatTimeLabel(endTime),
  };
}

function ScheduleDetails({ slide, getLinkedAnnouncementForSlide, compact = false }) {
  const schedule = getScheduleDetails(slide, getLinkedAnnouncementForSlide);
  const dateText = [
    schedule.startDate ? `Start: ${schedule.startDate}` : "",
    schedule.endDate ? `End: ${schedule.endDate}` : "",
  ].filter(Boolean).join(" | ");
  const timeText = [
    schedule.startTime ? `Start: ${schedule.startTime}` : "",
    schedule.endTime ? `End: ${schedule.endTime}` : "",
  ].filter(Boolean).join(" | ");

  if (!dateText && !timeText) return null;

  return (
    <div className={`min-w-0 space-y-0.5 text-xs leading-tight text-gray-600 ${compact ? "max-w-full" : "shrink-0 text-right"}`}>
      {dateText && (
        <div className={`flex items-start gap-1.5 ${compact ? "" : "justify-end"}`}>
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" />
          <span className="min-w-0">{dateText}</span>
        </div>
      )}
      {timeText && (
        <div className={`flex items-start gap-1.5 ${compact ? "" : "justify-end"}`}>
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" />
          <span className="min-w-0">{timeText}</span>
        </div>
      )}
    </div>
  );
}

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
  viewMode,
  mode,
  hideSelectAll = false,
  getLinkedAnnouncementForSlide,
}) {
  const allSelected = slides.length > 0 && selectedIds.length === slides.length;
  const isDraggable = mode === "visible" && typeof onReorder === "function";
  const slideStateLabel = mode === "visible" ? "active" : "inactive";

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

  const moveSlide = (fromIndex, direction) => {
    if (!isDraggable) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= slides.length) return;

    const reorderedSlides = [...slides];
    const [movedSlide] = reorderedSlides.splice(fromIndex, 1);
    reorderedSlides.splice(toIndex, 0, movedSlide);
    onReorder(reorderedSlides);
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {title && <h3 className="text-xl font-bold text-gray-900">{title}</h3>}
          {title && (
            <p className="text-sm text-gray-500">
              {slides.length} {slideStateLabel} {slides.length === 1 ? "slide" : "slides"}
              {mode === "visible" && slides.length > 1 ? ". You may drag and drop cards or use arrows to reorder" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hideSelectAll && slides.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
              />
              Select all
            </label>
          )}
          {!hideSelectAll && selectedIds.length > 0 && mode === "visible" && (
            <Button
              variant="outline"
              onClick={onBulkHide}
              className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <EyeOff className="h-4 w-4" /> Hide Selected ({selectedIds.length})
            </Button>
          )}
          {!hideSelectAll && selectedIds.length > 0 && mode === "hidden" && (
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
          <CardContent className="py-3 text-center text-gray-500">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {slides.map((slide, index) => (
            <Card
              key={slide.id}
              draggable={isDraggable}
              onDragStart={(event) => handleDragStart(event, slide.id)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, slide.id)}
              className={`overflow-hidden ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${selectedIds.includes(slide.id) ? "ring-2 ring-amber-500" : ""}`}
            >
              <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
                <div className="flex items-center gap-3 md:w-[44%]">
                  <Checkbox
                    checked={selectedIds.includes(slide.id)}
                    onCheckedChange={(checked) => onToggleSelected(slide.id, checked === true)}
                    aria-label={`Select ${slide.alt_text || "slide"}`}
                  />
                  <div className="rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                    #{index + 1}
                  </div>
                  <div className="flex aspect-[48/19] w-40 shrink-0 items-center justify-center rounded bg-gray-950 md:w-52">
                    <img
                      src={slide.image_url}
                      alt={slide.alt_text || "Slide"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {isDraggable && (
                    <GripVertical className="hidden h-5 w-5 shrink-0 text-gray-500 md:block" aria-label="Drag to reorder" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{slide.alt_text || "No description"}</p>
                      {slide.is_priority_announcement && <Badge className="bg-red-600">Priority</Badge>}
                      <Badge className={mode === "visible" ? "bg-green-600" : "bg-gray-500"}>
                        {mode === "visible" ? "Visible" : "Hidden"}
                      </Badge>
                    </div>
                    {slide.link_url ? (
                      <div className="flex items-center gap-1 truncate text-xs text-blue-600">
                        <Link className="h-3 w-3 shrink-0" />
                        <span className="truncate">{slide.link_label || slide.link_url}</span>
                        <a href={slide.link_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No link</p>
                    )}
                  </div>
                  <ScheduleDetails slide={slide} getLinkedAnnouncementForSlide={getLinkedAnnouncementForSlide} />
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {isDraggable && (
                    <div className="flex items-center gap-1 rounded border bg-white p-1 text-gray-700">
                      <button
                        type="button"
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                        className="rounded p-1 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Move earlier"
                        aria-label={`Move ${slide.alt_text || "slide"} earlier`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === slides.length - 1}
                        className="rounded p-1 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Move later"
                        aria-label={`Move ${slide.alt_text || "slide"} later`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onEdit(slide)} className="gap-1">
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
                  {mode === "hidden" && (
                    <Button size="sm" variant="outline" onClick={() => onDelete(slide.id)} className="border-red-300 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-white/95 p-1 text-gray-700 shadow-sm">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Move earlier"
                      aria-label={`Move ${slide.alt_text || "slide"} earlier`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <div className="p-1" title="Drag to reorder">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 1)}
                      disabled={index === slides.length - 1}
                      className="rounded p-1 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Move later"
                      aria-label={`Move ${slide.alt_text || "slide"} later`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
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
                  </div>
                  <ScheduleDetails slide={slide} getLinkedAnnouncementForSlide={getLinkedAnnouncementForSlide} />
                </div>
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
                  {mode === "hidden" && (
                    <Button size="sm" variant="outline" onClick={() => onDelete(slide.id)} className="border-red-300 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
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
  title = "Hero Slideshow Slides",
  description = "Manage homepage slideshow images, ordering, visibility, and linked announcement buttons.",
  visibleTitle = "Visible Slides",
  hiddenTitle = "Hidden Slides",
  addButtonLabel = "Add Slide",
  showVisible = true,
  showHidden = true,
  showHeader = true,
  viewModeOverride = null,
  searchTerm = "",
  selectedVisibleIds: controlledSelectedVisibleIds,
  onSelectedVisibleIdsChange,
  selectedHiddenIds: controlledSelectedHiddenIds,
  onSelectedHiddenIdsChange,
  hideSelectAll = false,
  getLinkedAnnouncementForSlide,
}) {
  const [internalSelectedVisibleIds, setInternalSelectedVisibleIds] = useState([]);
  const [internalSelectedHiddenIds, setInternalSelectedHiddenIds] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const selectedVisibleIds = controlledSelectedVisibleIds ?? internalSelectedVisibleIds;
  const selectedHiddenIds = controlledSelectedHiddenIds ?? internalSelectedHiddenIds;
  const setSelectedVisibleIds = (nextSelection) => {
    if (onSelectedVisibleIdsChange) {
      const resolvedSelection = typeof nextSelection === "function" ? nextSelection(selectedVisibleIds) : nextSelection;
      onSelectedVisibleIdsChange(resolvedSelection);
      return;
    }
    setInternalSelectedVisibleIds(nextSelection);
  };
  const setSelectedHiddenIds = (nextSelection) => {
    if (onSelectedHiddenIdsChange) {
      const resolvedSelection = typeof nextSelection === "function" ? nextSelection(selectedHiddenIds) : nextSelection;
      onSelectedHiddenIdsChange(resolvedSelection);
      return;
    }
    setInternalSelectedHiddenIds(nextSelection);
  };
  const visibleSlideIdSet = useMemo(
    () => new Set(slides.filter((slide) => slide.is_active !== false).map((slide) => slide.id)),
    [slides]
  );
  const hiddenSlideIdSet = useMemo(
    () => new Set(slides.filter((slide) => slide.is_active === false).map((slide) => slide.id)),
    [slides]
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesSearch = (slide) => {
    if (!normalizedSearch) return true;
    const announcement = getLinkedAnnouncementForSlide?.(slide) || {};
    return [
      slide.alt_text,
      slide.link_label,
      slide.link_url,
      slide.image_url,
      announcement.date,
      announcement.end_date,
      announcement.time,
      announcement.end_time,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
  };
  const visibleSlides = useMemo(
    () => slides.filter((slide) => slide.is_active !== false && matchesSearch(slide)),
    [slides, normalizedSearch]
  );
  const hiddenSlides = useMemo(
    () => slides.filter((slide) => slide.is_active === false && matchesSearch(slide)),
    [slides, normalizedSearch]
  );
  const effectiveViewMode = viewModeOverride || viewMode;
  const visibleSlidesInViewSet = new Set(visibleSlides.map((slide) => slide.id));
  const hiddenSlidesInViewSet = new Set(hiddenSlides.map((slide) => slide.id));
  const selectedVisibleIdsInView = selectedVisibleIds.filter((id) => visibleSlidesInViewSet.has(id));
  const selectedHiddenIdsInView = selectedHiddenIds.filter((id) => hiddenSlidesInViewSet.has(id));

  useEffect(() => {
    if (showVisible) {
      setSelectedVisibleIds((ids) => ids.filter((id) => visibleSlideIdSet.has(id)));
    }
    if (showHidden) {
      setSelectedHiddenIds((ids) => ids.filter((id) => hiddenSlideIdSet.has(id)));
    }
  }, [visibleSlideIdSet, hiddenSlideIdSet, showVisible, showHidden]);

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

  const hideVisibleSelected = async () => {
    await hideSlides(selectedVisibleIds);
  };

  const deleteHiddenSelected = async () => {
    const deleted = await onDeleteSelected(selectedHiddenIds);
    if (deleted) setSelectedHiddenIds([]);
  };

  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${viewMode === "grid" ? "bg-amber-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                aria-pressed={viewMode === "grid"}
              >
                <Grid2X2 className="h-4 w-4" /> Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${viewMode === "list" ? "bg-amber-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" /> List
              </button>
            </div>
            {selectedVisibleIds.length > 0 && showVisible && (
              <Button
                variant="outline"
                onClick={hideVisibleSelected}
                className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <EyeOff className="h-4 w-4" /> Move Selected to Hidden ({selectedVisibleIds.length})
              </Button>
            )}
            <Button onClick={onAddNew} className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4" /> {addButtonLabel}
            </Button>
          </div>
        </div>
      )}

      {showVisible && (
        <SlideGrid
          title={visibleTitle}
          emptyMessage="No visible slides. Restore a hidden slide or add a new one."
          slides={visibleSlides}
          selectedIds={selectedVisibleIdsInView}
          onToggleSelected={toggleVisibleSelected}
          onToggleAll={(checked) => setSelectedVisibleIds(checked ? visibleSlides.map((slide) => slide.id) : [])}
          onEdit={onEdit}
          onDelete={onDelete}
          onHide={hideSlides}
          onRestore={restoreSlides}
          onBulkHide={() => hideSlides(selectedVisibleIds)}
          onBulkRestore={() => restoreSlides(selectedHiddenIds)}
          onBulkDelete={hideVisibleSelected}
          onReorder={onReorderVisible}
          viewMode={effectiveViewMode}
          mode="visible"
          hideSelectAll={hideSelectAll}
          getLinkedAnnouncementForSlide={getLinkedAnnouncementForSlide}
        />
      )}

      {showHidden && (
        <SlideGrid
          title={hiddenTitle}
          emptyMessage="No hidden hero slides."
          slides={hiddenSlides}
          selectedIds={selectedHiddenIdsInView}
          onToggleSelected={toggleHiddenSelected}
          onToggleAll={(checked) => setSelectedHiddenIds(checked ? hiddenSlides.map((slide) => slide.id) : [])}
          onEdit={onEdit}
          onDelete={onDelete}
          onHide={hideSlides}
          onRestore={restoreSlides}
          onBulkHide={() => hideSlides(selectedVisibleIds)}
          onBulkRestore={() => restoreSlides(selectedHiddenIds)}
          onBulkDelete={deleteHiddenSelected}
          viewMode={effectiveViewMode}
          mode="hidden"
          hideSelectAll={hideSelectAll}
          getLinkedAnnouncementForSlide={getLinkedAnnouncementForSlide}
        />
      )}
    </div>
  );
}
