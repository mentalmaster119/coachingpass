import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Paperclip, X, Save, Send, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type CoachingLog = Doc<"coachingLogs"> & { evidenceUrl?: string | null };

type StateScores = {
  motivation: number | null;
  confidence: number | null;
  focus: number | null;
  calmness: number | null;
  actionWill: number | null;
};

const DEFAULT_SCORES: StateScores = {
  motivation: 5,
  confidence: 5,
  focus: 5,
  calmness: 5,
  actionWill: 5,
};

const NA_SCORES: StateScores = {
  motivation: null,
  confidence: null,
  focus: null,
  calmness: null,
  actionWill: null,
};

const COACHING_TYPES = [
  { value: "individual", label: "개인 코칭" },
  { value: "group", label: "그룹 코칭" },
] as const;

const COACHING_PLACES = [
  { value: "hanyang", label: "한양대 올림픽체육관" },
  { value: "center", label: "센터" },
  { value: "zoom", label: "Zoom" },
  { value: "other", label: "기타(직접입력)" },
] as const;

const SESSION_NUMBERS = [
  { value: "1", label: "1회차" },
  { value: "2", label: "2회차" },
  { value: "3", label: "3회차" },
  { value: "other", label: "기타" },
] as const;

const COACHEE_TYPES = [
  "선수", "지도자", "학부모", "학생", "직장인", "리더", "코치", "기타"
];

const CORE_ISSUES = {
  "의욕 영역": ["동기저하", "목표상실", "무기력", "번아웃"],
  "실력 영역": ["집중력", "자신감", "감정조절", "자기통제", "루틴", "기량향상"],
  "실전력 영역": ["실전불안", "압박감", "경기력 저하", "실수 후 회복", "수행불안"],
  "관계 영역": ["부모", "지도자", "팀원", "친구", "동료", "가족"],
  "기타": ["진로", "학업", "생활습관", "정체성", "기타"],
};

const TECHNIQUES = [
  "히어로인터뷰", "포스트잇", "타임라인", "HPPC", "VAK",
  "루틴", "의자기법", "3F", "3x5 질문법",
];

const MCCI_DOMAINS = [
  { value: "motivation", label: "의욕" },
  { value: "skill", label: "실력" },
  { value: "performance", label: "실전력" },
  { value: "relationship", label: "관계" },
] as const;

const STATE_LABELS: (keyof StateScores)[] = [
  "motivation", "confidence", "focus", "calmness", "actionWill"
];
const STATE_KO: Record<keyof StateScores, string> = {
  motivation: "의욕",
  confidence: "자신감",
  focus: "집중력",
  calmness: "평온함",
  actionWill: "실행의지",
};

// Steps definition
const STEPS = [
  { id: 1, title: "기본정보", short: "기본" },
  { id: 2, title: "코칭 주제", short: "주제" },
  { id: 3, title: "상태 진단", short: "진단" },
  { id: 4, title: "기법 & 발견", short: "기법" },
  { id: 5, title: "실행 & 성장", short: "성장" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLog?: CoachingLog;
};

// ── Checkbox group ─────────────────────────────────────────────────────────
function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer",
            selected.includes(opt)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── State score row ─────────────────────────────────────────────────────────
function StateScoreRow({
  scores,
  onChange,
}: {
  scores: StateScores;
  onChange: (key: keyof StateScores, val: number | null) => void;
}) {
  return (
    <div className="space-y-3">
      {STATE_LABELS.map((key) => {
        const isNA = scores[key] === null;
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{STATE_KO[key]}</span>
              <button
                type="button"
                onClick={() => onChange(key, isNA ? 5 : null)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] border transition-colors cursor-pointer",
                  isNA
                    ? "bg-muted border-border text-muted-foreground font-semibold"
                    : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive/70",
                )}
              >
                {isNA ? "NA (미진단)" : "진단 안함"}
              </button>
            </div>
            {isNA ? (
              <div className="flex items-center h-7 px-2 rounded bg-muted/50">
                <span className="text-xs text-muted-foreground">진단하지 않음</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={scores[key] ?? 5}
                  onChange={(e) => onChange(key, Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-5 text-sm font-medium text-right tabular-nums">{scores[key]}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Diagnosis panel ─────────────────────────────────────────────────────────
function DiagnosisPanel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StateScores;
  onChange: (v: StateScores) => void;
}) {
  const allNA = Object.values(value).every((v) => v === null);
  const someNA = !allNA && Object.values(value).some((v) => v === null);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">{label}</p>
        <button
          type="button"
          onClick={() => onChange(allNA ? { ...DEFAULT_SCORES } : { ...NA_SCORES })}
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] border transition-colors cursor-pointer",
            allNA
              ? "bg-muted border-border text-muted-foreground font-semibold"
              : "border-border text-muted-foreground hover:border-primary/50",
          )}
        >
          {allNA ? "전체 NA 해제" : someNA ? "전체 NA 처리" : "전체 진단 안함"}
        </button>
      </div>
      <StateScoreRow
        scores={value}
        onChange={(k, v) => onChange({ ...value, [k]: v })}
      />
    </div>
  );
}

// ── Step progress bar ────────────────────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 mb-5">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors border-2",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium hidden sm:block",
                  isActive ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground",
                )}
              >
                {step.short}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 transition-colors",
                  currentStep > step.id ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────
