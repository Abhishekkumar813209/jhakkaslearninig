import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Image, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { renderWithImages } from "@/lib/mathRendering";

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
          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image-url">Image URL</Label>
            <Input
              id="image-url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

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
