import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Camera, User } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner.tsx";

type AvatarUploadProps = {
  avatarUrl: string | null;
  name: string;
  size?: "sm" | "lg";
};

export default function AvatarUpload({ avatarUrl, name, size = "lg" }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);

  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);

  const sizeClasses = size === "lg" ? "w-24 h-24 text-3xl" : "w-16 h-16 text-xl";
  const overlaySize = size === "lg" ? "w-24 h-24" : "w-16 h-16";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json() as { storageId: string };
      await updateAvatar({ storageId: storageId as Parameters<typeof updateAvatar>[0]["storageId"] });
      toast.success("프로필 사진이 업데이트되었습니다.");
    } catch {
      toast.error("업로드 중 오류가 발생했습니다.");
      setPreviewUrl(avatarUrl);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses} rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ring-2 ring-border`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-primary">{initials || <User className="w-8 h-8" />}</span>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-full">
            <Spinner className="w-5 h-5" />
          </div>
        )}
      </div>
      {/* Camera overlay button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm border-2 border-background`}
        title="프로필 사진 변경"
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
