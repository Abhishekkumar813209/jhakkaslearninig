import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, AlignLeft, AlignCenter, AlignRight, Upload, Link as LinkIcon, Loader2, X } from "lucide-react";
import { renderWithImages } from "@/lib/mathRendering";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (imageToken: string) => void;
}

export const ImageInsertDialog = ({ open, onClose, onInsert }: ImageInsertDialogProps) => {
  const [imageUrl, setImageUrl] = useState("");
  const [width, setWidth] = useState(100);
  const [widthUnit, setWidthUnit] = useState<"%" | "px">("%");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [padding, setPadding] = useState(0);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    setUploading(true);
    setUploadedFile(file);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);
      
      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image. Please try again.');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInsert = () => {
    if (!imageUrl.trim()) return;
    
    const widthValue = `${width}${widthUnit}`;
    const token = `[img:${imageUrl}:${widthValue}:${align}:${padding}]`;
    onInsert(token);
    
    // Reset form
    setImageUrl("");
    setWidth(100);
    setWidthUnit("%");
    setAlign("center");
    setPadding(0);
    setMode("url");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const previewToken = imageUrl.trim() 
    ? `[img:${imageUrl}:${width}${widthUnit}:${align}:${padding}]`
    : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Insert Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selector Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "upload")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Paste URL
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>
            
            {/* URL Mode */}
            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </TabsContent>
            
            {/* Upload Mode */}
            <TabsContent value="upload" className="space-y-4 mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {!uploadedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Uploading image...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Image className="h-10 w-10 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearUpload}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {imageUrl && (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-xs text-muted-foreground">Uploaded URL:</Label>
                      <p className="text-xs font-mono break-all mt-1">{imageUrl}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Width */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Width: {width}{widthUnit}</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={widthUnit === "%" ? "default" : "outline"}
                  onClick={() => setWidthUnit("%")}
                >
                  %
                </Button>
                <Button
                  size="sm"
                  variant={widthUnit === "px" ? "default" : "outline"}
                  onClick={() => setWidthUnit("px")}
                >
                  px
                </Button>
              </div>
            </div>
            <Slider
              value={[width]}
              onValueChange={([value]) => setWidth(value)}
              min={widthUnit === "%" ? 10 : 50}
              max={widthUnit === "%" ? 100 : 800}
              step={widthUnit === "%" ? 5 : 10}
            />
          </div>

          {/* Alignment */}
          <div className="space-y-2">
            <Label>Alignment</Label>
            <div className="flex gap-2">
              <Button
                variant={align === "left" ? "default" : "outline"}
                onClick={() => setAlign("left")}
                className="flex-1"
              >
                <AlignLeft className="h-4 w-4 mr-2" />
                Left
              </Button>
              <Button
                variant={align === "center" ? "default" : "outline"}
                onClick={() => setAlign("center")}
                className="flex-1"
              >
                <AlignCenter className="h-4 w-4 mr-2" />
                Center
              </Button>
              <Button
                variant={align === "right" ? "default" : "outline"}
                onClick={() => setAlign("right")}
                className="flex-1"
              >
                <AlignRight className="h-4 w-4 mr-2" />
                Right
              </Button>
            </div>
          </div>

          {/* Padding */}
          <div className="space-y-2">
            <Label htmlFor="padding">Horizontal Padding (px): {padding}</Label>
            <Slider
              id="padding"
              value={[padding]}
              onValueChange={([value]) => setPadding(value)}
              min={0}
              max={100}
              step={5}
            />
          </div>

          {/* Preview */}
          {imageUrl.trim() && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/20">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderWithImages(previewToken),
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {previewToken}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!imageUrl.trim()}>
            Insert Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
