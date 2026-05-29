import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BannerForm({ banner, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    message: "",
    status: "inactive",
    ...banner,
  });

  useEffect(() => {
    if (banner) {
      setFormData(banner);
    }
  }, [banner]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{banner ? "Edit Banner" : "Add New Banner"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Banner Message</label>
            <Input
              type="text"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter banner message..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select
              value={formData.status || "inactive"}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live (Red Priority Ticker)</SelectItem>
                <SelectItem value="active">Active (Standard Ticker)</SelectItem>
                <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Live banners appear first on the homepage ticker with a red background. Active banners show in the standard ticker. Inactive banners are hidden.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {banner ? "Update" : "Create"} Banner
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
