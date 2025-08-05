import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  onError?: (message: string) => void;
  isUploading: boolean;
  accept?: string;
  className?: string;
}

export function FileDropZone({ 
  onFileSelect, 
  onError,
  isUploading, 
  accept = ".csv",
  className = ""
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        onFileSelect(file);
      } else {
        const errorMessage = "Please upload a CSV file";
        if (onError) {
          onError(errorMessage);
        } else {
          console.error(errorMessage);
        }
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
        ${isDragOver 
          ? "border-blue-500 bg-blue-50" 
          : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
        }
        ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
      
      <div className="space-y-4">
        <div className="mx-auto w-12 h-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragOver ? "Drop your CSV file here" : "Drop CSV file here"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or <span className="text-blue-600 font-medium">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supports Luma exported CSV that contains the following columns: email, first_name, last_name, checked_in_at
          </p>
        </div>
        
        {isUploading && (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-600">Processing CSV...</span>
          </div>
        )}
      </div>
    </div>
  );
}