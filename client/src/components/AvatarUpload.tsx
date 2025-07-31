
import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Upload, X, Check, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AvatarUploadProps {
  currentImageUrl?: string;
  username?: string;
  onUploadSuccess?: (newImageUrl: string) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragType = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | null;

export default function AvatarUpload({ 
  currentImageUrl, 
  username, 
  onUploadSuccess 
}: AvatarUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 });
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      
      onUploadSuccess?.(data.profileImageUrl);
      setIsOpen(false);
      resetUpload();
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCropper(true);
    setCroppedImageUrl(null);
  };

  const calculateOptimalCrop = (imgWidth: number, imgHeight: number) => {
    // Calculate the largest square that fits in the image
    const size = Math.min(imgWidth, imgHeight) * 0.9; // 90% of the smaller dimension
    const x = (imgWidth - size) / 2;
    const y = (imgHeight - size) / 2;
    
    return { x, y, width: size, height: size };
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      const { width: displayWidth, height: displayHeight } = imageRef.current.getBoundingClientRect();
      
      setImageSize({ width: displayWidth, height: displayHeight });
      
      // Set optimal initial crop
      const optimalCrop = calculateOptimalCrop(displayWidth, displayHeight);
      setCropArea(optimalCrop);
    }
  };

  const getCursorForPosition = (x: number, y: number): string => {
    const { x: cropX, y: cropY, width, height } = cropArea;
    const handleSize = 12;
    
    // Check corners first (resize handles)
    if (Math.abs(x - cropX) <= handleSize && Math.abs(y - cropY) <= handleSize) {
      return 'nw-resize';
    }
    if (Math.abs(x - (cropX + width)) <= handleSize && Math.abs(y - cropY) <= handleSize) {
      return 'ne-resize';
    }
    if (Math.abs(x - cropX) <= handleSize && Math.abs(y - (cropY + height)) <= handleSize) {
      return 'sw-resize';
    }
    if (Math.abs(x - (cropX + width)) <= handleSize && Math.abs(y - (cropY + height)) <= handleSize) {
      return 'se-resize';
    }
    
    // Check if inside crop area (move)
    if (x >= cropX && x <= cropX + width && y >= cropY && y <= cropY + height) {
      return 'move';
    }
    
    return 'default';
  };

  const getDragType = (x: number, y: number): DragType => {
    const { x: cropX, y: cropY, width, height } = cropArea;
    const handleSize = 12;
    
    if (Math.abs(x - cropX) <= handleSize && Math.abs(y - cropY) <= handleSize) {
      return 'resize-nw';
    }
    if (Math.abs(x - (cropX + width)) <= handleSize && Math.abs(y - cropY) <= handleSize) {
      return 'resize-ne';
    }
    if (Math.abs(x - cropX) <= handleSize && Math.abs(y - (cropY + height)) <= handleSize) {
      return 'resize-sw';
    }
    if (Math.abs(x - (cropX + width)) <= handleSize && Math.abs(y - (cropY + height)) <= handleSize) {
      return 'resize-se';
    }
    
    if (x >= cropX && x <= cropX + width && y >= cropY && y <= cropY + height) {
      return 'move';
    }
    
    return null;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dragType = getDragType(x, y);
    if (!dragType) return;
    
    setIsDragging(true);
    setDragType(dragType);
    setDragStart({ 
      x, 
      y, 
      cropX: cropArea.x, 
      cropY: cropArea.y, 
      cropWidth: cropArea.width, 
      cropHeight: cropArea.height 
    });
    
    e.preventDefault();
  }, [cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update cursor based on position
    if (!isDragging) {
      const cursor = getCursorForPosition(x, y);
      if (imageRef.current.style.cursor !== cursor) {
        imageRef.current.style.cursor = cursor;
      }
      return;
    }
    
    if (!dragType) return;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    const minSize = 50; // Minimum crop size
    
    let newCrop = { ...cropArea };
    
    switch (dragType) {
      case 'move':
        newCrop.x = Math.max(0, Math.min(dragStart.cropX + deltaX, imageSize.width - cropArea.width));
        newCrop.y = Math.max(0, Math.min(dragStart.cropY + deltaY, imageSize.height - cropArea.height));
        break;
        
      case 'resize-nw':
        const newWidth1 = Math.max(minSize, dragStart.cropWidth - deltaX);
        const newHeight1 = Math.max(minSize, dragStart.cropHeight - deltaY);
        const size1 = Math.min(newWidth1, newHeight1); // Keep it square
        newCrop.x = Math.max(0, dragStart.cropX + dragStart.cropWidth - size1);
        newCrop.y = Math.max(0, dragStart.cropY + dragStart.cropHeight - size1);
        newCrop.width = size1;
        newCrop.height = size1;
        break;
        
      case 'resize-ne':
        const newWidth2 = Math.max(minSize, dragStart.cropWidth + deltaX);
        const newHeight2 = Math.max(minSize, dragStart.cropHeight - deltaY);
        const size2 = Math.min(newWidth2, newHeight2);
        newCrop.x = dragStart.cropX;
        newCrop.y = Math.max(0, dragStart.cropY + dragStart.cropHeight - size2);
        newCrop.width = Math.min(size2, imageSize.width - newCrop.x);
        newCrop.height = Math.min(size2, imageSize.height - newCrop.y);
        break;
        
      case 'resize-sw':
        const newWidth3 = Math.max(minSize, dragStart.cropWidth - deltaX);
        const newHeight3 = Math.max(minSize, dragStart.cropHeight + deltaY);
        const size3 = Math.min(newWidth3, newHeight3);
        newCrop.x = Math.max(0, dragStart.cropX + dragStart.cropWidth - size3);
        newCrop.y = dragStart.cropY;
        newCrop.width = size3;
        newCrop.height = Math.min(size3, imageSize.height - newCrop.y);
        break;
        
      case 'resize-se':
        const newWidth4 = Math.max(minSize, dragStart.cropWidth + deltaX);
        const newHeight4 = Math.max(minSize, dragStart.cropHeight + deltaY);
        const size4 = Math.min(newWidth4, newHeight4);
        newCrop.width = Math.min(size4, imageSize.width - dragStart.cropX);
        newCrop.height = Math.min(size4, imageSize.height - dragStart.cropY);
        break;
    }
    
    setCropArea(newCrop);
  }, [isDragging, dragType, dragStart, cropArea, imageSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
    if (imageRef.current) {
      imageRef.current.style.cursor = 'default';
    }
  }, []);

  // Live preview effect
  useEffect(() => {
    if (showCropper && previewUrl && imageRef.current) {
      cropImage();
    }
  }, [cropArea, showCropper, previewUrl]);

  const cropImage = () => {
    if (!imageRef.current || !canvasRef.current || !previewUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = imageRef.current;
    const { naturalWidth, naturalHeight } = image;
    const { width: displayWidth, height: displayHeight } = imageSize;

    // Calculate scale factors
    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;

    // Set canvas size to desired output size (200x200)
    canvas.width = 200;
    canvas.height = 200;

    // Draw cropped and scaled image
    ctx.drawImage(
      image,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      200,
      200
    );

    // Convert to blob and create URL for preview
    canvas.toBlob((blob) => {
      if (blob) {
        if (croppedImageUrl) {
          URL.revokeObjectURL(croppedImageUrl);
        }
        const newCroppedUrl = URL.createObjectURL(blob);
        setCroppedImageUrl(newCroppedUrl);
      }
    }, 'image/png', 0.9);
  };

  const handleApplyCrop = () => {
    if (!canvasRef.current) return;
    
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], selectedFile?.name || 'cropped-avatar.png', {
          type: 'image/png'
        });
        setSelectedFile(croppedFile);
        setShowCropper(false);
      }
    }, 'image/png', 0.9);
  };

  const resetCrop = () => {
    if (imageSize.width > 0) {
      const optimalCrop = calculateOptimalCrop(imageSize.width, imageSize.height);
      setCropArea(optimalCrop);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setShowCropper(false);
    if (croppedImageUrl) {
      URL.revokeObjectURL(croppedImageUrl);
      setCroppedImageUrl(null);
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    resetUpload();
    setIsOpen(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          <Avatar className="h-20 w-20">
            <AvatarImage src={currentImageUrl} alt={username || "Profile"} />
            <AvatarFallback className="text-lg">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change Profile Picture</DialogTitle>
          <DialogDescription>
            Upload a new profile picture. Supported formats: JPEG, PNG, GIF (max 5MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Cropper */}
          {showCropper && previewUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Adjust your crop:</h4>
                <div className="flex gap-2">
                  <Button onClick={resetCrop} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-6">
                {/* Cropper */}
                <div className="flex-1">
                  <div 
                    ref={cropperRef}
                    className="relative inline-block border border-gray-300 rounded bg-gray-100 select-none"
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                  >
                    <img
                      ref={imageRef}
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-96 block"
                      onLoad={handleImageLoad}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{ cursor: 'default' }}
                      draggable={false}
                    />
                    
                    {/* Overlay */}
                    {imageSize.width > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Dark overlay */}
                        <div 
                          className="absolute inset-0 bg-black bg-opacity-50"
                          style={{
                            clipPath: `polygon(
                              0% 0%, 
                              0% 100%, 
                              ${(cropArea.x / imageSize.width) * 100}% 100%, 
                              ${(cropArea.x / imageSize.width) * 100}% ${(cropArea.y / imageSize.height) * 100}%, 
                              ${((cropArea.x + cropArea.width) / imageSize.width) * 100}% ${(cropArea.y / imageSize.height) * 100}%, 
                              ${((cropArea.x + cropArea.width) / imageSize.width) * 100}% ${((cropArea.y + cropArea.height) / imageSize.height) * 100}%, 
                              ${(cropArea.x / imageSize.width) * 100}% ${((cropArea.y + cropArea.height) / imageSize.height) * 100}%, 
                              ${(cropArea.x / imageSize.width) * 100}% 100%, 
                              100% 100%, 
                              100% 0%
                            )`
                          }}
                        />
                        
                        {/* Crop area border */}
                        <div
                          className="absolute border-2 border-white shadow-lg"
                          style={{
                            left: cropArea.x,
                            top: cropArea.y,
                            width: cropArea.width,
                            height: cropArea.height,
                          }}
                        >
                          {/* Corner handles */}
                          <div className="absolute w-3 h-3 bg-white border border-gray-400 -top-1 -left-1 cursor-nw-resize" />
                          <div className="absolute w-3 h-3 bg-white border border-gray-400 -top-1 -right-1 cursor-ne-resize" />
                          <div className="absolute w-3 h-3 bg-white border border-gray-400 -bottom-1 -left-1 cursor-sw-resize" />
                          <div className="absolute w-3 h-3 bg-white border border-gray-400 -bottom-1 -right-1 cursor-se-resize" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preview */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="text-sm font-medium text-gray-600">Preview</div>
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-2 border-gray-200">
                      <AvatarImage 
                        src={croppedImageUrl || currentImageUrl} 
                        alt="Cropped preview" 
                      />
                      <AvatarFallback className="text-xl">
                        {getInitials(username)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCropper(false)} 
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleApplyCrop} size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Apply Crop
                </Button>
              </div>
            </div>
          )}

          {/* File Input */}
          {!showCropper && (
            <div className="space-y-4">
              {/* Current/Preview Avatar */}
              <div className="flex justify-center">
                <Avatar className="h-32 w-32">
                  <AvatarImage 
                    src={croppedImageUrl || currentImageUrl} 
                    alt={username || "Profile"} 
                  />
                  <AvatarFallback className="text-2xl">
                    {getInitials(username)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={uploadMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>

                {selectedFile && (
                  <div className="text-sm text-muted-foreground text-center">
                    Selected: {selectedFile.name}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
