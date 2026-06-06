import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseLocalDate(value) {
  if (!value) return undefined;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateValue(date) {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

function formatTimeLabel(value) {
  if (!value) return "";
  const [hourValue, minuteValue] = String(value).split(":").map(Number);
  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) return value;
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

export default function ConfirmedDateTimePicker({
  id,
  label,
  type = "date",
  value = "",
  onChange,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(parseLocalDate(value));
  const [draftTime, setDraftTime] = useState(value || "");
  const isDate = type === "date";

  useEffect(() => {
    setDraftDate(parseLocalDate(value));
    setDraftTime(value || "");
  }, [value]);

  const displayValue = useMemo(() => {
    if (!value) return placeholder || (isDate ? "Choose date" : "Choose time");
    if (isDate) {
      const parsedDate = parseLocalDate(value);
      return parsedDate ? format(parsedDate, "MMM d, yyyy") : value;
    }
    return formatTimeLabel(value);
  }, [isDate, placeholder, value]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      setDraftDate(parseLocalDate(value));
      setDraftTime(value || "");
    }
    setOpen(nextOpen);
  };

  const handleConfirm = () => {
    onChange?.(isDate ? formatDateValue(draftDate) : draftTime);
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.("");
    setDraftDate(undefined);
    setDraftTime("");
    setOpen(false);
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className={`h-10 min-w-0 flex-1 justify-start gap-2 px-3 text-left font-semibold ${value ? "text-gray-900" : "text-gray-500"}`}
            >
              {isDate ? <CalendarDays className="h-4 w-4 text-amber-700" /> : <Clock className="h-4 w-4 text-amber-700" />}
              <span className="truncate">{displayValue}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="space-y-3 p-3">
              {isDate ? (
                <Calendar
                  mode="single"
                  selected={draftDate}
                  onSelect={setDraftDate}
                  initialFocus
                />
              ) : (
                <div className="w-56 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <Input
                    type="time"
                    value={draftTime}
                    onChange={(event) => setDraftTime(event.target.value)}
                  />
                  {draftTime && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                      {formatTimeLabel(draftTime)}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-gray-600">
                  <X className="h-4 w-4" /> Clear
                </Button>
                <Button type="button" size="sm" onClick={handleConfirm} className="gap-1 bg-amber-600 hover:bg-amber-700">
                  <Check className="h-4 w-4" /> OK
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
