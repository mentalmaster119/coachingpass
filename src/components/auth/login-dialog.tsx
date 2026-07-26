import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Loader2, Mail, Lock, User, CheckCircle2, X } from "lucide-react";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "forgot">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const auth = useAuth();
  const navigate = useNavigate();

  // Convex mutations
  const signInMutation = useMutation(api.auth.signIn);
  const signUpMutation = useMutation(api.auth.signUp);
  const selfResetMutation = useMutation(api.auth.selfResetPassword);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInMutation({
        email: email.trim(),
        password: password.trim(),
      });

      if (result.success && result.token) {
        toast.success(`${result.user.name}님, 환영합니다!`);
        await auth.signin(result.token);
        onClose();
        window.location.replace("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.data?.message || err.message || "로그인에 실패했습니다.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("모든 정보를 기입해 주세요.");
      return;
    }
    if (password.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUpMutation({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });

      if (result.success && result.token) {
        toast.success("가입 신청이 성공적으로 접수되었습니다!");
        await auth.signin(result.token);
        onClose();
        navigate("/pending");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.data?.message || err.message || "가입 신청에 실패했습니다.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !newPassword.trim()) {
      toast.error("모든 정보를 기입해 주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("비밀번호는 최소 4자리 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);
    try {
      await selfResetMutation({
        name: name.trim(),
        email: email.trim(),
        newPassword: newPassword.trim(),
      });
      toast.success("비밀번호가 성공적으로 재설정되었습니다! 새로운 비밀번호로 로그인해 주세요.");
      setActiveTab("login");
      resetForm();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.data?.message || err.message || "비밀번호 재설정에 실패했습니다.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-background/90 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-center">
            {activeTab === "login"
              ? "MCCI-SMPCC 로그인"
              : activeTab === "forgot"
              ? "비밀번호 재설정"
              : "MCCI-SMPCC 가입 신청"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {activeTab === "login"
              ? "계정의 이메일과 비밀번호를 입력해 주세요."
              : activeTab === "forgot"
              ? "가입하신 이름과 이메일을 입력하여 비밀번호를 재설정하세요."
              : "시스템 이용을 위한 신규 계정 정보를 입력해 주세요."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Segment Switcher */}
        {activeTab !== "forgot" && (
          <div className="flex bg-muted/60 p-1 rounded-xl gap-1 border border-border/20 mb-4">
            <button
              onClick={() => {
                setActiveTab("login");
                resetForm();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                resetForm();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              가입 신청
            </button>
          </div>
        )}

        {/* Form area */}
        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">이메일 주소</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 pr-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail("")}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer rounded-full hover:bg-muted/50 transition-colors"
                    title="입력 지우기"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">비밀번호</Label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("forgot");
                    resetForm();
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-semibold rounded-xl mt-6 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>
          </form>
        ) : activeTab === "forgot" ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-name">이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">이메일 주소</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 pr-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="forgot-new-password">새 비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-new-password"
                  type="password"
                  placeholder="최소 4자 이상"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="forgot-confirm-password">새 비밀번호 확인</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-semibold rounded-xl mt-6 flex items-center justify-center gap-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  비밀번호 재설정 중...
                </>
              ) : (
                "비밀번호 재설정 완료"
              )}
            </Button>

            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  resetForm();
                }}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer hover:underline"
              >
                로그인 화면으로 돌아가기
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-email">이메일 주소</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 pr-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail("")}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer rounded-full hover:bg-muted/50 transition-colors"
                    title="입력 지우기"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="최소 6자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-semibold rounded-xl mt-6 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  가입 신청 중...
                </>
              ) : (
                "가입 신청 완료"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
