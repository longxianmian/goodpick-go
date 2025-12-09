import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface StoreImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  hint?: string;
}

export function StoreImageUploader({ 
  images, 
  onChange, 
  maxImages = 5,
  hint 
}: StoreImageUploaderProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { userToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!userToken) {
      toast({
        title: t('common.error'),
        description: t('auth.loginRequired'),
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await fetch('/api/user/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const fileUrl = data.fileUrl || data.data?.url || data.url;
      
      if (fileUrl) {
        onChange([...images, fileUrl]);
        toast({
          title: t('common.success'),
          description: t('merchant.imageUploadSuccess'),
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('common.error'),
        description: t('merchant.imageUploadError'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('common.error'),
          description: t('merchant.onlyImagesAllowed'),
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('merchant.imageTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      handleUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, index) => (
          <div 
            key={index} 
            className="relative aspect-video rounded-md overflow-hidden bg-muted"
            data-testid={`cover-image-${index}`}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"
              data-testid={`button-remove-image-${index}`}
            >
              <X className="w-3 h-3" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                {t('merchant.coverImage')}
              </span>
            )}
          </div>
        ))}
        
        {canAddMore && (
          <button
            type="button"
            className="aspect-video rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid="button-add-cover-image"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t('merchant.uploadImage')}</span>
              </>
            )}
          </button>
        )}
      </div>
      
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-cover-image"
      />
    </div>
  );
}

interface LicenseUploaderProps {
  label: string;
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}

interface AvatarUploaderProps {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
  size?: number;
}

export function AvatarUploader({ imageUrl, onChange, size = 80 }: AvatarUploaderProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { userToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!userToken) {
      toast({
        title: t('common.error'),
        description: t('auth.loginRequired'),
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await fetch('/api/user/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const fileUrl = data.fileUrl || data.data?.url || data.url;
      
      if (fileUrl) {
        onChange(fileUrl);
        toast({
          title: t('common.success'),
          description: t('merchant.avatarUploadSuccess'),
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('common.error'),
        description: t('merchant.avatarUploadError'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('common.error'),
          description: t('merchant.onlyImagesAllowed'),
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('merchant.imageTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      handleUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4" data-testid="avatar-uploader">
      <div 
        className="relative rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border-2 border-dashed border-muted-foreground/30"
        style={{ width: size, height: size }}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-white shadow-md"
              data-testid="button-remove-avatar"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-avatar"
        >
          <Upload className="w-4 h-4 mr-1" />
          {imageUrl ? t('merchant.changeAvatar') : t('merchant.uploadAvatar')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('merchant.avatarHint')}</p>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-avatar"
      />
    </div>
  );
}

export function LicenseUploader({ label, imageUrl, onChange }: LicenseUploaderProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { userToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!userToken) {
      toast({
        title: t('common.error'),
        description: t('auth.loginRequired'),
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await fetch('/api/user/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const fileUrl = data.fileUrl || data.data?.url || data.url;
      
      if (fileUrl) {
        onChange(fileUrl);
        toast({
          title: t('common.success'),
          description: t('merchant.licenseUploadSuccess'),
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('common.error'),
        description: t('merchant.licenseUploadError'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('common.error'),
          description: t('merchant.onlyImagesAllowed'),
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('merchant.imageTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      handleUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-md"
      data-testid={`license-uploader-${label.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {imageUrl ? (
          <div className="relative w-16 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
            <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-white"
              data-testid="button-remove-license"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm truncate">{label}</span>
      </div>
      
      <Button 
        type="button"
        variant="ghost" 
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        data-testid="button-upload-license"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Upload className="w-4 h-4 mr-1" />
            {imageUrl ? t('merchant.reupload') : t('merchant.upload')}
          </>
        )}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
