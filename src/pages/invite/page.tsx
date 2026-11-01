import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import {
  Sparkles,
  Award,
  CheckCircle2,
  CalendarDays,
  Clock,
  ShieldCheck,
  Smartphone,
  Share2,
  Plus,
  MoreVertical,
  ArrowRight,
  LogIn,
  UserPlus,
  Users,
  QrCode,
  GraduationCap,
  BookOpen,
  AlertCircle,
  Check,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export default function InviteLandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const { user } = useCurrentUser();

  const cohortIdParam = searchParams.get("cohortId") as Id<"cohorts"> | null;

  // Cohort invite data (public query)
  const cohort = useQuery(
    api.cohorts.getCohortInviteInfo,
    cohortIdParam ? { cohortId: cohortIdParam } : {},
  );

  const signUpMutation = useMutation(api.auth.signUp);
  const signInMutation = useMutation(api.auth.signIn);

  const isGeneral = Boolean(cohort?.isGeneralInvite);

  // Cohort options list (merging DB cohorts with previous alumni cohorts 1~16)
  const cohortOptions = useMemo(() => {
    const dbCohorts = cohort?.allCohorts || [];

    // Find numbers that are already present in DB
    const presentNumbers = new Set(
      dbCohorts
        .map((c) => {
          if (typeof c.number === "number") return c.number;
          const match = c.name.match(/\d+/);
          return match ? parseInt(match[0], 10) : null;
        })
        .filter(Boolean),
    );

    const result: Array<{
      value: string;
      label: string;
      status?: string;
      isVirtual?: boolean;
      group: "current" | "alumni";
    }> = [];

    // Add DB cohorts
    for (const c of dbCohorts) {
      const isCurrent = c.status === "active" || c.status === "upcoming";
      result.push({
        value: c._id,
        label: c.name,
        status: c.status === "active" ? "진행중" : c.status === "upcoming" ? "예정" : "수료",
        group: isCurrent ? "current" : "alumni",
      });
    }

    // Add virtual previous cohorts (16 down to 1) if not in DB
    for (let n = 16; n >= 1; n--) {
      if (!presentNumbers.has(n)) {
        result.push({
          value: `num:${n}`,
          label: `${n}기`,
          status: "수료",
          isVirtual: true,
          group: "alumni",
        });
      }
    }

    return result;
  }, [cohort?.allCohorts]);

  // Selected cohort in sign up form
  const [selectedCohortVal, setSelectedCohortVal] = useState<string>("");

  useEffect(() => {
    if (cohortIdParam) {
      setSelectedCohortVal(cohortIdParam);
    } else if (!selectedCohortVal && cohort && !cohort.isGeneralInvite) {
      setSelectedCohortVal(cohort._id);
    }
  }, [cohortIdParam, cohort]);

  const selectedCohortLabel = useMemo(() => {
    if (!selectedCohortVal) return "";
    const opt = cohortOptions.find((o) => o.value === selectedCohortVal);
    return opt ? opt.label : "";
  }, [selectedCohortVal, cohortOptions]);

  // Sign up form state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign in form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      toast.error("이름, 이메일, 비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (!selectedCohortVal) {
      toast.error("소속 기수를 선택해 주세요.");
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      let targetCohortId: Id<"cohorts"> | undefined = undefined;
      let targetCohortNumber: number | undefined = undefined;
      let targetCohortName: string | undefined = undefined;

      if (selectedCohortVal.startsWith("num:")) {
        targetCohortNumber = parseInt(selectedCohortVal.replace("num:", ""), 10);
        targetCohortName = `${targetCohortNumber}기`;
      } else {
        targetCohortId = selectedCohortVal as Id<"cohorts">;
        const found = cohortOptions.find((o) => o.value === selectedCohortVal);
        targetCohortName = found ? found.label : undefined;
      }

      const result = await signUpMutation({
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword.trim(),
        cohortId: targetCohortId,
        cohortNumber: targetCohortNumber,
        cohortName: targetCohortName,
      });

      if (result.success && result.token) {
        toast.success(`${signUpName.trim()}님, ${targetCohortName ?? "과정"} 가입 신청이 완료되었습니다!`);
        await auth.signin(result.token);
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = err instanceof ConvexError ? (err.data as any)?.message : err?.message;
      toast.error(msg || "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPassword.trim()) {
      toast.error("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await signInMutation({
        email: signInEmail.trim(),
        password: signInPassword.trim(),
      });

      if (result.success && result.token) {
        toast.success(`${result.user.name}님, 환영합니다!`);
        await auth.signin(result.token);
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = err instanceof ConvexError ? (err.data as any)?.message : err?.message;
      toast.error(msg || "로그인에 실패했습니다.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const cohortName = cohort?.name ?? "18기";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="MCCI-SMPCC" className="w-8 h-8 rounded-lg object-cover" />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-foreground leading-tight">
                MCCI-SMPCC
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                멘탈코칭전문가 양성과정
              </span>
            </div>
          </div>
          {user ? (
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/dashboard")}>
              대시보드 바로가기 →
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => {
                const el = document.getElementById("register-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              참가 등록하기
            </Button>
          )}
        </div>
      </header>

      {/* ── Hero Spotlight Section ── */}
      <section className="relative py-12 md:py-20 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b border-border/40">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-2 flex-wrap"
          >
            <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-1 text-xs shadow-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              {isGeneral ? "MCCI-SMPCC 동문 공식 초대장" : (cohort ? `${cohort.name} 공식 초대장` : "신규 기수 공식 초대장")}
            </Badge>
            {isGeneral ? (
              <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10">
                🏛️ 16기 이전 및 전체 수료 동문 환영
              </Badge>
            ) : (
              cohort?.status === "active" && (
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  🟢 현재 진행중
                </Badge>
              )
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-balance leading-tight"
          >
            {isGeneral ? (
              <>
                멘탈코칭 전문가 과정 수료 동문,
                <br />
                <span className="text-primary">MCCI 동문 코칭패스</span>에 초대합니다
              </>
            ) : (
              <>
                차세대 멘탈코칭 전문가의 여정,
                <br />
                <span className="text-primary">{cohortName} 코칭패스</span>에 초대합니다
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto text-balance leading-relaxed"
          >
            {isGeneral
              ? "16기 이전 수료 코치님 및 동문 여러분의 지속적인 코칭 실습일지 기록, 6대 역량 AI 품질분석 및 자격증 관리를 스마트하게 지원합니다."
              : "국제멘탈코칭센터(MCCI) 정규 커리큘럼 기반의 출석 체크, 실습일지 작성, 그리고 AI 역량 품질분석까지 한 곳에서 스마트하게 관리하세요."}
          </motion.p>

          {/* Cohort / Alumni Summary Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-6 p-4 rounded-2xl bg-card border border-border/80 shadow-xs max-w-lg mx-auto text-left text-xs sm:text-sm space-y-2"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <GraduationCap className="w-4 h-4 text-primary" />
                {isGeneral ? "과정 구분" : "과정명"}
              </span>
              <span className="font-bold text-foreground">
                {isGeneral ? "MCCI-SMPCC 전문가 과정 (전체 동문 / 수료생)" : `${cohort?.name ?? cohortName} 코칭 전문가 과정`}
              </span>
            </div>
            {isGeneral ? (
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Users className="w-4 h-4 text-primary" />
                  초대 대상
                </span>
                <span className="font-semibold text-foreground">
                  16기 이전 수료 코치 및 전 기수 동문
                </span>
              </div>
            ) : (
              cohort?.startDate && cohort?.endDate && (
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    교육 기간
                  </span>
                  <span className="font-semibold text-foreground">
                    {cohort.startDate} ~ {cohort.endDate}
                  </span>
                </div>
              )
            )}
            <div className="pt-1 text-xs text-muted-foreground leading-relaxed">
              {isGeneral
                ? "💡 아래 가입 양식에서 본인의 소속 기수(1~16기 등)를 선택하시면 해당 기수로 자동 등록 배정됩니다."
                : (cohort?.description ? `• ${cohort.description}` : "• 국제멘탈코칭센터 공인 멘탈코칭 전문가 양성 커리큘럼")}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {/* ── 4 Key Features Grid ── */}
        <section className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Coachingpass에서 누리는 4대 핵심 혜택
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              멘탈코칭 전문가 자격 취득의 모든 과정이 체계적으로 자동화됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardContent className="p-5 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-foreground">AI 코칭 품질 분석</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  작성하신 코칭 실습일지를 KAC/KPC 8대 핵심역량 기준으로 AI가 자동 진단하고 성장 피드백을 제공합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardContent className="p-5 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-foreground">스마트 QR 출석체크</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  세미나 현장 빔프로젝터의 QR 코드를 스마트폰으로 비추면 1초 만에 실시간 출석이 완료됩니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardContent className="p-5 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-foreground">자격 요건 자동 트래킹</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  교육 60시간, 코칭 실습 100시간 및 수퍼비전 이수 진도율을 실시간 원형 그래프로 한눈에 확인합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardContent className="p-5 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-foreground">멘토코칭 & 스터디 조</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  배정된 전담 멘토코치와의 1:1 피드백 및 기수 동기들과의 스터디 조 편성 정보를 간편하게 공유합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Registration / Login Form Card ── */}
        <section id="register-section" className="max-w-md mx-auto space-y-4">
          <div className="text-center space-y-1">
            <Badge variant="outline" className="text-xs border-primary/30 text-primary font-semibold">
              {isGeneral ? "동문 간편 참가 등록" : "간편 참가 신청"}
            </Badge>
            <h2 className="text-2xl font-bold text-foreground">
              {isGeneral ? "MCCI 동문 참가 등록" : `${cohortName} 참가 등록`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isGeneral
                ? "소속 기수와 기본 정보를 입력하시면 동문 코치로 바로 등록 접수됩니다."
                : `소속 기수를 확인하고 기본 정보를 입력하시면 ${cohortName} 교육생으로 등록됩니다.`}
            </p>
          </div>

          <Card className="border-primary/20 shadow-md overflow-hidden bg-card">
            <CardContent className="p-6">
              {user ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      {user.name}님, 이미 로그인되어 있습니다.
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.email} 계정으로 접속 중입니다.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/dashboard")} className="w-full gap-2 text-xs font-semibold h-10">
                    대시보드로 이동하기
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="signup" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
                    <TabsTrigger value="signup" className="text-xs font-semibold">
                      신규 참가 신청
                    </TabsTrigger>
                    <TabsTrigger value="signin" className="text-xs font-semibold">
                      기존 계정 로그인
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Sign Up */}
                  <TabsContent value="signup" className="space-y-4 mt-0">
                    <form onSubmit={handleSignUp} className="space-y-3.5">
                      {/* Cohort Selector Field */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-primary" />
                            소속 기수 선택 *
                          </span>
                          {!isGeneral && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              (다른 기수이신 경우 변경 가능)
                            </span>
                          )}
                        </label>
                        <Select
                          value={selectedCohortVal}
                          onValueChange={setSelectedCohortVal}
                        >
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue placeholder="소속 기수를 선택해 주세요 (예: 16기, 15기...)" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {cohortOptions.some((o) => o.group === "current") && (
                              <>
                                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                  현재 진행 / 예정 기수
                                </div>
                                {cohortOptions
                                  .filter((o) => o.group === "current")
                                  .map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      <div className="flex items-center gap-2">
                                        <span>{opt.label}</span>
                                        {opt.status && (
                                          <span className="text-[11px] text-emerald-600 font-semibold">({opt.status})</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                <div className="my-1 border-t border-border/50" />
                              </>
                            )}
                            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                              이전 수료 기수 (16기 이전 동문)
                            </div>
                            {cohortOptions
                              .filter((o) => o.group === "alumni")
                              .map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <span>{opt.label}</span>
                                    <span className="text-[11px] text-muted-foreground">({opt.status ?? "수료"})</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">성명 (실명 입력)</label>
                        <Input
                          placeholder="예: 홍길동"
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          className="h-9 text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">이메일 주소 (아이디)</label>
                        <Input
                          type="email"
                          placeholder="coach@example.com"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          className="h-9 text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">비밀번호 (6자 이상)</label>
                        <Input
                          type="password"
                          placeholder="비밀번호 입력"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="h-9 text-xs"
                          required
                        />
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-10 text-xs font-semibold gap-1.5 shadow-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          {isSubmitting
                            ? "신청 등록 중..."
                            : isGeneral
                              ? "동문 참가 등록 및 가입"
                              : `${selectedCohortLabel || cohortName} 참가 등록 및 가입`}
                        </Button>
                      </div>

                      <p className="text-[11px] text-muted-foreground text-center pt-1">
                        가입 신청 완료 즉시 {selectedCohortLabel || (isGeneral ? "동문 과정" : cohortName)} 수강 명단에 등록됩니다.
                      </p>
                    </form>
                  </TabsContent>

                  {/* Tab 2: Sign In */}
                  <TabsContent value="signin" className="space-y-4 mt-0">
                    <form onSubmit={handleSignIn} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">이메일 주소</label>
                        <Input
                          type="email"
                          placeholder="coach@example.com"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          className="h-9 text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">비밀번호</label>
                        <Input
                          type="password"
                          placeholder="비밀번호 입력"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="h-9 text-xs"
                          required
                        />
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={isLoggingIn}
                          className="w-full h-10 text-xs font-semibold gap-1.5"
                        >
                          <LogIn className="w-4 h-4" />
                          {isLoggingIn ? "로그인 중..." : "로그인하고 대시보드 열기"}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── App Install Guide Section (PWA) ── */}
        <section className="p-6 sm:p-8 rounded-3xl bg-muted/30 border border-border/80 space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Smartphone className="w-3.5 h-3.5" />
              10초 만에 앱 설치하기
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              스마트폰 홈 화면에 추가하고 앱처럼 사용하세요
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
              앱스토어나 플레이스토어 검색 없이, 브라우저 메뉴에서 바로 스마트폰 홈 화면에 아이콘을 생성할 수 있습니다.
            </p>
          </div>

          <Tabs defaultValue="iphone" className="w-full max-w-2xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-10">
              <TabsTrigger value="iphone" className="text-xs sm:text-sm font-semibold gap-1.5">
                <span>🍎 아이폰 (iOS / Safari)</span>
              </TabsTrigger>
              <TabsTrigger value="android" className="text-xs sm:text-sm font-semibold gap-1.5">
                <span>🤖 갤럭시 (Android / Chrome)</span>
              </TabsTrigger>
            </TabsList>

            {/* iPhone Steps */}
            <TabsContent value="iphone" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      Safari(사파리) 브라우저로 이 페이지 접속
                    </p>
                    <p className="text-xs text-muted-foreground">
                      카카오톡이나 인앱 브라우저로 열렸다면, 우측 하단 더보기 메뉴에서 <strong>'Safari로 열기'</strong>를 눌러주세요.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      화면 하단 가운데의 <Share2 className="w-3.5 h-3.5 text-primary" /> 공유 버튼 탭
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Safari 브라우저 하단 툴바 중앙의 네모 위 화살표 아이콘(공유하기)을 터치합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-primary" /> &lsquo;홈 화면에 추가&rsquo; 선택 후 완료
                    </p>
                    <p className="text-xs text-muted-foreground">
                      메뉴를 아래로 내려 &lsquo;홈 화면에 추가&rsquo;를 누른 뒤 오른쪽 상단 &lsquo;추가&rsquo;를 탭하면 스마트폰 바탕화면에 앱 아이콘이 생성됩니다!
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Android Steps */}
            <TabsContent value="android" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      Chrome(크롬) 브라우저로 이 페이지 접속
                    </p>
                    <p className="text-xs text-muted-foreground">
                      안정적인 실행과 알림을 위해 기본 Chrome 브라우저 사용을 권장합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      우측 상단 더보기 <MoreVertical className="w-3.5 h-3.5 text-primary" /> 아이콘 탭
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chrome 주소창 우측의 점 세 개 메뉴(⋮)를 터치합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-primary" /> &lsquo;홈 화면에 추가&rsquo; 또는 &lsquo;앱 설치&rsquo; 탭
                    </p>
                    <p className="text-xs text-muted-foreground">
                      메뉴 항목 중 &lsquo;홈 화면에 추가&rsquo;를 선택하시면 바탕화면에 설치되어 앱처럼 전체화면으로 이용하실 수 있습니다!
                    </p>
                  </div>
                </div>
              </div>

              {/* Samsung Internet Tip */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                  <span className="font-semibold">삼성 인터넷 브라우저 이용 시:</span> 우측 하단 메뉴(≡) ➔ &lsquo;현재 페이지 추가&rsquo; ➔ &lsquo;홈 화면&rsquo;을 선택하시거나, Chrome 브라우저를 이용하시면 가장 원활합니다.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-border/60 py-8 px-4 sm:px-6 bg-card text-center text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-2 font-semibold text-foreground">
          <img src="/logo.png" alt="MCCI" className="w-5 h-5 rounded object-cover" />
          <span>MCCI 국제멘탈코칭센터 · Coachingpass</span>
        </div>
        <p>SMPCC 멘탈코칭전문가 양성과정 자격 인증 지원 시스템</p>
        <p className="text-[11px] opacity-70">© {new Date().getFullYear()} MCCI. All rights reserved.</p>
      </footer>
    </div>
  );
}
