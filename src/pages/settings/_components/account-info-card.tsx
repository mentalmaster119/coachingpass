import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Shield, Calendar, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type User = Doc<"users">;

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  senior_coach: "상위코치",
  trainee: "수강생",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "승인됨", variant: "default" },
  pending: { label: "승인 대기", variant: "secondary" },
  rejected: { label: "반려됨", variant: "destructive" },
};

export default function AccountInfoCard({ user }: { user: User }) {
  const joinedDate = format(new Date(user._creationTime), "yyyy년 M월 d일", { locale: ko });
  const statusCfg = STATUS_CONFIG[user.approvalStatus] ?? { label: user.approvalStatus, variant: "outline" as const };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          계정 정보
        </CardTitle>
        <CardDescription>현재 계정 역할과 상태를 확인할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <InfoRow
            icon={<User className="w-4 h-4" />}
            label="역할"
            value={
              <Badge variant="outline" className="font-medium">
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
            }
          />
          <InfoRow
            icon={<Shield className="w-4 h-4" />}
            label="계정 상태"
            value={
              <Badge variant={statusCfg.variant}>
                {statusCfg.label}
              </Badge>
            }
          />
          {user.email && (
            <InfoRow
              icon={<Mail className="w-4 h-4" />}
              label="이메일"
              value={<span className="text-sm text-muted-foreground">{user.email}</span>}
            />
          )}
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label="가입일"
            value={<span className="text-sm text-muted-foreground">{joinedDate}</span>}
          />
          {user.certificationGoal && (
            <InfoRow
              icon={
                <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold text-primary">목</span>
              }
              label="자격증 목표"
              value={
                <Badge
                  variant="outline"
                  className={cn(
                    "font-bold",
                    "border-primary text-primary",
                  )}
                >
                  {user.certificationGoal}
                </Badge>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div>{value}</div>
    </div>
  );
}