export default function CoachingLogForm({ open, onOpenChange, editLog }: Props) {
  const isEdit = !!editLog;
  const isDraft = editLog?.approvalStatus === "draft";

  const createLog = useMutation(api.coaching.create);
  const updateLog = useMutation(api.coaching.update);
  const saveDraft = useMutation(api.coaching.saveDraft);
  const submitDraft = useMutation(api.coaching.submitDraft);
  const generateUploadUrl = useMutation(api.coaching.generateUploadUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentDraftId, setCurrentDraftId] = useState<Id<"coachingLogs"> | undefined>(
    isDraft ? editLog?._id : undefined,
  );

  // ── Ⅰ. 기본정보
  const [coachingDate, setCoachingDate] = useState(
    editLog?.coachingDate ?? new Date().toISOString().slice(0, 10),
  );
  const [coachingStartTime, setCoachingStartTime] = useState(editLog?.coachingStartTime ?? "");
  const [coachingEndTime, setCoachingEndTime] = useState(editLog?.coachingEndTime ?? "");
  const [coachingType, setCoachingType] = useState<"individual" | "group">(
    editLog?.coachingType ?? "individual",
  );
  const [coachingPlace, setCoachingPlace] = useState(editLog?.coachingPlace ?? "");
  const [coachingPlaceOther, setCoachingPlaceOther] = useState(editLog?.coachingPlaceOther ?? "");
  const [sessionNumber, setSessionNumber] = useState(editLog?.sessionNumber ?? "");
  const [coacheeInfo, setCoacheeInfo] = useState(editLog?.coacheeInfo ?? "");
  const [coacheeGender, setCoacheeGender] = useState(editLog?.coacheeGender ?? "");
  const [coacheeAge, setCoacheeAge] = useState(editLog?.coacheeAge ? String(editLog.coacheeAge) : "");
  const [coacheePersonality, setCoacheePersonality] = useState(editLog?.coacheePersonality ?? "");
  const [coacheeType, setCoacheeType] = useState<string[]>(editLog?.coacheeType ?? []);
  const [ncpClientCategory, setNcpClientCategory] = useState<"athlete" | "general" | "">(
    editLog?.ncpClientCategory ?? "",
  );
  const [coacheeField, setCoacheeField] = useState(editLog?.coacheeField ?? "");
  const [hours, setHours] = useState<string>(
    editLog ? String(editLog.durationMinutes / 60) : "1",
  );

  // ── Ⅱ. 코칭 주제
  const [topic, setTopic] = useState(editLog?.topic ?? "");
  const [coreIssues, setCoreIssues] = useState<string[]>(editLog?.coreIssues ?? []);

  // ── Ⅲ. 상태 진단
  const [preState, setPreState] = useState<StateScores>(
    editLog?.preCoachingState ?? { ...DEFAULT_SCORES },
  );
  const [postState, setPostState] = useState<StateScores>(
    editLog?.postCoachingState ?? { ...DEFAULT_SCORES },
  );

  // ── Ⅳ. 사용 기법 & 핵심 발견
  const [techniquesUsed, setTechniquesUsed] = useState<string[]>(editLog?.techniquesUsed ?? []);
  const [techniqueOther, setTechniqueOther] = useState(editLog?.techniqueOther ?? "");
  const [clientInsight, setClientInsight] = useState(editLog?.clientInsight ?? "");
  const [coachPattern, setCoachPattern] = useState(editLog?.coachPattern ?? "");

  // ── Ⅴ. 실행 & 코치 성장
  const [goals, setGoals] = useState(editLog?.goals ?? "");
  const [actionPlan, setActionPlan] = useState(editLog?.actionPlan ?? "");
  const [nextSessionPractice, setNextSessionPractice] = useState(editLog?.nextSessionPractice ?? "");
  const [summary, setSummary] = useState(editLog?.summary ?? "");
  const [reflection, setReflection] = useState(editLog?.reflection ?? "");
  const [bestOfSession, setBestOfSession] = useState(editLog?.bestOfSession ?? "");
  const [improvementForNext, setImprovementForNext] = useState(editLog?.improvementForNext ?? "");
  const [changeKeywordsText, setChangeKeywordsText] = useState(
    editLog?.changeKeywords?.join(", ") ?? "",
  );
  const [mostEffectiveTechnique, setMostEffectiveTechnique] = useState(
    editLog?.mostEffectiveTechnique ?? "",
  );
  const [clientQuote, setClientQuote] = useState(editLog?.clientQuote ?? "");
  const [coachOverallFeedback, setCoachOverallFeedback] = useState(editLog?.coachOverallFeedback ?? "");
  const [mcciDomain, setMcciDomain] = useState(editLog?.mcciDomain ?? "");

  const [existingEvidenceId, setExistingEvidenceId] = useState<Id<"_storage"> | undefined>(
    editLog?.evidenceStorageId,
  );

  const toggleItem = (arr: string[], setArr: (v: string[]) => void) => (val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setCoachingDate(new Date().toISOString().slice(0, 10));
    setCoachingStartTime(""); setCoachingEndTime("");
    setCoachingType("individual"); setCoachingPlace(""); setCoachingPlaceOther("");
    setSessionNumber(""); setCoacheeInfo(""); setCoacheeGender(""); setCoacheeAge("");
    setCoacheePersonality(""); setCoacheeType([]); setCoacheeField(""); setHours("1");
    setNcpClientCategory("");
    setTopic(""); setCoreIssues([]);
    setPreState({ ...DEFAULT_SCORES }); setPostState({ ...DEFAULT_SCORES });
    setTechniquesUsed([]); setTechniqueOther("");
    setClientInsight(""); setCoachPattern("");
    setGoals(""); setActionPlan(""); setNextSessionPractice("");
    setSummary(""); setReflection(""); setBestOfSession(""); setImprovementForNext("");
    setChangeKeywordsText(""); setMostEffectiveTechnique(""); setClientQuote("");
    setCoachOverallFeedback(""); setMcciDomain("");
    setFile(null); setExistingEvidenceId(undefined);
    setCurrentDraftId(undefined);
    setSubmitted(false);
  };

  const handleClose = () => {
    if (!isEdit) resetForm();
    onOpenChange(false);
  };

  const buildDraftPayload = useCallback(() => {
    const hoursNum = parseFloat(hours);
    const changeKeywords = changeKeywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 3);

    return {
      coachingDate: coachingDate || undefined,
      coachingStartTime: coachingStartTime || undefined,
      coachingEndTime: coachingEndTime || undefined,
      durationMinutes: !isNaN(hoursNum) && hoursNum > 0 ? Math.round(hoursNum * 60) : undefined,
      coachingType: coachingType || undefined,
      coachingPlace: (coachingPlace || undefined) as
        | "zoom" | "study_room" | "center" | "home" | "other" | "hanyang" | undefined,
      coachingPlaceOther: coachingPlace === "other" ? coachingPlaceOther || undefined : undefined,
      sessionNumber: sessionNumber || undefined,
      coacheeInfo: coacheeInfo.trim() || undefined,
      coacheeGender: (coacheeGender || undefined) as "male" | "female" | undefined,
      coacheeAge: coacheeAge ? parseInt(coacheeAge) : undefined,
      coacheePersonality: coacheePersonality.trim() || undefined,
      coacheeType: coacheeType.length > 0 ? coacheeType : undefined,
      ncpClientCategory: (ncpClientCategory || undefined) as "athlete" | "general" | undefined,
      coacheeField: coacheeField.trim() || undefined,
      topic: topic.trim() || undefined,
      coreIssues: coreIssues.length > 0 ? coreIssues : undefined,
      preCoachingState: preState,
      postCoachingState: postState,
      techniquesUsed: techniquesUsed.length > 0 ? techniquesUsed : undefined,
      techniqueOther: techniqueOther.trim() || undefined,
      clientInsight: clientInsight.trim() || undefined,
      coachPattern: coachPattern.trim() || undefined,
      goals: goals.trim() || undefined,
      actionPlan: actionPlan.trim() || undefined,
      nextSessionPractice: nextSessionPractice.trim() || undefined,
      summary: summary.trim() || undefined,
      reflection: reflection.trim() || undefined,
      bestOfSession: bestOfSession.trim() || undefined,
      improvementForNext: improvementForNext.trim() || undefined,
      changeKeywords: changeKeywords.length > 0 ? changeKeywords : undefined,
      mostEffectiveTechnique: mostEffectiveTechnique || undefined,
      clientQuote: clientQuote.trim() || undefined,
      coachOverallFeedback: coachOverallFeedback.trim() || undefined,
      mcciDomain: (mcciDomain || undefined) as
        | "motivation" | "skill" | "performance" | "relationship" | undefined,
    };
  }, [
    coachingDate, coachingStartTime, coachingEndTime, hours, coachingType, coachingPlace,
    coachingPlaceOther, sessionNumber, coacheeInfo, coacheeGender, coacheeAge,
    coacheePersonality, coacheeType, ncpClientCategory, coacheeField, topic, coreIssues, preState, postState,
    techniquesUsed, techniqueOther, clientInsight, coachPattern, goals, actionPlan,
    nextSessionPractice, summary, reflection, bestOfSession, improvementForNext,
    changeKeywordsText, mostEffectiveTechnique, clientQuote, coachOverallFeedback, mcciDomain,
  ]);

  const buildFullPayload = useCallback(() => {
    const hoursNum = parseFloat(hours);
    const changeKeywords = changeKeywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 3);

    return {
      coachingDate,
      coachingStartTime: coachingStartTime || undefined,
      coachingEndTime: coachingEndTime || undefined,
      durationMinutes: Math.round(hoursNum * 60),
      coachingType,
      coachingPlace: (coachingPlace || undefined) as
        | "zoom" | "study_room" | "center" | "home" | "other" | "hanyang" | undefined,
      coachingPlaceOther: coachingPlace === "other" ? coachingPlaceOther || undefined : undefined,
      sessionNumber: sessionNumber || undefined,
      coacheeInfo: coacheeInfo.trim(),
      coacheeGender: (coacheeGender || undefined) as "male" | "female" | undefined,
      coacheeAge: coacheeAge ? parseInt(coacheeAge) : undefined,
      coacheePersonality: coacheePersonality.trim() || undefined,
      coacheeType: coacheeType.length > 0 ? coacheeType : undefined,
      ncpClientCategory: (ncpClientCategory || undefined) as "athlete" | "general" | undefined,
      coacheeField: coacheeField.trim() || undefined,
      topic: topic.trim(),
      coreIssues: coreIssues.length > 0 ? coreIssues : undefined,
      preCoachingState: preState,
      postCoachingState: postState,
      techniquesUsed: techniquesUsed.length > 0 ? techniquesUsed : undefined,
      techniqueOther: techniqueOther.trim() || undefined,
      clientInsight: clientInsight.trim() || undefined,
      coachPattern: coachPattern.trim() || undefined,
      goals: goals.trim(),
      actionPlan: actionPlan.trim() || undefined,
      nextSessionPractice: nextSessionPractice.trim() || undefined,
      summary: summary.trim(),
      reflection: reflection.trim() || undefined,
      bestOfSession: bestOfSession.trim() || undefined,
      improvementForNext: improvementForNext.trim() || undefined,
      changeKeywords: changeKeywords.length > 0 ? changeKeywords : undefined,
      mostEffectiveTechnique: mostEffectiveTechnique || undefined,
      clientQuote: clientQuote.trim() || undefined,
      coachOverallFeedback: coachOverallFeedback.trim() || undefined,
      mcciDomain: (mcciDomain || undefined) as
        | "motivation" | "skill" | "performance" | "relationship" | undefined,
    };
  }, [
    coachingDate, coachingStartTime, coachingEndTime, hours, coachingType, coachingPlace,
    coachingPlaceOther, sessionNumber, coacheeInfo, coacheeGender, coacheeAge,
    coacheePersonality, coacheeType, ncpClientCategory, coacheeField, topic, coreIssues, preState, postState,
    techniquesUsed, techniqueOther, clientInsight, coachPattern, goals, actionPlan,
    nextSessionPractice, summary, reflection, bestOfSession, improvementForNext,
    changeKeywordsText, mostEffectiveTechnique, clientQuote, coachOverallFeedback, mcciDomain,
  ]);

  const uploadFileIfNeeded = async (): Promise<Id<"_storage"> | undefined> => {
    if (file) {
      const postUrl = await generateUploadUrl();
      const resp = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!resp.ok) throw new Error("파일 업로드에 실패했습니다.");
      const { storageId } = (await resp.json()) as { storageId: string };
      return storageId as Id<"_storage">;
    }
    return existingEvidenceId;
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const evidenceStorageId = await uploadFileIfNeeded();
      const payload = { ...buildDraftPayload(), evidenceStorageId };

      if (isDraft && editLog) {
        await saveDraft({ logId: editLog._id, ...payload });
        toast.success("임시저장되었습니다.");
      } else if (currentDraftId) {
        await saveDraft({ logId: currentDraftId, ...payload });
        toast.success("임시저장되었습니다.");
      } else {
        const newId = await saveDraft(payload);
        setCurrentDraftId(newId as Id<"coachingLogs">);
        toast.success("임시저장되었습니다. 언제든지 이어서 작성할 수 있습니다.");
      }
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("임시저장 중 오류가 발생했습니다.");
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!coachingDate || !coacheeInfo.trim() || !topic.trim() || !goals.trim() || !summary.trim()) {
      toast.error("필수 항목(날짜, 코치이명, 코칭 주제, 목표, 내용 요약)을 모두 입력해 주세요.");
      // Navigate to the step with the missing required field
      if (!coachingDate || !coacheeInfo.trim()) { setCurrentStep(1); return; }
      if (!topic.trim()) { setCurrentStep(2); return; }
      if (!goals.trim() || !summary.trim()) { setCurrentStep(5); return; }
      return;
    }
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum < 0.5) {
      toast.error("코칭 시간은 최소 0.5시간 이상 입력해 주세요.");
      setCurrentStep(1);
      return;
    }

    setIsPending(true);
    try {
      const evidenceStorageId = await uploadFileIfNeeded();
      const payload = { ...buildFullPayload(), evidenceStorageId };

      if (isDraft && editLog) {
        await submitDraft({ logId: editLog._id, ...payload });
        toast.success("승인 요청이 완료되었습니다.");
      } else if (currentDraftId) {
        await submitDraft({ logId: currentDraftId, ...payload });
        toast.success("승인 요청이 완료되었습니다.");
      } else if (isEdit && editLog) {
        await updateLog({ logId: editLog._id, ...payload });
        toast.success("코칭 기록이 수정되었습니다.");
      } else {
        await createLog(payload);
        toast.success("코칭 기록이 등록되었습니다. 승인 후 시간이 반영됩니다.");
      }

      handleClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("저장 중 오류가 발생했습니다.");
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const removeFile = () => {
    setFile(null);
    setExistingEvidenceId(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isNewOrDraft = !isEdit || isDraft || !!currentDraftId;
  const isLastStep = currentStep === STEPS.length;

  // Validate step 1 required fields before advancing
  const canAdvanceStep1 = coachingDate.length > 0 && coacheeInfo.trim().length > 0;
  const canAdvanceStep2 = topic.trim().length > 0;

  const handleNext = () => {
    if (currentStep === 1 && !canAdvanceStep1) {
      setSubmitted(true);
      toast.error("날짜와 코치이 이름은 필수 항목입니다.");
      return;
    }
    if (currentStep === 2 && !canAdvanceStep2) {
      setSubmitted(true);
      toast.error("코칭 주제를 입력해 주세요.");
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handlePrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // ── Step content rendering ─────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {/* 날짜 + 코칭 유형 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coachingDate">코칭 날짜 <span className="text-destructive">*</span></Label>
                <Input id="coachingDate" type="date" value={coachingDate}
                  onChange={(e) => setCoachingDate(e.target.value)}
                  className={submitted && !coachingDate ? "border-destructive" : ""} />
                {submitted && !coachingDate && <p className="text-xs text-destructive">날짜를 선택해 주세요.</p>}
              </div>
              <div className="space-y-1.5">
                <Label>코칭 유형 <span className="text-destructive">*</span></Label>
                <Select value={coachingType} onValueChange={(v) => setCoachingType(v as "individual" | "group")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COACHING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 시작/종료 시각 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coachingStartTime">코칭 시작 시각</Label>
                <Input id="coachingStartTime" type="time" value={coachingStartTime}
                  onChange={(e) => setCoachingStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coachingEndTime">코칭 종료 시각</Label>
                <Input id="coachingEndTime" type="time" value={coachingEndTime}
                  onChange={(e) => setCoachingEndTime(e.target.value)} />
              </div>
            </div>

            {/* 코칭 장소 + 회차 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>코칭 장소</Label>
                <Select value={coachingPlace} onValueChange={setCoachingPlace}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {COACHING_PLACES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {coachingPlace === "other" && (
                  <Input placeholder="직접 입력" value={coachingPlaceOther}
                    onChange={(e) => setCoachingPlaceOther(e.target.value)} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>회차</Label>
                <Select value={sessionNumber} onValueChange={setSessionNumber}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {SESSION_NUMBERS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 코치이 이름 + 코칭 시간 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coacheeInfo">코치이 이름 <span className="text-destructive">*</span></Label>
                <Input id="coacheeInfo" placeholder="예: 홍길동" value={coacheeInfo}
                  onChange={(e) => setCoacheeInfo(e.target.value)}
                  className={submitted && !coacheeInfo.trim() ? "border-destructive" : ""} />
                {submitted && !coacheeInfo.trim() && <p className="text-xs text-destructive">코치이 이름을 입력해 주세요.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hours">코칭 시간 (시간) <span className="text-destructive">*</span></Label>
                <Input id="hours" type="number" step="0.5" min="0.5" max="24"
                  placeholder="예: 1.5" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
            </div>

            {/* 코치이 성별 + 나이 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>코치이 성별</Label>
                <Select value={coacheeGender} onValueChange={setCoacheeGender}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">남자</SelectItem>
                    <SelectItem value="female">여자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coacheeAge">코치이 나이</Label>
                <Input id="coacheeAge" type="number" min="1" max="120"
                  placeholder="예: 28" value={coacheeAge}
                  onChange={(e) => setCoacheeAge(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coacheePersonality">고객 성격 특성</Label>
              <Input id="coacheePersonality" placeholder="예: 내향적, 완벽주의 성향"
                value={coacheePersonality} onChange={(e) => setCoacheePersonality(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>고객 유형</Label>
              <CheckboxGroup options={COACHEE_TYPES} selected={coacheeType}
                onToggle={toggleItem(coacheeType, setCoacheeType)} />
            </div>

            <div className="space-y-1.5">
              <Label>
                NCP 고객 분류{" "}
                <span className="text-xs text-muted-foreground font-normal">(선수 최소 5명 이상 필요)</span>
              </Label>
              <div className="flex gap-2">
                {(["athlete", "general"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNcpClientCategory(ncpClientCategory === cat ? "" : cat)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs border transition-colors cursor-pointer",
                      ncpClientCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {cat === "athlete" ? "스포츠선수" : "일반인"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coacheeField">종목/직군</Label>
              <Input id="coacheeField" placeholder="예: 태권도, IT직군"
                value={coacheeField} onChange={(e) => setCoacheeField(e.target.value)} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="topic">코칭 주제 <span className="text-destructive">*</span></Label>
              <Input id="topic" placeholder="예: 시합 불안, 진로 고민, 집중력 향상"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                className={submitted && !topic.trim() ? "border-destructive" : ""} />
              {submitted && !topic.trim() && <p className="text-xs text-destructive">코칭 주제를 입력해 주세요.</p>}
            </div>

            <div className="space-y-2">
              <Label>핵심 문제 <span className="text-xs text-muted-foreground font-normal">(복수선택)</span></Label>
              {Object.entries(CORE_ISSUES).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{group}</p>
                  <CheckboxGroup options={items} selected={coreIssues}
                    onToggle={toggleItem(coreIssues, setCoreIssues)} />
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground">
              각 항목 우측의 &quot;진단 안함&quot; 버튼으로 NA 처리할 수 있습니다. 진단하지 않은 항목은 통계에서 제외됩니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DiagnosisPanel label="코칭 전 상태" value={preState} onChange={setPreState} />
              <DiagnosisPanel label="코칭 후 상태" value={postState} onChange={setPostState} />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            {/* 사용 기법 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">사용 기법</h3>
              <div className="space-y-1.5">
                <Label>활용 기법 <span className="text-xs text-muted-foreground font-normal">(복수선택)</span></Label>
                <CheckboxGroup options={TECHNIQUES} selected={techniquesUsed}
                  onToggle={toggleItem(techniquesUsed, setTechniquesUsed)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="techniqueOther">기타 기법 (직접입력)</Label>
                <Input id="techniqueOther" placeholder="예: 마음챙김 호흡"
                  value={techniqueOther} onChange={(e) => setTechniqueOther(e.target.value)} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">핵심 발견</h3>
              <div className="space-y-1.5">
                <Label htmlFor="clientInsight">고객의 핵심 통찰</Label>
                <Textarea id="clientInsight" rows={2}
                  placeholder='예) "실패가 두려워 철봉을 잡지 않고 있었다."'
                  value={clientInsight} onChange={(e) => setClientInsight(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coachPattern">코치가 발견한 핵심 패턴</Label>
                <Textarea id="coachPattern" rows={2}
                  placeholder='예) "부상 공포가 실전 수행을 방해하고 있었다."'
                  value={coachPattern} onChange={(e) => setCoachPattern(e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            {/* 실행 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">실행</h3>
              <div className="space-y-1.5">
                <Label htmlFor="goals">코칭 목표 <span className="text-destructive">*</span></Label>
                <Input id="goals" placeholder="예: 팀원과의 갈등 해소 전략 수립"
                  value={goals} onChange={(e) => setGoals(e.target.value)}
                  className={submitted && !goals.trim() ? "border-destructive" : ""} />
                {submitted && !goals.trim() && <p className="text-xs text-destructive">코칭 목표를 입력해 주세요.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="actionPlan">고객의 실행계획</Label>
                <Textarea id="actionPlan" rows={2}
                  placeholder="세션 이후 고객이 실천할 행동 계획 (3줄 이내)"
                  value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nextSessionPractice">다음 회차까지 실천사항</Label>
                <Textarea id="nextSessionPractice" rows={2}
                  placeholder="다음 코칭 전까지 실천할 내용 (3줄 이내)"
                  value={nextSessionPractice} onChange={(e) => setNextSessionPractice(e.target.value)} />
              </div>
            </div>

            {/* 코치 성장 */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">코치 성장</h3>
              <div className="space-y-1.5">
                <Label htmlFor="summary">코칭 내용 요약 <span className="text-destructive">*</span></Label>
                <Textarea id="summary" rows={3}
                  placeholder="코칭 세션에서 다룬 내용과 결과를 요약해 주세요"
                  value={summary} onChange={(e) => setSummary(e.target.value)}
                  className={submitted && !summary.trim() ? "border-destructive" : ""} />
                {submitted && !summary.trim() && <p className="text-xs text-destructive">코칭 내용 요약을 입력해 주세요.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bestOfSession">이번 세션에서 가장 잘한 점</Label>
                <Textarea id="bestOfSession" rows={2} placeholder="(1~3줄)"
                  value={bestOfSession} onChange={(e) => setBestOfSession(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="improvementForNext">다음 세션에서 개선할 점</Label>
                <Textarea id="improvementForNext" rows={2} placeholder="(1~3줄)"
                  value={improvementForNext} onChange={(e) => setImprovementForNext(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="changeKeywords">변화 키워드 <span className="text-xs text-muted-foreground font-normal">(최대 3개, 쉼표 구분)</span></Label>
                <Input id="changeKeywords" placeholder="예: 알아차림, 자신감, 루틴"
                  value={changeKeywordsText} onChange={(e) => setChangeKeywordsText(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>가장 효과적이었던 개입 <span className="text-xs text-muted-foreground font-normal">(1개)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {[...TECHNIQUES, "기타"].map((t) => (
                    <button key={t} type="button"
                      onClick={() => setMostEffectiveTechnique(mostEffectiveTechnique === t ? "" : t)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer",
                        mostEffectiveTechnique === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientQuote">고객의 대표 한마디</Label>
                <Input id="clientQuote" placeholder='예) "안개가 걷히는 느낌이었어요."'
                  value={clientQuote} onChange={(e) => setClientQuote(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coachOverallFeedback">코치 전체 소감</Label>
                <Textarea id="coachOverallFeedback" rows={2}
                  value={coachOverallFeedback} onChange={(e) => setCoachOverallFeedback(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reflection">성찰 및 느낀점</Label>
                <Textarea id="reflection" rows={2}
                  placeholder="코칭을 마치고 느낀 점, 개선할 부분 등을 작성해 주세요"
                  value={reflection} onChange={(e) => setReflection(e.target.value)} />
              </div>

              {/* MCCI 4대 영역 */}
              <div className="space-y-1.5">
                <Label>MCCI 4대 영역 분류 <span className="text-xs text-muted-foreground font-normal">(주 문제)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {MCCI_DOMAINS.map((d) => (
                    <button key={d.value} type="button"
                      onClick={() => setMcciDomain(mcciDomain === d.value ? "" : d.value)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs border transition-colors cursor-pointer",
                        mcciDomain === d.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 증빙 자료 */}
            <div className="border-t pt-4 space-y-2">
              <Label>증빙 자료 <span className="text-xs text-muted-foreground font-normal">(선택)</span></Label>
              {file ?? existingEvidenceId ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm">
                  <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate text-muted-foreground">
                    {file ? file.name : "기존 첨부 파일"}
                  </span>
                  <button type="button" onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange} className="hidden" id="evidence-file" />
                  <label htmlFor="evidence-file"
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">
                    <Paperclip className="w-4 h-4" />
                    PDF, JPG, PNG 파일 첨부
                  </label>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitle = STEPS.find((s) => s.id === currentStep)?.title ?? "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full max-h-[92dvh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle>
              {isDraft ? "임시저장 기록 이어 작성" : isEdit ? "코칭 기록 수정" : "코칭 실습 기록 추가"}
            </DialogTitle>
            {(isDraft || currentDraftId) && (
              <Badge variant="secondary" className="text-xs font-normal">
                임시저장됨
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            * 표시는 제출 시 필수 항목입니다. 임시저장은 언제든 가능합니다.
          </p>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex-shrink-0 pt-1 pb-2">
          <StepIndicator currentStep={currentStep} />
          <p className="text-sm font-semibold text-foreground">
            {currentStep}단계: {stepTitle}
          </p>
        </div>

        {/* Scrollable step content */}
        <div className="flex-1 overflow-y-auto py-1 pr-1">
          {renderStep()}
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 pt-3 border-t">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" onClick={handleClose} disabled={isPending || isSavingDraft}>
              취소
            </Button>
            {currentStep > 1 && (
              <Button variant="ghost" onClick={handlePrev} disabled={isPending || isSavingDraft}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            {/* 임시저장 - new/draft records only */}
            {isNewOrDraft && (
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={isPending || isSavingDraft}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingDraft ? "저장 중..." : "임시저장"}
              </Button>
            )}

            {!isLastStep ? (
              <Button onClick={handleNext} disabled={isPending || isSavingDraft}>
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isPending || isSavingDraft}>
                <Send className="w-4 h-4 mr-2" />
                {isPending ? "제출 중..." : isDraft || currentDraftId ? "승인 요청" : isEdit ? "수정 완료" : "제출"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
