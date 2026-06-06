import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, Copy, Edit, PlusCircle, Trash } from "lucide-react";

function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SitePopupList({ popups, onAddNew, onEdit, onDelete, onDuplicate }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BellRing className="h-6 w-6 text-amber-600" />
            Homepage Popups
          </h2>
          <p className="mt-1 text-sm text-gray-600">Schedule one-time dismissible homepage alerts.</p>
        </div>
        <Button onClick={onAddNew} className="bg-amber-600 hover:bg-amber-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Popup
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {popups.length === 0 ? (
              <tr>
            <td colSpan={5} className="px-4 py-5 text-center text-gray-500">No homepage popups yet.</td>
              </tr>
            ) : popups.map((popup) => (
              <tr key={popup.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-4 font-semibold text-gray-900">{popup.title}</td>
                <td className="max-w-sm truncate px-4 py-4 text-gray-600">{popup.message}</td>
                <td className="px-4 py-4 text-xs text-gray-600">
                  <div>{formatDateTime(popup.start_at)}</div>
                  <div>{formatDateTime(popup.end_at)}</div>
                </td>
                <td className="px-4 py-4">
                  <Badge className={
                    popup.status === "Active" ? "bg-green-600" :
                    popup.status === "Hidden" ? "bg-red-500" :
                    "bg-gray-500"
                  }>
                    {popup.status || "Active"}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(popup)} title="Edit">
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDuplicate(popup)} title="Duplicate">
                      <Copy className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(popup.id)} title="Delete">
                      <Trash className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
