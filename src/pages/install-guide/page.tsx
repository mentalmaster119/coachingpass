import { motion } from "motion/react";
import {
  Smartphone,
  Share2,
  Plus,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

// ── Step type ──────────────────────────────────────────────────────────────

type Step = {
  icon: React.ReactNode;
  title: string;
  desc: string;
};

// ── Sub-components ─────────────────────────────────────────────────────────

function PlatformBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function StepCard({ step, index, accent }: { step: Step; index: number; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="flex gap-4 items-start"
    >
      {/* connector */}
      <div className="flex flex-col items-center gap-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${accent}`}>
          {index + 1}
        </div>
        <div className="w-0.5 flex-1 bg-border min-h-[16px]" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-muted-foreground">{step.icon}</span>
          <p className="text-sm font-semibold">{step.title}</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
      </div>
    </motion.div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-3.5">
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{children}</p>
    </div>
  );
}

// ── Step data ──────────────────────────────────────────────────────────────

const iphoneSteps: Step[] = [
  {
    icon: <Smartphone className="w-4 h-4" />,
    title: "Safari 앱 실행",
    desc: "반드시 Safari 브라우저를 사용해야 합니다. Chrome, 카카오톡 내장 브라우저 등에서는 이 기능이 지원되지 않습니다.",
  },
  {
    icon: <Share2 className="w-4 h-4" />,
    title: "이 사이트 접속 후 공유 버튼 탭",
    desc: "화면 하단(또는 상단) 가운데의 화살표가 위로 향한 공유 아이콘(□↑)을 탭합니다.",
  },
  {
    icon: <Plus className="w-4 h-4" />,
    title: '"홈 화면에 추가" 선택',
    desc: '공유 메뉴를 아래로 스크롤하면 "홈 화면에 추가" 항목이 보입니다. 탭하여 선택합니다.',
  },
  {
    icon: <CheckCircle2 className="w-4 h-4" />,
    title: "이름 확인 후 '추가' 탭",
    desc: '앱 이름을 원하는 대로 수정할 수 있습니다. 완료 후 오른쪽 상단 "추가" 버튼을 탭하면 홈 화면에 아이콘이 생성됩니다.',
  },
];

const androidSteps: Step[] = [
  {
    icon: <Smartphone className="w-4 h-4" />,
    title: "Chrome 앱 실행",
    desc: "반드시 Google Chrome 브라우저를 사용해야 합니다. 삼성 인터넷, 네이버 앱 등 다른 브라우저는 지원이 다를 수 있습니다.",
  },
  {
    icon: <RefreshCw className="w-4 h-4" />,
    title: "이 사이트 접속",
    desc: "저장하려는 페이지 주소(URL)를 Chrome 주소창에 입력하여 접속합니다.",
  },
  {
    icon: <MoreVertical className="w-4 h-4" />,
    title: "오른쪽 상단 점 3개 메뉴 탭",
    desc: 'Chrome 브라우저 오른쪽 상단의 점 3개(⋮) 아이콘을 탭하여 메뉴를 엽니다.',
  },
  {
    icon: <Plus className="w-4 h-4" />,
    title: '"홈 화면에 추가" 또는 "앱 설치" 선택',
    desc: '메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 선택합니다. 이름을 확인 후 "추가"를 탭하면 완료됩니다.',
  },
];

const benefits = [
  {
    icon: <Zap className="w-4 h-4" />,
    title: "즉시 실행",
    desc: "아이콘 탭 한 번으로 바로 실행. 브라우저 주소창 입력 불필요.",
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    title: "앱스토어 불필요",
    desc: "별도 설치·승인 없이 링크만으로 현장 배포 가능.",
  },
  {
    icon: <Smartphone className="w-4 h-4" />,
    title: "전체 화면 경험",
    desc: "일반 앱과 동일하게 전체 화면으로 실행됩니다.",
  },
  {
    icon: <RefreshCw className="w-4 h-4" />,
    title: "항상 최신 버전",
    desc: "업데이트 없이 접속할 때마다 자동으로 최신 내용 반영.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function InstallGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-primary px-6 py-8 text-primary-foreground text-center space-y-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">홈 화면에 앱 추가하기</h1>
          <p className="text-sm text-primary-foreground/80 max-w-sm mx-auto leading-relaxed">
            이 사이트를 스마트폰 홈 화면에 아이콘으로 저장하면, 앱스토어 설치 없이도 일반 앱처럼 바로 실행할 수 있습니다.
          </p>
        </motion.div>

        {/* ── Benefits ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 gap-3"
        >
          {benefits.map((b) => (
            <div key={b.title} className="rounded-xl border bg-card p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                {b.icon}
                <span className="text-sm font-semibold text-foreground">{b.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* ── iPhone ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="rounded-2xl border bg-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b bg-muted/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
              <span className="text-white text-base leading-none">🍎</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm">아이폰 (iPhone)</p>
                <PlatformBadge label="Safari 전용" color="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" />
              </div>
              <p className="text-xs text-muted-foreground">iOS Safari에서만 지원됩니다</p>
            </div>
          </div>

          <div className="px-5 pt-5 pb-2">
            {iphoneSteps.map((step, i) => (
              <StepCard key={i} step={step} index={i} accent="bg-gray-800" />
            ))}
          </div>

          <div className="px-5 pb-5">
            <TipBox>
              공유 목록에 "홈 화면에 추가"가 보이지 않으면, 목록 맨 아래 <strong>편집</strong>을 탭해 항목을 추가할 수 있습니다.
              최신 iOS에서는 "웹 앱으로 열기" 옵션이 나타날 수 있으며, 이것도 동일한 기능입니다.
            </TipBox>
          </div>
        </motion.div>

        {/* ── Android ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border bg-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b bg-muted/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center">
              <span className="text-white text-base leading-none">🤖</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm">안드로이드 (Android)</p>
                <PlatformBadge label="Chrome 전용" color="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" />
              </div>
              <p className="text-xs text-muted-foreground">Google Chrome에서만 지원됩니다</p>
            </div>
          </div>

          <div className="px-5 pt-5 pb-2">
            {androidSteps.map((step, i) => (
              <StepCard key={i} step={step} index={i} accent="bg-green-600" />
            ))}
          </div>

          <div className="px-5 pb-5">
            <TipBox>
              기기 종류나 브라우저 버전에 따라 "홈 화면에 추가" 대신 <strong>"앱 설치"</strong>로 표시될 수 있습니다.
              이는 이 사이트가 설치형 웹앱(PWA) 조건을 충족한 경우로, 더 완성도 높은 앱 경험을 제공합니다.
            </TipBox>
          </div>
        </motion.div>

        {/* ── Use case ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-5 space-y-3"
        >
          <p className="text-sm font-semibold">활용 예시</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            코칭 체크리스트나 선수 자기점검 페이지를 하나의 주소로 만들어두면, 수강생과 선수가 해당 주소를 홈 화면에 저장하여
            일반 앱처럼 한 번에 실행할 수 있습니다. 별도 앱스토어 등록 없이 현장에서 바로 배포하기 좋은 방법입니다.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
