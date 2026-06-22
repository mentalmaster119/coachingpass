import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { User, Mail, Phone, Briefcase, Star } from "lucide-react";

type ProfileCardProps = {
  name: string;
  email: string;
  role: string;
  certificationGoal: string | null;
  bio: string | null;
  phone: string | null;
  specializations: string[];
  coachingStyle: string | null;
  avatarUrl: string | null;
  mbti?: string | null;
};

const roleLabels: Record<string, string> = {
  admin: "관리자",
  senior_coach: "슈퍼바이저",
  trainee: "교육생",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600 border-red-500/20",
  senior_coach: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  trainee: "bg-green-500/10 text-green-600 border-green-500/20",
};

export default function ProfileCard({
  name,
  email,
  role,
  certificationGoal,
  bio,
  phone,
  specializations,
  coachingStyle,
  avatarUrl,
  mbti,
}: ProfileCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="overflow-hidden">
      {/* Header banner */}
      <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10" />

      <CardContent className="pt-0">
        {/* Avatar + name row */}
        <div className="flex items-end gap-4 -mt-10 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ring-4 ring-background flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {initials || <User className="w-8 h-8" />}
              </span>
            )}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{name}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColors[role] ?? "bg-muted text-muted-foreground"}`}>
                {roleLabels[role] ?? role}
              </span>
              {certificationGoal && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
                  {certificationGoal} 준비중
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{email || "이메일 미설정"}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{phone}</span>
            </div>
          )}
          {mbti && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs font-bold text-primary/70 w-3.5 text-center">M</span>
              <span>MBTI: <span className="font-semibold text-foreground">{mbti}</span></span>
            </div>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{bio}</p>
          </div>
        )}

        {/* Coaching style */}
        {coachingStyle && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">코칭 스타일</p>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{coachingStyle}</p>
          </div>
        )}

        {/* Specializations */}
        {specializations.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">전문 분야</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {specializations.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!bio && !coachingStyle && specializations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            프로필 편집에서 자기소개를 추가해보세요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
