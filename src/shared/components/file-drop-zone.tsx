"use client";

import { useId, useRef, useState } from "react";
import { File, FileImage, FileText, Upload, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".xml"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function extensionOf(file: File): string {
  const match = /\.[^.]+$/.exec(file.name);
  return match ? match[0].toLowerCase() : "";
}

function isAccepted(file: File): boolean {
  return ACCEPTED_EXTENSIONS.includes(extensionOf(file));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ file }: { file: File }) {
  const ext = extensionOf(file);
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
    return <FileImage className="h-4 w-4" />;
  }
  if (ext === ".xml") {
    return <FileText className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
}

/**
 * Só staging local (drag&drop + seleção manual) — não existe endpoint de
 * upload/Storage no backend ainda, então os arquivos aqui nunca são
 * enviados a lugar nenhum. Fica pronto pra plugar quando o backend de
 * anexos existir.
 */
export function FileDropZone({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(incoming: FileList | File[]) {
    setError(null);
    const accepted: File[] = [];
    let rejected = 0;
    let tooLarge = 0;

    for (const file of Array.from(incoming)) {
      if (!isAccepted(file)) {
        rejected++;
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        tooLarge++;
        continue;
      }
      accepted.push(file);
    }

    if (rejected > 0) {
      setError(
        `${rejected} arquivo(s) ignorado(s) — formato não suportado (aceita PDF, JPG, PNG, XML).`,
      );
    } else if (tooLarge > 0) {
      setError(`${tooLarge} arquivo(s) ignorado(s) — acima de 10MB.`);
    }

    if (accepted.length > 0) {
      onChange([...files, ...accepted]);
    }
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (!disabled && event.dataTransfer.files.length > 0) {
            addFiles(event.dataTransfer.files);
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-3 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-ring/50 hover:bg-muted/30",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="text-muted-foreground h-4 w-4" />
        <p className="text-sm font-medium">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-muted-foreground text-xs">
          PDF, JPG, PNG ou XML — até 10MB cada
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          disabled={disabled}
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files && event.target.files.length > 0) {
              addFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
      </label>

      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="bg-muted/40 flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon file={file} />
                <span className="truncate text-sm">{file.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label={`Remover ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
