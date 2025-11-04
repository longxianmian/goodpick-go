import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, GripVertical, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLanguage } from "@/contexts/LanguageContext";

interface MediaFile {
  type: "image" | "video";
  url: string;
}

interface MediaUploaderProps {
  value?: MediaFile[];
  onChange?: (files: MediaFile[]) => void;
  maxImages?: number;
  maxVideos?: number;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
}

interface SortableItemProps {
  file: MediaFile;
  index: number;
  onRemove: () => void;
}

function SortableItem({ file, index, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-muted rounded-lg overflow-hidden"
      data-testid={`media-item-${index}`}
    >
      <div className="aspect-video relative">
        {file.type === "image" ? (
          <img
            src={file.url}
            alt={`Upload ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={file.url}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        )}
        
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 bg-black/60 hover:bg-black/80 text-white"
            {...attributes}
            {...listeners}
            data-testid={`button-drag-${index}`}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 bg-black/60 hover:bg-black/80 text-white hover-elevate active-elevate-2"
            onClick={onRemove}
            data-testid={`button-remove-${index}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="text-xs">
            {file.type === "image" ? <ImageIcon className="h-3 w-3 mr-1" /> : <VideoIcon className="h-3 w-3 mr-1" />}
            {file.type === "image" ? "图片" : "视频"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function MediaUploader({
  value = [],
  onChange,
  maxImages = 3,
  maxVideos = 1,
  uploadUrl,
  uploadHeaders = {},
}: MediaUploaderProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(value);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"image" | "video" | null>(null);

  useEffect(() => {
    setMediaFiles(value);
    if (value.length > 0) {
      setMode(value[0].type);
    } else {
      setMode(null);
    }
  }, [value]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: uploadHeaders,
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.fileUrl || data.data?.files?.[0]?.url || data.data?.url || data.url;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast({
          title: t("common.error"),
          description: "只支持图片或视频文件",
          variant: "destructive",
        });
        return;
      }

      const newMode = isImage ? "image" : "video";

      if (!mode) {
        setMode(newMode);
      } else if (mode !== newMode) {
        toast({
          title: t("common.error"),
          description: mode === "image" ? "当前只能上传图片" : "当前只能上传视频",
          variant: "destructive",
        });
        return;
      }

      const imageCount = mediaFiles.filter((f) => f.type === "image").length;
      const videoCount = mediaFiles.filter((f) => f.type === "video").length;

      if (isImage && imageCount >= maxImages) {
        toast({
          title: t("common.error"),
          description: `最多只能上传 ${maxImages} 张图片`,
          variant: "destructive",
        });
        return;
      }

      if (isVideo && videoCount >= maxVideos) {
        toast({
          title: t("common.error"),
          description: `最多只能上传 ${maxVideos} 个视频`,
          variant: "destructive",
        });
        return;
      }

      try {
        setUploading(true);
        const url = await uploadFile(file);
        const newFile: MediaFile = {
          type: newMode,
          url,
        };

        const newFiles = [...mediaFiles, newFile];
        setMediaFiles(newFiles);
        onChange?.(newFiles);

        toast({
          title: t("common.success"),
          description: "上传成功",
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: t("common.error"),
          description: "上传失败，请重试",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [mode, mediaFiles, maxImages, maxVideos, uploadUrl, uploadHeaders, onChange, toast, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: mode === "image"
      ? { "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] }
      : mode === "video"
      ? { "video/*": [".mp4", ".webm", ".ogg", ".mov", ".avi"] }
      : { "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"], "video/*": [".mp4", ".webm", ".ogg", ".mov", ".avi"] },
    multiple: false,
    disabled: uploading || (mode === "image" && mediaFiles.length >= maxImages) || (mode === "video" && mediaFiles.length >= maxVideos),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMediaFiles((items) => {
        const oldIndex = items.findIndex((item) => item.url === active.id);
        const newIndex = items.findIndex((item) => item.url === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        onChange?.(newItems);
        return newItems;
      });
    }
  };

  const handleRemove = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    onChange?.(newFiles);

    if (newFiles.length === 0) {
      setMode(null);
    }
  };

  const resetMode = () => {
    setMediaFiles([]);
    setMode(null);
    onChange?.([]);
  };

  return (
    <div className="space-y-4" data-testid="media-uploader">
      {mediaFiles.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={mediaFiles.map((f) => f.url)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-3 gap-4">
              {mediaFiles.map((file, index) => (
                <SortableItem
                  key={file.url}
                  file={file}
                  index={index}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {mode && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="mode-badge">
            {mode === "image" ? "图片模式" : "视频模式"}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={resetMode}
            data-testid="button-reset-mode"
          >
            切换模式
          </Button>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover-elevate"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        data-testid="dropzone"
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {uploading ? "上传中..." : isDragActive ? "释放以上传" : "点击或拖拽文件到此处"}
          </p>
          <p className="text-xs text-muted-foreground">
            支持上传 {maxImages} 张图片或 {maxVideos} 个视频
            {mode && (
              <span className="block mt-1">
                {mode === "image" ? "（当前只能上传图片）" : "（当前只能上传视频）"}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
