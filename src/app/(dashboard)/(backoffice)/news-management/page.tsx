"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { FileImage, Upload, X, Loader2 } from "lucide-react";
import { adminNewsApi, type NewsCreateBody } from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

export default function NewsManagementPage() {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [status, setStatus] = useState<string>("1");
  const [imageMode, setImageMode] = useState<"file" | "url">("file");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle URL change
  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setShortDescription("");
    setStatus("1");
    setImageFile(null);
    setImageUrl("");
    setImagePreview(null);
    setImageMode("file");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!shortDescription.trim()) {
      toast.error("Short description is required");
      return;
    }
    if (imageMode === "file" && !imageFile) {
      toast.error("Please select an image file");
      return;
    }
    if (imageMode === "url" && !imageUrl.trim()) {
      toast.error("Please provide an image URL");
      return;
    }
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setIsSubmitting(true);

    try {
      const newsData: NewsCreateBody = {
        title: title.trim(),
        description: description.trim(),
        short_description: shortDescription.trim(),
        status: status,
        image: imageMode === "file" ? imageFile! : imageUrl.trim(),
      };

      const response = await adminNewsApi.create(newsData, token);

      if (response.success) {
        toast.success(response.message || "News created successfully");
        resetForm();
      } else {
        toast.error(
          getAdminFriendlyErrorMessage(response.message || "Failed to create news", {
            resource: "news articles",
            action: "create",
          })
        );
      }
    } catch (error) {
      console.error("Error creating news:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "news articles", action: "create" })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">News Management</h1>
          <p className="text-muted-foreground">
            Create and manage news articles for your platform.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create News</CardTitle>
            <CardDescription>
              Fill in the details below to create a new news article. You can upload an image file or provide an image URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Breaking News: Market Update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Short Description */}
              <div className="space-y-2">
                <Label htmlFor="short_description">
                  Short Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="short_description"
                  placeholder="Brief summary of the news article"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  A brief summary that will be displayed in news listings.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="This is the full description of the news article. It can contain detailed information about the news, including multiple paragraphs and formatting."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  The full content of the news article.
                </p>
              </div>

              {/* Image Upload/URL */}
              <div className="space-y-2">
                <Label>
                  Image <span className="text-red-500">*</span>
                </Label>
                <Tabs
                  value={imageMode}
                  onValueChange={(value) => setImageMode(value as "file" | "url")}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                    <TabsTrigger value="url">Image URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="file" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isSubmitting}
                          className="flex-1"
                        />
                      </div>
                      {imageFile && (
                        <div className="relative inline-block">
                          <div className="relative w-48 h-48 border rounded-lg overflow-hidden">
                            <img
                              src={imagePreview || ""}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              disabled={isSubmitting}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {imageFile.name}
                          </p>
                        </div>
                      )}
                      {!imageFile && (
                        <div className="flex items-center justify-center w-full h-48 border-2 border-dashed rounded-lg border-muted-foreground/25">
                          <div className="text-center">
                            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No image selected
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="url" className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/images/news-image.jpg"
                        value={imageUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        disabled={isSubmitting}
                      />
                      {imageUrl && imagePreview && (
                        <div className="relative inline-block">
                          <div className="relative w-48 h-48 border rounded-lg overflow-hidden">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={() => setImagePreview(null)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Active news will be visible to users.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Create News
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    
  );
}
