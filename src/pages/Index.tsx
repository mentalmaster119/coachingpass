import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { Authenticated } from "@/components/providers/convex.tsx";
import { AuthLoading, Unauthenticated } from "@/components/providers/convex.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  BarChart3,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Brain,
  Users,
  Award,
  AlertTriangle,
  X,
} from "lucide-react";

const features = [
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "진행 현황 한눈에",
    description:
      "교육 이수, 코칭 실습, 멘토코칭, 그룹코칭 등 모든 요건별 진행률을 실시간 대시보드로 확인하세요.",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "체계적인 기록 관리",
    description:
      "세미나 출석, 수퍼비전, 멘토링 등 모든 성장 기록을 한 곳에서 체계적으로 관리하세요.",
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "자격증 요건 자동 평가",
    description:
      "SMPCC 인증 요건을 자동으로 산출하고, 부족한 항목을 즉시 파악해 준비를 완료하세요.",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "멘탈코칭 전문 설계",
    description:
      "국제멘탈코칭센터(MCCI) 커리큘럼에 맞춰 설계된 전용 플랫폼입니다.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "그룹 코칭 관리",
    description:
      "그룹코칭 일정·장소·온오프라인 여부를 관리하고 출석 현황을 손쉽게 추적하세요.",
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "자격증 취득 지원",
    description:
      "교육 이력부터 인증 신청까지, MCCI-SMPCC 멘탈코칭 전문가 자격 취득의 전 과정을 지원합니다.",
  },
];

function AuthRedirect() {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    if (user.approvalStatus === "pending" || user.approvalStatus === "rejected") {
      navigate("/pending", { replace: true });
    } else if (user.approvalStatus === "approved" && !user.onboardingCompleted) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Skeleton className="h-12 w-48" />
    </div>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen overflow-hidden">
      <Authenticated>
        <AuthRedirect />
      </Authenticated>

      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Skeleton className="h-12 w-48" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </div>
  );
}

// Detect Samsung Internet browser by user agent
function isSamsungInternet(): boolean {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

function SamsungInternetWarning() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-start gap-3 px-4 py-3 bg-amber-500 text-white shadow-lg">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm leading-snug">
        <p className="font-semibold">삼성 인터넷 브라우저에서는 로그인이 원활하지 않을 수 있습니다.</p>
        <p className="mt-0.5 opacity-90">
          <strong>Chrome 브라우저</strong>에서 접속하시거나, Chrome으로 홈화면에 추가하시면 정상 이용 가능합니다.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors cursor-pointer"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function LandingPage() {
  const showSamsungWarning = isSamsungInternet();
  const mockLogin = useMutation(api.users.setActiveMockUser);
  const { signin } = useAuth();

  const handleLoginAs = async (role: "admin" | "senior_coach" | "trainee") => {
    try {
      await mockLogin({ role });
      await signin();
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {showSamsungWarning && <SamsungInternetWarning />}
      {/* Hero Section */}
      <section
        className="relative flex-1 flex flex-col items-center justify-center px-6 py-24 text-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.295 0.165 258) 0%, oklch(0.22 0.12 260) 50%, oklch(0.16 0.06 265) 100%)",
        }}
      >
        {/* Background geometric pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-white/5"
              style={{
                width: `${(i + 2) * 180}px`,
                height: `${(i + 2) * 180}px`,
                left: "50%",
                top: "50%",
                x: "-50%",
                y: "-50%",
              }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{
                duration: 30 + i * 8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3"
          >
            <img
              src="https://hercules-cdn.com/file_uHh39M39J1KleqsaYGSnjsic"
              alt="MCCI-SMPCC 로고"
              className="w-14 h-14 rounded-2xl object-cover"
            />
            <div className="text-left">
              <p className="text-white font-bold text-2xl leading-tight">MCCI-SMPCC</p>
              <p className="text-white/60 text-sm">인증지원시스템</p>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-balance leading-tight">
              멘탈코칭 전문가
              <br />
              <span style={{ color: "oklch(0.783 0.133 73)" }}>자격 인증의 동반자</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto text-balance">
              MCCI-SMPCC 멘탈코칭전문가 자격증 준비부터 취득까지,
              모든 성장 기록을 체계적으로 관리하고 실시간으로 현황을 파악하세요.
            </p>
            <p className="text-base font-semibold" style={{ color: "oklch(0.783 0.133 73)" }}>
              AI시대를 이끌어 갈 멘탈코칭전문가 자격에 도전하세요!
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col gap-4 w-full max-w-xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <button
                onClick={() => handleLoginAs("trainee")}
                className="h-12 px-6 text-sm font-semibold rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/10 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
              >
                교육생으로 로그인
              </button>
              <button
                onClick={() => handleLoginAs("senior_coach")}
                className="h-12 px-6 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
              >
                멘토코치로 로그인
              </button>
              <button
                onClick={() => handleLoginAs("admin")}
                className="h-12 px-6 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
              >
                관리자로 로그인
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 text-white/60 text-sm mt-2">
              <ShieldCheck className="w-4 h-4" />
              <span>국제멘탈코칭센터 전용 시스템</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14 space-y-3"
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-widest">
              주요 기능
            </p>
            <h2 className="text-3xl font-bold text-foreground">
              자격증 취득을 더 체계적으로
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-card-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        className="px-6 py-16 text-center"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.937 0.018 256) 0%, oklch(0.983 0.004 247) 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto space-y-6"
        >
          <h2 className="text-2xl font-bold text-foreground">
            지금 바로 시작하세요
          </h2>
          <p className="text-muted-foreground">
            수강생 등록 후 관리자 승인을 받으면 모든 기능을 이용할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignInButton signInText="로그인" className="h-11 px-8 font-semibold rounded-xl" />
            <SignInButton
              signInText="회원가입"
              showIcon={false}
              className="h-11 px-8 font-semibold rounded-xl"
              variant="secondary"
            />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-6 py-6 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} 국제멘탈코칭센터(MCCI) · MCCI-SMPCC 인증지원시스템
        </p>
      </footer>
    </div>
  );
}
