import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Copy, Plus } from "lucide-react";

export default function BannerList({ banners, onAddNew, onEdit, onDelete, onDuplicate }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Homepage Banners</CardTitle>
        <Button onClick={onAddNew} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Banner
        </Button>
      </CardHeader>
      <CardContent>
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
                  <td className="p-2 max-w-md truncate">{banner.message}</td>
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
      </CardContent>
    </Card>
  );
}