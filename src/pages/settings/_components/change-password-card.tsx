import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, Lock } from "lucide-react";
import { ConvexError } from "convex/values";

export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const changePassword = useMutation(api.auth.changePassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error("모든 비밀번호 필드를 입력해 주세요.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("새 비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      toast.success("비밀번호가 성공적으로 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ConvexError) {
        const errorData = err.data as { code?: string; message?: string };
        const msg = errorData?.message || "비밀번호 변경에 실패했습니다.";
        toast.error(msg);
      } else {
        toast.error("비밀번호 변경 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          비밀번호 변경
        </CardTitle>
        <CardDescription>로그인에 사용할 새 비밀번호를 설정합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">현재 비밀번호</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                placeholder="현재 비밀번호를 입력하세요"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                placeholder="새 비밀번호 (6자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="새 비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Lock className="w-4 h-4 mr-2" />
            {loading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
