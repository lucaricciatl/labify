import { useRef } from "react";
import { FilePlus, Trash2, FileText } from "lucide-react";
import type { Attachment } from "../types";
import { generateId } from "../utils";

export function useAttachmentHelpers(
  items: Attachment[] | undefined,
  setItems: (items: Attachment[]) => void
) {
  const fileRef = useRef<HTMLInputElement>(null);

  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: Attachment = {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result as string,
      };
      setItems([...(items || []), attachment]);
      // Reset the input so the same file can be selected again
      input.value = "";
    };
    reader.onerror = () => {
      console.error("[Attachments] Failed to read file:", file.name);
      input.value = "";
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (id: string) => {
    setItems((items || []).filter((a) => a.id !== id));
  };

  return { fileRef, addFile, removeFile };
}

export function AttachmentList({
  items,
  onRemove,
  editable,
}: {
  items?: Attachment[];
  onRemove?: (id: string) => void;
  editable?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div className="file-list">
      {items.map((att) => (
        <div className="file-row" key={att.id}>
          <FileText size={14} />
          <a
            href={att.data || "#"}
            download={att.name}
            className="link"
            title={att.name}
          >
            {att.name} ({formatBytes(att.size)})
          </a>
          {editable && onRemove && (
            <button
              className="icon-btn danger"
              onClick={() => onRemove(att.id)}
              title="Remove"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function AttachmentUploader({
  fileRef,
  onChange,
  label = "Add document",
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}) {
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="*/*"
        onChange={onChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => fileRef.current?.click()}
      >
        <FilePlus size={14} /> {label}
      </button>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
