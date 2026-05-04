"use client";

import { useEffect, useState } from "react";
import type { NewsRow } from "./page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileImage, X } from "lucide-react";

export type NewsFormValue = {
  id?: string;
  title: string;
  description: string;
  short_description: string;
  status: boolean;
  imageFile?: File | null;
  imageUrl?: string;
  imageMode: "file" | "url";
  type: "news" | "promotion";
};

export function NewsForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  readOnly = false,
  newsType = "news",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: NewsFormValue) => void;
  initialData?: NewsRow | null;
  readOnly?: boolean;
  newsType?: "news" | "promotion";
}) {
  const [form, setForm] = useState<NewsFormValue>({
    title: "",
    description: "",
    short_description: "",
    status: true,
    imageFile: null,
    imageUrl: "",
    imageMode: "file",
    type: newsType,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        title: initialData.title,
        description: initialData.description,
        short_description: initialData.short_description,
        status: initialData.status,
        imageFile: null,
        imageUrl: initialData.image_url || "",
        imageMode: initialData.image_url ? "url" : "file",
        type: initialData.type as "news" | "promotion",
      });
      setImagePreview(initialData.image_url || null);
    } else {
      setForm({
        title: "",
        description: "",
        short_description: "",
        status: true,
        imageFile: null,
        imageUrl: "",
        imageMode: "file",
        type: newsType,
      });
      setImagePreview(null);
    }
  }, [initialData, open, newsType]);

  const isEdit = !!initialData?.id;
  const disabled = readOnly;
  const label = newsType === "promotion" ? "Promotion" : "News";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, imageFile: file }));
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setForm((f) => ({ ...f, imageFile: null }));
    setImagePreview(null);
  };

  const handleUrlChange = (url: string) => {
    setForm((f) => ({ ...f, imageUrl: url }));
    setImagePreview(url || null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? readOnly
                  ? `View ${label}`
                  : `Edit ${label}`
                : `Create ${label}`}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={`${label} title`}
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_description">
                Short Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="short_description"
                value={form.short_description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, short_description: e.target.value }))
                }
                placeholder="Brief summary"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={`Full content of the ${label.toLowerCase()}`}
                disabled={disabled}
                required
                rows={5}
                className="resize-none"
              />
            </div>

            {!disabled && (
              <div className="space-y-2">
                <Label>Image</Label>
                <Tabs
                  value={form.imageMode}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, imageMode: v as "file" | "url" }))
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                    <TabsTrigger value="url">Image URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="file" className="space-y-3 pt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={disabled}
                    />
                    {form.imageFile ? (
                      <div className="relative inline-block">
                        <div className="relative h-32 w-48 overflow-hidden rounded-lg border">
                          {imagePreview && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {form.imageFile.name}
                        </p>
                      </div>
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                        <div className="text-center">
                          <FileImage className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-1 text-xs text-muted-foreground">
                            No image selected
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="url" className="space-y-3 pt-2">
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={form.imageUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      disabled={disabled}
                    />
                    {form.imageUrl && imagePreview && (
                      <div className="relative h-32 w-48 overflow-hidden rounded-lg border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                          onError={() => setImagePreview(null)}
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {disabled && imagePreview && (
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="relative h-32 w-48 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.status}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  disabled={disabled}
                />
                <span className="text-sm">{form.status ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button type="submit">{isEdit ? "Save Changes" : `Create ${label}`}</Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
