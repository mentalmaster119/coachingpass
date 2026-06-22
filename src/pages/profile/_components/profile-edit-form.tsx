import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { PenLine, Plus, X, CheckCircle2 } from "lucide-react";
import AvatarUpload from "./avatar-upload.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const MBTI_TYPES = [
  "INTJ","INTP","ENTJ","ENTP",
  "INFJ","INFP","ENFJ","ENFP",
  "ISTJ","ISFJ","ESTJ","ESFJ",
  "ISTP","ISFP","ESTP","ESFP",
] as const;

type ProfileData = {
  name: string;
  email: string;
  bio: string | null;
  phone: string | null;
  specializations: string[];
  coachingStyle: string | null;
  avatarUrl: string | null;
  mbti: string | null;
  motivationalMessage: string | null;
};

type ProfileEditFormProps = {
  profile: ProfileData;
};

const SUGGESTED_SPECIALIZATIONS = [
  "라이프 코칭", "커리어 코칭", "비즈니스 코칭", "리더십 코칭",
  "팀 코칭", "자기계발", "동기부여", "스트레스 관리",
  "의사소통", "목표 설정", "스포츠멘탈코칭",
];

export default function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [specializations, setSpecializations] = useState<string[]>(profile.specializations);
  const [coachingStyle, setCoachingStyle] = useState(profile.coachingStyle ?? "");
  const [mbti, setMbti] = useState(profile.mbti ?? "");
  const [motivationalMessage, setMotivationalMessage] = useState(profile.motivationalMessage ?? "");
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateProfile = useMutation(api.users.updateDetailedProfile);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !specializations.includes(trimmed) && specializations.length < 10) {
      setSpecializations([...specializations, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setSpecializations(specializations.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        specializations: specializations.length > 0 ? specializations : undefined,
        coachingStyle: coachingStyle.trim() || undefined,
        mbti: (mbti.trim() && mbti !== "none") ? mbti.trim() : undefined,
        motivationalMessage: motivationalMessage.trim() || undefined,
      });
      toast.success("프로필이 저장되었습니다.");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PenLine className="w-4 h-4 text-primary" />
          프로필 편집
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <AvatarUpload avatarUrl={profile.avatarUrl} name={name} size="lg" />
          <div>
            <p className="text-sm font-medium">프로필 사진</p>
            <p className="text-xs text-muted-foreground">JPG, PNG 형식 (최대 5MB)</p>
          </div>
        </div>

        {/* Basic info */}
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">이름 *</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-email">이메일</Label>
            <Input
              id="profile-email"
              value={profile.email}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">전화번호</Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="space-y-1.5">
            <Label>MBTI</Label>
            <Select value={mbti} onValueChange={setMbti}>
              <SelectTrigger>
                <SelectValue placeholder="모르거나 선택 안 함" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">모름 / 선택 안 함</SelectItem>
                {MBTI_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">모를 경우 선택하지 않아도 됩니다.</p>
          </div>
        </div>

        {/* Motivational message */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-motivational">나에게 힘을 주는 메시지</Label>
          <Textarea
            id="profile-motivational"
            value={motivationalMessage}
            onChange={(e) => setMotivationalMessage(e.target.value)}
            placeholder="예: 나는 매일 성장하고 있다. 포기하지 않으면 반드시 해낼 수 있다."
            rows={2}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">대시보드 상단에 표시됩니다. ({motivationalMessage.length}/200)</p>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-bio">자기소개</Label>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="간단한 자기소개를 작성해주세요."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
        </div>

        {/* Coaching style */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-coaching-style">코칭 스타일</Label>
          <Textarea
            id="profile-coaching-style"
            value={coachingStyle}
            onChange={(e) => setCoachingStyle(e.target.value)}
            placeholder="나의 코칭 접근 방식이나 철학을 소개해주세요."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{coachingStyle.length}/500</p>
        </div>

        {/* Specializations */}
        <div className="space-y-2">
          <Label>전문 분야 태그 (최대 10개)</Label>
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {specializations.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          {specializations.length < 10 && (
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="태그 입력 후 Enter"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
          {/* Suggested tags */}
          <div className="flex flex-wrap gap-1">
            {SUGGESTED_SPECIALIZATIONS.filter((t) => !specializations.includes(t)).slice(0, 6).map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
          {isSaving ? (
            "저장 중..."
          ) : savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              저장 완료
            </>
          ) : (
            "저장하기"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
