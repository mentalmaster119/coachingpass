import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated } from "@/components/providers/convex.tsx";
import { AuthLoading, Unauthenticated } from "@/components/providers/convex.tsx";
import { motion } from "motion/react";
import { Clock, XCircle, Trophy, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { SignInButton } from "@/components/ui/signin.tsx";

function PendingContent() {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const { signout } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;
    // If approved, redirect to onboarding or dashboard
    if (user.approvalStatus === "approved") {
      if (!user.onboardingCompleted) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signout();
    // Use full page reload to ensure all in-memory auth state (Convex JWT, OIDC cache) is cleared.
    window.location.replace("/");
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-md mx-auto p-8">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    );
  }

  const isRejected = user?.approvalStatus === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full mx-auto text-center space-y-6"
    >
      {/* Icon */}
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
          isRejected ? "bg-destructive/10" : "bg-primary/10"
        }`}
      >
        {isRejected ? (
          <XCircle className="w-10 h-10 text-destructive" />
        ) : (
          <Clock className="w-10 h-10 text-primary" />
        )}
      </div>

      {/* Title & description */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {isRejected ? "가입이 거절되었습니다" : "승인 대기 중입니다"}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {isRejected
            ? "관리자가 가입을 거절했습니다. 아래 사유를 확인하고 문의해 주세요."
            : "관리자가 계정을 검토 중입니다. 승인 후 시스템 이용이 가능합니다."}
        </p>
      </div>

      {/* Rejection reason */}
      {isRejected && user?.rejectionReason && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1">
            거절 사유
          </p>
          <p className="text-sm text-foreground">{user.rejectionReason}</p>
        </div>
      )}

      {/* Pending info */}
      {!isRejected && (
        <div className="bg-secondary rounded-xl p-4 text-left space-y-2">
          <p className="text-sm font-medium text-foreground">안내사항</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              관리자 승인 후 자동으로 시스템이 열립니다.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              승인은 영업일 기준 1~2일 소요될 수 있습니다.
            </li>
          </ul>
        </div>
      )}

      {/* Contact */}
      <a
        href="mailto:info@imcc.kr"
        className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
      >
        <Mail className="w-4 h-4" />
        문의하기
      </a>

      {/* Sign out */}
      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        로그아웃
      </Button>
    </motion.div>
  );
}

export default function PendingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="flex items-center gap-2 px-6 py-4 border-b border-border"
        style={{ background: "oklch(0.295 0.165 258)" }}
      >
        <Trophy className="w-5 h-5 text-accent" />
        <span className="font-bold text-white text-sm">MCCI-SMPCC</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <AuthLoading>
          <Skeleton className="h-64 w-80" />
        </AuthLoading>
        <Unauthenticated>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">로그인이 필요합니다.</p>
            <SignInButton />
          </div>
        </Unauthenticated>
        <Authenticated>
          <PendingContent />
        </Authenticated>
      </main>
    </div>
  );
}
