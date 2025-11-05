import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, GripVertical, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { t } = useLanguage();
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
            {file.type === "image" ? t('mediaUploader.image') : t('mediaUploader.video')}
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mode, setMode] = useState<"image" | "video">("image");
  const [showModeChangeDialog, setShowModeChangeDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<"image" | "video" | null>(null);

  useEffect(() => {
    setMediaFiles(value);
    if (value.length > 0) {
      setMode(value[0].type);
    } else {
      // 默认图片模式
      setMode("image");
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

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const url = data.fileUrl || data.data?.files?.[0]?.url || data.data?.url || data.url;
            resolve(url);
          } catch (error) {
            reject(new Error("Failed to parse response"));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.open("POST", uploadUrl);
      
      Object.entries(uploadHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  };

  const handleModeChange = (newMode: "image" | "video") => {
    if (newMode === mode) return;
    
    if (mediaFiles.length > 0) {
      setPendingMode(newMode);
      setShowModeChangeDialog(true);
    } else {
      setMode(newMode);
    }
  };

  const confirmModeChange = () => {
    if (pendingMode) {
      setMode(pendingMode);
      setMediaFiles([]);
      onChange?.([]);
      setPendingMode(null);
    }
    setShowModeChangeDialog(false);
  };

  const cancelModeChange = () => {
    setPendingMode(null);
    setShowModeChangeDialog(false);
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
          description: t('mediaUploader.fileTypeError'),
          variant: "destructive",
        });
        return;
      }

      const fileMode = isImage ? "image" : "video";

      if (mode !== fileMode) {
        toast({
          title: t("common.error"),
          description: mode === "image" ? t('mediaUploader.onlyImagesAllowed') : t('mediaUploader.onlyVideosAllowed'),
          variant: "destructive",
        });
        return;
      }

      const imageCount = mediaFiles.filter((f) => f.type === "image").length;
      const videoCount = mediaFiles.filter((f) => f.type === "video").length;

      if (isImage && imageCount >= maxImages) {
        toast({
          title: t("common.error"),
          description: t('mediaUploader.maxImagesExceeded', { max: maxImages.toString() }),
          variant: "destructive",
        });
        return;
      }

      if (isVideo && videoCount >= maxVideos) {
        toast({
          title: t("common.error"),
          description: t('mediaUploader.maxVideosExceeded', { max: maxVideos.toString() }),
          variant: "destructive",
        });
        return;
      }

      try {
        setUploading(true);
        setUploadProgress(0);
        const url = await uploadFile(file);
        const newFile: MediaFile = {
          type: fileMode,
          url,
        };

        const newFiles = [...mediaFiles, newFile];
        setMediaFiles(newFiles);
        onChange?.(newFiles);

        toast({
          title: t("common.success"),
          description: t('mediaUploader.uploadSuccess'),
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: t("common.error"),
          description: t('mediaUploader.uploadError'),
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
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
  };

  return (
    <div className="space-y-4" data-testid="media-uploader">
      {/* 模式选择器 */}
      <div className="flex items-center justify-between">
        <Tabs value={mode} onValueChange={(value) => handleModeChange(value as "image" | "video")} data-testid="mode-selector">
          <TabsList>
            <TabsTrigger value="image" data-testid="tab-image">
              <ImageIcon className="h-4 w-4 mr-2" />
              {t('mediaUploader.imageMode') || '图片模式'}
            </TabsTrigger>
            <TabsTrigger value="video" data-testid="tab-video">
              <VideoIcon className="h-4 w-4 mr-2" />
              {t('mediaUploader.videoMode') || '视频模式'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-sm text-muted-foreground" data-testid="mode-limit">
          {mode === "image" ? `${t('mediaUploader.maxImages') || '最多'} ${maxImages} ${t('mediaUploader.images') || '张图片'}` : `${t('mediaUploader.maxVideos') || '最多'} ${maxVideos} ${t('mediaUploader.videos') || '个视频'}`}
        </div>
      </div>

      {/* 已上传的文件 */}
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
            {uploading ? t('mediaUploader.uploading', { progress: uploadProgress.toString() }) : isDragActive ? t('mediaUploader.releaseToUpload') : t('mediaUploader.clickOrDrag')}
          </p>
          {uploading && (
            <div className="w-full max-w-xs">
              <Progress value={uploadProgress} className="h-2" data-testid="upload-progress" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {mode === "image" ? t('mediaUploader.supportedImages', { max: maxImages.toString() }) : t('mediaUploader.supportedVideos', { max: maxVideos.toString() })}
          </p>
        </div>
      </div>

      {/* 模式切换确认对话框 */}
      <AlertDialog open={showModeChangeDialog} onOpenChange={setShowModeChangeDialog}>
        <AlertDialogContent data-testid="mode-change-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mediaUploader.switchModeTitle') || '切换媒体类型？'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('mediaUploader.switchModeDescription', {
                newMode: pendingMode === "image" ? (t('mediaUploader.image') || '图片') : (t('mediaUploader.video') || '视频'),
                currentMode: mode === "image" ? (t('mediaUploader.image') || '图片') : (t('mediaUploader.video') || '视频')
              }) || `切换到${pendingMode === "image" ? "图片" : "视频"}模式将清空当前已上传的${mode === "image" ? "图片" : "视频"}。此操作无法撤销。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelModeChange} data-testid="button-cancel-mode-change">
              {t('common.cancel') || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeChange} data-testid="button-confirm-mode-change">
              {t('mediaUploader.confirmSwitch') || '确认切换'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
