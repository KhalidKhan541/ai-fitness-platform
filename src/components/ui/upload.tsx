import * as React from "react";
import { Upload, X, FileImage, FileText, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface UploadFile extends File {
  id: string;
  preview?: string;
  status?: "uploading" | "complete" | "error";
  progress?: number;
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  onFilesChange?: (files: UploadFile[]) => void;
  onUpload?: (files: UploadFile[]) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

function FileUpload({
  accept = "*",
  multiple = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
  onFilesChange,
  onUpload,
  className,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray
      .filter((file) => file.size <= maxSize)
      .slice(0, maxFiles - files.length)
      .map((file) => ({
        ...file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        status: "complete" as const,
        progress: 100,
      })) as UploadFile[];

    const updated = [...files, ...validFiles];
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const removeFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return FileImage;
    if (type.includes("pdf") || type.includes("document")) return FileText;
    return File;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Upload className={cn("mb-4 h-10 w-10", isDragging ? "text-primary" : "text-muted-foreground")} />
        <p className="mb-2 text-sm text-muted-foreground">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">
          {accept === "*" ? "Any file" : accept} up to {(maxSize / 1024 / 1024).toFixed(0)}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  onUpload?: (file: File) => Promise<string>;
  className?: string;
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
}

function ImageUpload({
  value,
  onChange,
  onUpload,
  className,
  size = "default",
  disabled = false,
}: ImageUploadProps) {
  const [preview, setPreview] = React.useState(value);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPreview(value);
  }, [value]);

  const sizeClasses = {
    sm: "h-16 w-16",
    default: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const handleUpload = async (file: File) => {
    if (!onUpload) return;
    setUploading(true);
    try {
      const url = await onUpload(file);
      setPreview(url);
      onChange?.(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary",
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Upload" className="h-full w-full object-cover" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPreview(URL.createObjectURL(file));
            handleUpload(file);
          }
        }}
      />
      {preview && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreview("");
            onChange?.("");
          }}
          className="absolute -right-1 -top-1 rounded-full bg-background p-1 shadow-md hover:bg-accent"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export { FileUpload, ImageUpload };
