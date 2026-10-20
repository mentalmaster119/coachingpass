import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  CalendarDays,
  Pencil,
  Trash2,
  GraduationCap,
  Wand2,
  BookOpen,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  UserPlus,
  X,
  Save,
  RefreshCw,
  Copy,
  FileDown,
  ExternalLink,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  EDUCATION_CATEGORIES,
  getMergedCurriculum,
  resolveCohortCategory,
  resolveSeminarCategory,
  type EducationCategoryKey,
  type CourseDefinition,
} from "@/lib/curriculum.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

type SeminarType = "two_day" | "one_day" | "group_coaching";
type Cohort = Doc<"cohorts">;
type Seminar = Doc<"seminars">;

const SEMINAR_TYPE_LABELS: Record<SeminarType, string> = {
  two_day: "2일 세미나",
  one_day: "교재학습",
  group_coaching: "그룹코칭",
};

const SEMINAR_TYPE_COLORS: Record<SeminarType, string> = {
  two_day: "default",
  one_day: "secondary",
  group_coaching: "outline",
};

type CourseInfo = {
  key: string;
  name: string;
  fullName: string;
  description: string;
  creditHours: number;
  pdfUrl?: string;
  landingPageUrl?: string;
};

const DEFAULT_COURSES: CourseInfo[] = [
  {
    key: "expert_mcci",
    name: "전문가과정",
    fullName: "전문가과정 (MCCI 스포츠멘탈코칭 전문가과정)",
    description: "한국스포츠멘탈코칭협회(MCCI) 정규 전문가 자격 취득 과정으로, 기수별 온/오프라인 6회차 세미나와 실습 및 코칭 수련이 진행됩니다.",
    creditHours: 60,
  },
  {
    key: "kac_basic",
    name: "KAC기본과정",
    fullName: "KAC기본과정",
    description: "한국코치협회 인증 KAC 자격 취득을 위한 기초 코칭 역량 및 이론 실습 교육과정입니다.",
    creditHours: 20,
  },
  {
    key: "kpc_advanced",
    name: "KPC심화과정",
    fullName: "KPC심화과정",
    description: "전문 코치로서의 역량 심화 및 KPC 단계 도약을 위한 전문 코칭 심화 교육과정입니다.",
    creditHours: 60,
  },
  {
    key: "kpc_dev",
    name: "KPC개발과정",
    fullName: "KPC개발과정",
    description: "KPC 전문성 개발 및 실제 코칭 세션 코칭 역량 심화 실습 과정입니다.",
    creditHours: 40,
  },
  {
    key: "mspe_meditation",
    name: "MSPE명상기본과정",
    fullName: "MSPE명상기본과정",
    description: "스포츠 선수의 몰입과 감정 조절, 심리적 안정감을 위한 마인드풀니스(MSPE) 기반 명상 기초 과정입니다.",
    creditHours: 16,
  },
  {
    key: "psychology_basic",
    name: "스포츠심리학강독기본과정",
    fullName: "스포츠심리학강독기본과정",
    description: "스포츠 심리학 핵심 이론 강독 및 멘탈코칭 현장 적용 기초 과정입니다.",
    creditHours: 15,
  },
  {
    key: "psychology_adv",
    name: "스포츠심리학강독심화과정",
    fullName: "스포츠심리학강독심화과정",
    description: "최신 스포츠 심리학 연구 분석 및 엘리트 선수 케이스 스터디 심화 과정입니다.",
    creditHours: 15,
  },
  {
    key: "supervisor_training",
    name: "멘탈코칭수퍼바이저양성과정",
    fullName: "멘탈코칭수퍼바이저양성과정",
    description: "상위 코치 및 수퍼바이저로서 코칭 피드백과 지도를 수행할 수 있는 역량을 양성하는 최고위 과정입니다.",
    creditHours: 30,
  },
];

const COMMON_COURSE_OPTIONS = [
  "KAC기본과정",
  "KPC심화과정",
  "KPC개발과정",
  "MSPE명상기본과정",
  "스포츠심리학강독기본과정",
  "스포츠심리학강독심화과정",
  "멘탈코칭수퍼바이저양성과정",
  "기타(직접입력)",
];

function seminarTypeIcon(type: SeminarType) {
  if (type === "two_day") return <BookOpen className="w-3.5 h-3.5" />;
  if (type === "one_day") return <FileText className="w-3.5 h-3.5" />;
  return <Users className="w-3.5 h-3.5" />;
}

type SeminarFormData = {
  title: string;
  sessionNumber: string;
  seminarType: SeminarType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  isOnline: boolean;
};

const defaultForm: SeminarFormData = {
  title: "",
  sessionNumber: "",
  seminarType: "two_day",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  location: "MCCI 양재 센터",
  description: "",
  isOnline: false,
};

// Generate time options: 08:00 ~ 24:00, 10-min intervals
const TIME_OPTIONS: string[] = [];
for (let h = 8; h <= 24; h++) {
  for (let m = 0; m < 60; m += 10) {
    if (h === 24 && m > 0) break;
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

type SeminarTemplate = {
  title: string;
  sessionNumber: number;
  seminarType: SeminarType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  isOnline?: boolean;
};

function generateScheduleTemplate(cohort: Cohort): SeminarTemplate[] {
  const start = parseISO(cohort.startDate);
  const year = start.getFullYear();
  const startMonth = start.getMonth();
  const sessions: SeminarTemplate[] = [];
  let sessionNum = 1;

  for (let i = 0; i < 6; i++) {
    const month = startMonth + i;
    const actualYear = year + Math.floor(month / 12);
    const actualMonth = month % 12;
    const firstDay = new Date(actualYear, actualMonth, 1);
    const dayOfWeek = firstDay.getDay();
    const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek);
    const satDate = new Date(actualYear, actualMonth, 1 + daysUntilSat + 7);
    const satStr = `${actualYear}-${String(actualMonth + 1).padStart(2, "0")}-${String(satDate.getDate()).padStart(2, "0")}`;
    const sunDate = new Date(satDate);
    sunDate.setDate(sunDate.getDate() + 1);
    const sunStr = `${actualYear}-${String(actualMonth + 1).padStart(2, "0")}-${String(sunDate.getDate()).padStart(2, "0")}`;
    sessions.push({
      title: `${sessionNum}차 세미나`,
      sessionNumber: sessionNum,
      seminarType: "two_day",
      startDate: satStr,
      endDate: sunStr,
      startTime: "09:00",
      endTime: "17:00",
    });
    sessionNum++;
  }

  const textbookMonth = startMonth + 3;
  const textbookYear = year + Math.floor(textbookMonth / 12);
  const tbMonth = textbookMonth % 12;
  const tbStr = `${textbookYear}-${String(tbMonth + 1).padStart(2, "0")}-15`;
  sessions.push({
    title: "교재학습 세미나",
    sessionNumber: sessionNum++,
    seminarType: "one_day",
    startDate: tbStr,
    endDate: tbStr,
    startTime: "09:00",
    endTime: "17:00",
    isOnline: false,
  });

  const gcMonth = startMonth + 4;
  const gcYear = year + Math.floor(gcMonth / 12);
  const gcM = gcMonth % 12;
  const gcStr = `${gcYear}-${String(gcM + 1).padStart(2, "0")}-22`;
  sessions.push({
    title: "그룹코칭 (사례나눔)",
    sessionNumber: sessionNum++,
    seminarType: "group_coaching",
    startDate: gcStr,
    endDate: gcStr,
    startTime: "10:00",
    endTime: "17:00",
  });

  return sessions;
}

export default function AdminSeminarsPage() {
  const cohorts = useQuery(api.cohorts.list, {});
  const createSeminar = useMutation(api.seminars.create);
  const updateSeminar = useMutation(api.seminars.update);
  const removeSeminar = useMutation(api.seminars.remove);
  const bulkCreate = useMutation(api.seminars.bulkCreate);
  const copySeminars = useMutation(api.seminars.copySeminarsFromCohort);
  const createCohort = useMutation(api.cohorts.create);

  const courseCredits = useQuery(api.smpcc.listCourseCredits);
  const upsertCourseCredit = useMutation(api.smpcc.upsertCourseCredit);

  const allSeminars = useQuery(api.seminars.listAll);

  // 3-tier Curriculum selection state
  const [selectedCategory, setSelectedCategory] = useState<EducationCategoryKey | "all">("expert");
  const [selectedCourseKey, setSelectedCourseKey] = useState<string>("expert");
  const [selectedCohortId, setSelectedCohortId] = useState<Id<"cohorts"> | "all" | null>(null);

  const activeCohort = useMemo(() => {
    return (
      cohorts?.find(
        (c) => resolveCohortCategory(c).category === "expert" && c.status === "active"
      ) ??
      cohorts?.find((c) => resolveCohortCategory(c).category === "expert") ??
      cohorts?.[0]
    );
  }, [cohorts]);

  const categories = useMemo(() => getMergedCurriculum(courseCredits), [courseCredits]);

  const currentCategoryDef = useMemo(() => {
    if (selectedCategory === "all") return null;
    return categories.find((c) => c.key === selectedCategory) ?? null;
  }, [categories, selectedCategory]);

  const currentCourseDef = useMemo(() => {
    if (!currentCategoryDef) return null;
    return (
      currentCategoryDef.courses.find((c) => c.key === selectedCourseKey) ??
      currentCategoryDef.courses[0] ??
      null
    );
  }, [currentCategoryDef, selectedCourseKey]);

  const availableCohorts = useMemo(() => {
    if (!cohorts) return [];
    if (selectedCategory === "all") return cohorts;
    return cohorts.filter((c) => {
      const res = resolveCohortCategory(c);
      if (res.category !== selectedCategory) return false;
      if (selectedCategory === "expert") return true;
      if (selectedCourseKey) return res.courseKey === selectedCourseKey;
      return true;
    });
  }, [cohorts, selectedCategory, selectedCourseKey]);

  const effectiveCohortId = useMemo(() => {
    if (selectedCohortId === "all") return "all";
    if (selectedCohortId) return selectedCohortId;
    if (selectedCategory === "expert") {
      return activeCohort?._id ?? availableCohorts[0]?._id ?? "all";
    }
    return availableCohorts[0]?._id ?? "all";
  }, [selectedCohortId, selectedCategory, activeCohort, availableCohorts]);

  const handleCategoryChange = (catKey: EducationCategoryKey | "all") => {
    setSelectedCategory(catKey);
    if (catKey === "all") {
      setSelectedCourseKey("");
      setSelectedCohortId("all");
    } else {
      const catDef = categories.find((c) => c.key === catKey);
      const defaultCourse = catDef?.courses[0]?.key ?? "";
      setSelectedCourseKey(defaultCourse);

      if (catKey === "expert") {
        setSelectedCohortId(activeCohort?._id ?? "all");
      } else {
        const matchingCohort = (cohorts ?? []).find((c) => {
          const res = resolveCohortCategory(c);
          return res.category === catKey && res.courseKey === defaultCourse;
        });
        setSelectedCohortId(matchingCohort ? matchingCohort._id : "all");
      }
    }
  };

  const handleCourseChange = (courseKey: string) => {
    setSelectedCourseKey(courseKey);
    const matchingCohort = (cohorts ?? []).find((c) => {
      const res = resolveCohortCategory(c);
      return res.category === selectedCategory && res.courseKey === courseKey;
    });
    setSelectedCohortId(matchingCohort ? matchingCohort._id : "all");
  };

  const displayedSeminars = useMemo(() => {
    if (!allSeminars) return undefined;
    const cohortsMap = new Map((cohorts ?? []).map((c) => [c._id, c]));

    if (selectedCategory === "all") {
      return [...allSeminars].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }

    const filtered = allSeminars.filter((s) => {
      const semCat = resolveSeminarCategory(s, cohortsMap);
      if (semCat.category !== selectedCategory) return false;
      if (selectedCourseKey && semCat.courseKey !== selectedCourseKey) return false;

      if (effectiveCohortId && effectiveCohortId !== "all") {
        return s.cohortId === effectiveCohortId;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const aCohort = a.cohortId ? cohortsMap.get(a.cohortId) : null;
      const bCohort = b.cohortId ? cohortsMap.get(b.cohortId) : null;
      const aNum = aCohort ? aCohort.number : 0;
      const bNum = bCohort ? bCohort.number : 0;
      if (aNum !== bNum) return bNum - aNum;
      if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
      return a.startDate.localeCompare(b.startDate);
    });
  }, [allSeminars, cohorts, selectedCategory, selectedCourseKey, effectiveCohortId]);

  const seminars = displayedSeminars;
  const cohortsMap = useMemo(() => new Map((cohorts ?? []).map((c) => [c._id, c])), [cohorts]);

  // Course def modal state (for registration & editing)
  const [showCourseDefForm, setShowCourseDefForm] = useState(false);
  const [isEditingCourseDef, setIsEditingCourseDef] = useState(false);
  const [courseDefKey, setCourseDefKey] = useState("");
  const [courseDefName, setCourseDefName] = useState("");
  const [courseDefHours, setCourseDefHours] = useState("");
  const [courseDefDesc, setCourseDefDesc] = useState("");
  const [courseDefPdfUrl, setCourseDefPdfUrl] = useState("");
  const [courseDefLandingUrl, setCourseDefLandingUrl] = useState("");
  const [courseDefCategory, setCourseDefCategory] = useState<EducationCategoryKey>("common");
  const [savingCourseDef, setSavingCourseDef] = useState(false);

  const handleSaveCourseDef = async () => {
    if (!courseDefName.trim()) {
      toast.error("과정명을 입력하세요.");
      return;
    }
    setSavingCourseDef(true);
    try {
      const key = courseDefKey.trim() || ("course_" + Date.now());
      await upsertCourseCredit({
        courseKey: key,
        courseName: courseDefName.trim(),
        creditHours: Number(courseDefHours) || 0,
        description: courseDefDesc.trim() || undefined,
        pdfUrl: courseDefPdfUrl.trim() || undefined,
        landingPageUrl: courseDefLandingUrl.trim() || undefined,
        educationCategory: courseDefCategory,
        isLongTerm: courseDefCategory === "expert",
      });
      toast.success(
        isEditingCourseDef
          ? "과정 정보가 성공적으로 수정되었습니다."
          : "교육과정이 성공적으로 등록되었습니다."
      );
      setSelectedCategory(courseDefCategory);
      setSelectedCourseKey(key);
      setShowCourseDefForm(false);
    } catch (err) {
      console.error(err);
      toast.error("과정 정보 저장에 실패했습니다.");
    } finally {
      setSavingCourseDef(false);
    }
  };

  const courseOptions = useMemo(() => {
    let courses: string[] = [];
    if (selectedCategory === "common") {
      courses = categories.find((c) => c.key === "common")?.courses.map((c) => c.name) ?? [];
    } else if (selectedCategory === "kca") {
      courses = categories.find((c) => c.key === "kca")?.courses.map((c) => c.name) ?? [];
    } else {
      courses = categories.flatMap((cat) => cat.courses.map((c) => c.name));
    }
    const dbCourseNames = (courseCredits ?? []).map((c) => c.courseName);
    const combined = Array.from(
      new Set([...courses, ...dbCourseNames, ...COMMON_COURSE_OPTIONS.filter((o) => o !== "기타(직접입력)")])
    );
    return [...combined, "기타(직접입력)"];
  }, [categories, selectedCategory, courseCredits]);

  const openEditCourseDef = (course: CourseInfo | CourseDefinition) => {
    setIsEditingCourseDef(true);
    setCourseDefKey(course.key);
    setCourseDefName(course.name);
    setCourseDefHours(course.creditHours > 0 ? String(course.creditHours) : "");
    setCourseDefDesc(course.description || "");
    setCourseDefPdfUrl(course.pdfUrl || "");
    setCourseDefLandingUrl(course.landingPageUrl || "");
    if ("educationCategory" in course && course.educationCategory) {
      setCourseDefCategory(course.educationCategory as EducationCategoryKey);
    } else if (selectedCategory !== "all") {
      setCourseDefCategory(selectedCategory);
    }
    setShowCourseDefForm(true);
  };

  const openCreateCourseDef = () => {
    setIsEditingCourseDef(false);
    setCourseDefKey("");
    setCourseDefName("");
    setCourseDefHours("");
    setCourseDefDesc("");
    setCourseDefPdfUrl("");
    setCourseDefLandingUrl("");
    setCourseDefCategory(selectedCategory !== "all" ? selectedCategory : "common");
    setShowCourseDefForm(true);
  };

  const [formCohortId, setFormCohortId] = useState<Id<"cohorts"> | "">("");

  const [showForm, setShowForm] = useState(false);
  const [editingSeminar, setEditingSeminar] = useState<Seminar | null>(null);
  const [form, setForm] = useState<SeminarFormData>(defaultForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SeminarFormData, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Id<"seminars"> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedSeminar, setExpandedSeminar] = useState<Id<"seminars"> | null>(null);
  const [groupManageSeminarId, setGroupManageSeminarId] = useState<Id<"seminars"> | null>(null);

  const [commonCourseSelect, setCommonCourseSelect] = useState<string>("");
  const [customCourseTitle, setCustomCourseTitle] = useState<string>("");

  // Copy cohort state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySourceId, setCopySourceId] = useState<Id<"cohorts"> | "">("");
  const [copyNewStart, setCopyNewStart] = useState("");
  const [copying, setCopying] = useState(false);
  // Which seminar types to copy: "all" or specific types
  type CopyMode = "all" | "two_day" | "one_day" | "group_coaching";
  const [copyModes, setCopyModes] = useState<CopyMode[]>(["all"]);

  // Create cohort state
  const [showCohortForm, setShowCohortForm] = useState(false);
  const [cohortForm, setCohortForm] = useState({
    name: "",
    number: "",
    term: "first" as "first" | "second",
    status: "active" as "upcoming" | "active" | "completed",
    startDate: "",
    endDate: "",
    description: "",
    educationCategory: "expert" as EducationCategoryKey,
    courseCode: "expert",
  });
  const [cohortSaving, setCohortSaving] = useState(false);

  const openCreateCohort = () => {
    const cat = selectedCategory !== "all" ? selectedCategory : "expert";
    const catDef = categories.find((c) => c.key === cat);
    const crs = selectedCourseKey || catDef?.courses[0]?.key || "expert";
    setCohortForm({
      name: "",
      number: "",
      term: "first",
      status: "active",
      startDate: "",
      endDate: "",
      description: "",
      educationCategory: cat,
      courseCode: crs,
    });
    setShowCohortForm(true);
  };

  const handleSaveCohort = async () => {
    if (!cohortForm.name.trim()) {
      toast.error("과정(기수)명을 입력하세요");
      return;
    }
    if (!cohortForm.number.trim()) {
      toast.error("과정(기수) 번호를 입력하세요");
      return;
    }
    if (!cohortForm.startDate) {
      toast.error("시작일을 선택하세요");
      return;
    }
    if (!cohortForm.endDate) {
      toast.error("종료일을 선택하세요");
      return;
    }

    setCohortSaving(true);
    try {
      const newCohortId = await createCohort({
        name: cohortForm.name,
        number: Number(cohortForm.number),
        term: cohortForm.term,
        status: cohortForm.status,
        startDate: cohortForm.startDate,
        endDate: cohortForm.endDate,
        description: cohortForm.description || undefined,
        educationCategory: cohortForm.educationCategory,
        courseCode: cohortForm.courseCode || undefined,
        isLongTerm: cohortForm.educationCategory === "expert",
      });
      toast.success("새 과정(기수)이 등록되었습니다");
      setSelectedCategory(cohortForm.educationCategory);
      if (cohortForm.courseCode) {
        setSelectedCourseKey(cohortForm.courseCode);
      }
      setSelectedCohortId(newCohortId);
      setShowCohortForm(false);
      setCohortForm({
        name: "",
        number: "",
        term: "first",
        status: "active",
        startDate: "",
        endDate: "",
        description: "",
        educationCategory: "expert",
        courseCode: "expert",
      });
    } catch (err) {
      console.error(err);
      toast.error("과정 등록에 실패했습니다");
    } finally {
      setCohortSaving(false);
    }
  };

  const selectedCohort = cohorts?.find(
    (c) => c._id === (selectedCategory === "expert" && effectiveCohortId !== "all" ? effectiveCohortId : null)
  );

  const handleCommonCourseChange = (val: string) => {
    setCommonCourseSelect(val);
    if (val !== "기타(직접입력)") {
      setForm((prev) => ({ ...prev, title: val }));
      setFormErrors((prev) => ({ ...prev, title: false }));
    } else {
      setForm((prev) => ({ ...prev, title: customCourseTitle }));
    }
  };

  const handleCustomTitleChange = (val: string) => {
    setCustomCourseTitle(val);
    setForm((prev) => ({ ...prev, title: val }));
    if (val) {
      setFormErrors((prev) => ({ ...prev, title: false }));
    }
  };

  const openCreate = () => {
    setEditingSeminar(null);
    setFormErrors({});
    if (selectedCategory === "expert") {
      const defaultCId = effectiveCohortId !== "all" && effectiveCohortId ? effectiveCohortId : (activeCohort?._id ?? "");
      setFormCohortId(defaultCId);
      setCommonCourseSelect("");
      setCustomCourseTitle("");
      setForm({
        ...defaultForm,
        title: "1차 세미나",
        sessionNumber: "1",
      });
    } else if (selectedCategory === "all") {
      setFormCohortId("");
      setCommonCourseSelect(courseOptions[0] || "공통");
      setForm({
        ...defaultForm,
        title: courseOptions[0] || "공통",
        sessionNumber: "1",
      });
      setCustomCourseTitle("");
    } else {
      const courseName = currentCourseDef?.name || "세미나";
      const defaultCId = effectiveCohortId !== "all" && effectiveCohortId ? effectiveCohortId : "";
      setFormCohortId(defaultCId);
      setCommonCourseSelect(courseName);
      setForm({
        ...defaultForm,
        title: courseName,
        sessionNumber: "1",
      });
      setCustomCourseTitle("");
    }
    setShowForm(true);
  };

  const openEdit = (s: Seminar) => {
    setEditingSeminar(s);
    setFormErrors({});
    setForm({
      title: s.title,
      sessionNumber: String(s.sessionNumber),
      seminarType: s.seminarType,
      startDate: s.startDate,
      endDate: s.endDate,
      startTime: s.startTime ?? "",
      endTime: s.endTime ?? "",
      location: s.location ?? "",
      description: s.description ?? "",
      isOnline: s.isOnline ?? false,
    });
    if (s.cohortId) {
      setFormCohortId(s.cohortId);
      setCommonCourseSelect("");
      setCustomCourseTitle("");
    } else {
      setFormCohortId("");
      const isPredefined = courseOptions.slice(0, -1).includes(s.title);
      if (isPredefined) {
        setCommonCourseSelect(s.title);
        setCustomCourseTitle("");
      } else {
        setCommonCourseSelect("기타(직접입력)");
        setCustomCourseTitle(s.title);
      }
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    const errors: Partial<Record<keyof SeminarFormData, boolean>> = {};
    if (!form.title) errors.title = true;
    if (!form.startDate) errors.startDate = true;
    if (!form.endDate) errors.endDate = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("필수 항목을 입력해 주세요");
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        sessionNumber: Number(form.sessionNumber) || 1,
        seminarType: form.seminarType,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        isOnline: form.seminarType === "one_day" ? form.isOnline : undefined,
        educationCategory: selectedCategory !== "all" ? selectedCategory : undefined,
        courseCode: selectedCourseKey || undefined,
      };
      if (editingSeminar) {
        await updateSeminar({ seminarId: editingSeminar._id, ...payload });
        toast.success("세미나가 수정되었습니다");
      } else {
        const targetCohortId: Id<"cohorts"> | undefined = formCohortId
          ? (formCohortId as Id<"cohorts">)
          : effectiveCohortId !== "all" && effectiveCohortId
          ? effectiveCohortId
          : undefined;
        await createSeminar({ cohortId: targetCohortId, ...payload });
        toast.success("세미나가 추가되었습니다");
      }
      setShowForm(false);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeSeminar({ seminarId: deleteTarget });
      toast.success("세미나가 삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedCohort) return;
    setGenerating(true);
    try {
      const template = generateScheduleTemplate(selectedCohort);
      await bulkCreate({ cohortId: selectedCohort._id, seminars: template });
      toast.success(`${template.length}개의 세미나 일정이 자동 생성되었습니다`);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("자동 생성에 실패했습니다");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCopySeminars = async () => {
    const targetCohortId = (effectiveCohortId !== "all" && effectiveCohortId ? effectiveCohortId : null) ?? (selectedCohortId !== "all" ? selectedCohortId : null);
    if (!copySourceId || !copyNewStart || !targetCohortId) return;
    const sourceCohort = cohorts?.find((c) => c._id === copySourceId);
    if (!sourceCohort) return;
    const dayOffset = differenceInDays(parseISO(copyNewStart), parseISO(sourceCohort.startDate));
    // Resolve seminar types to pass
    const isAll = copyModes.includes("all");
    const seminarTypes = isAll
      ? undefined
      : (copyModes.filter((m) => m !== "all") as ("two_day" | "one_day" | "group_coaching")[]);
    setCopying(true);
    try {
      const count = await copySeminars({
        sourceCohortId: copySourceId,
        targetCohortId: targetCohortId,
        dayOffset,
        seminarTypes,
      });
      toast.success(`${count}개의 세미나 일정이 복사되었습니다`);
      setShowCopyDialog(false);
      setCopySourceId("");
      setCopyNewStart("");
      setCopyModes(["all"]);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("복사에 실패했습니다");
      }
    } finally {
      setCopying(false);
    }
  };

  const groupManageSeminar = allSeminars?.find((s) => s._id === groupManageSeminarId) ?? null;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">세미나 일정 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">기수별 세미나 일정을 등록하고 관리합니다</p>
        </div>
      </div>

      {/* 3-tier Curriculum Selector Card */}
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              교육과정 및 기수 선택
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium border-dashed cursor-pointer gap-1.5 hover:border-primary hover:text-primary"
                onClick={openCreateCourseDef}
              >
                <Plus className="w-3.5 h-3.5" />
                교육과정 등록
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Tier 1: 교육 분류 (Education Category) */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>1단계 · 교육 분류</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoryChange(cat.key)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer flex items-center gap-2",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-foreground hover:bg-muted/80"
                    )}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {cat.badge}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleCategoryChange("all")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer",
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:bg-muted/80"
                )}
              >
                전체 / 공통
              </button>
            </div>
          </div>

          {/* Tier 2: 과정 선택 */}
          {selectedCategory !== "all" && currentCategoryDef && (
            <div className="p-3 bg-muted/20 rounded-lg border border-border/60 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  <span>2단계 · 과정 선택</span>
                  <span className="text-muted-foreground font-normal">
                    ({currentCategoryDef.name} 하위 {currentCategoryDef.courses.length}개 과정)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-primary hover:text-primary gap-1 cursor-pointer"
                  onClick={openCreateCourseDef}
                >
                  <Plus className="w-3 h-3" />
                  새 과정 추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentCategoryDef.courses.map((course) => {
                  const isSelected = selectedCourseKey === course.key;
                  return (
                    <button
                      key={course.key}
                      type="button"
                      onClick={() => handleCourseChange(course.key)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      <span>{course.name}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full",
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {course.badgeLabel ?? (course.creditHours > 0 ? `${course.creditHours}시간` : "단기")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tier 3: 기수 선택 (Cohort) */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border/60 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1 text-foreground font-semibold">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                {selectedCategory === "expert"
                  ? "3단계 · 전문가과정 기수 선택"
                  : selectedCategory === "common"
                  ? `3단계 · ${currentCourseDef?.name ?? "멘탈공통"} 기수 및 일정 선택`
                  : selectedCategory === "kca"
                  ? `3단계 · ${currentCourseDef?.name ?? "KCA"} 기수 및 일정 선택`
                  : "3단계 · 기수 선택"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-primary hover:text-primary gap-1 cursor-pointer"
                onClick={openCreateCohort}
              >
                <Plus className="w-3.5 h-3.5" />
                새 기수 등록
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setSelectedCohortId("all")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                  effectiveCohortId === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                )}
              >
                {selectedCategory === "expert" ? "전체 기수 (통합)" : "전체 일정/세미나"}
              </button>
              {availableCohorts.map((c) => {
                const isSelected = effectiveCohortId === c._id;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setSelectedCohortId(c._id)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="text-[11px] opacity-75">
                      {c.term === "first" ? "상반기" : "하반기"}
                    </span>
                    {c.status === "active" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Course Overview Banner & PDF / Landing Page Buttons */}
          {selectedCategory !== "all" && currentCourseDef && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base text-foreground">
                    {currentCourseDef.fullName || currentCourseDef.name}
                  </h3>
                  {currentCourseDef.creditHours > 0 && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/15 border-0">
                      <Award className="w-3 h-3 mr-1 inline" />
                      인정 {currentCourseDef.creditHours}시간
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[11px]">
                    {currentCourseDef.isLongTerm ? "장기 정규과정" : "단기 과정"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentCourseDef.description || "등록된 과정 소개 내용이 없습니다."}
                </p>
              </div>

              {/* Action buttons: PDF, Landing Page, Edit */}
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                {currentCourseDef.pdfUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium border-red-200 text-red-700 bg-red-50/50 hover:bg-red-100/70 dark:border-red-900/60 dark:text-red-400 dark:bg-red-950/30 gap-1.5 shadow-sm cursor-pointer"
                    onClick={() => window.open(currentCourseDef.pdfUrl, "_blank", "noopener,noreferrer")}
                  >
                    <FileDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    안내 PDF 다운로드
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-normal text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                    onClick={() => openEditCourseDef(currentCourseDef as any)}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    + PDF 링크 등록
                  </Button>
                )}

                {currentCourseDef.landingPageUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 dark:border-blue-900/60 dark:text-blue-400 dark:bg-blue-950/30 gap-1.5 shadow-sm cursor-pointer"
                    onClick={() => window.open(currentCourseDef.landingPageUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    랜딩페이지 바로가기
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-normal text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                    onClick={() => openEditCourseDef(currentCourseDef as any)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    + 랜딩페이지 등록
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 cursor-pointer"
                  onClick={() => openEditCourseDef(currentCourseDef as any)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  과정 정보 수정
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {cohorts !== undefined && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {selectedCategory === "all"
                  ? "전체 세미나 일정"
                  : selectedCategory === "expert"
                    ? effectiveCohortId === "all"
                      ? "전문가과정 (전체 기수) 일정"
                      : `${selectedCohort?.name ?? ""} (${selectedCohort?.term === "first" ? "상반기" : "하반기"}) 세미나 일정`
                    : `${currentCourseDef?.name ?? "과정"} 세미나 일정`}
              </h2>
              {seminars && <Badge variant="secondary" className="ml-1">{seminars.length}개</Badge>}
            </div>

            <div className="flex gap-2 flex-wrap">
              {selectedCategory === "expert" && effectiveCohortId !== "all" && selectedCohort && (
                <>
                  {seminars !== undefined && seminars.length === 0 && (
                    <Button
                      variant="ghost"
                      onClick={handleAutoGenerate}
                      disabled={generating}
                      className="gap-2 cursor-pointer"
                    >
                      <Wand2 className="w-4 h-4" />
                      {generating ? "생성 중..." : "자동 일정 생성"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setShowCopyDialog(true)}
                    className="gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    이전 기수 복사
                  </Button>
                </>
              )}
              <Button onClick={openCreate} className="gap-2 cursor-pointer">
                <Plus className="w-4 h-4" />
                세미나 추가
              </Button>
            </div>
          </div>

          {seminars === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : seminars.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                <EmptyTitle>등록된 세미나 일정이 없습니다</EmptyTitle>
                <EmptyDescription>
                  {selectedCategory === "expert" && effectiveCohortId !== "all"
                    ? "직접 추가하거나 자동 일정 생성을 이용하세요"
                    : "세미나 추가 버튼을 눌러 일정을 등록하세요"}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2 flex-wrap justify-center">
                  {selectedCategory === "expert" && effectiveCohortId !== "all" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setShowCopyDialog(true)} className="gap-1.5">
                        <Copy className="w-3.5 h-3.5" />
                        이전 기수 복사
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleAutoGenerate} disabled={generating} className="gap-1.5">
                        <Wand2 className="w-3.5 h-3.5" />
                        자동 생성
                      </Button>
                    </>
                  )}
                  <Button size="sm" onClick={openCreate}>세미나 추가</Button>
                </div>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-3">
              {seminars.map((s) => {
                const isExpanded = expandedSeminar === s._id;
                const isMultiDay = s.startDate !== s.endDate;
                const seminarCohort = s.cohortId ? cohortsMap.get(s.cohortId) : null;
                return (
                  <Card key={s._id} className="overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedSeminar(isExpanded ? null : s._id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                          {seminarTypeIcon(s.seminarType)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{s.title}</p>
                            <Badge variant={SEMINAR_TYPE_COLORS[s.seminarType] as "default" | "secondary" | "outline"} className="text-xs">
                              {SEMINAR_TYPE_LABELS[s.seminarType]}
                            </Badge>
                            {seminarCohort && (
                              <Badge variant="outline" className="text-xs bg-muted/40 font-normal">
                                {seminarCohort.name} {seminarCohort.term === "first" ? "상반기" : "하반기"}
                              </Badge>
                            )}
                            {/* Online/offline badge for textbook */}
                            {s.seminarType === "one_day" && (
                              <Badge
                                variant="outline"
                                className={cn("text-xs gap-1", s.isOnline
                                  ? "border-blue-400 text-blue-600 dark:text-blue-400"
                                  : "border-muted-foreground text-muted-foreground"
                                )}
                              >
                                {s.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                {s.isOnline ? "온라인" : "오프라인"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <CalendarDays className="w-3 h-3 inline mr-1" />
                            {format(parseISO(s.startDate), "yyyy.MM.dd (E)", { locale: ko })}
                            {isMultiDay && ` ~ ${format(parseISO(s.endDate), "MM.dd (E)", { locale: ko })}`}
                            {s.startTime && ` · ${s.startTime}${s.endTime ? ` ~ ${s.endTime}` : ""}`}
                            {s.location && ` · ${s.location}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {s.seminarType === "group_coaching" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs cursor-pointer text-primary"
                            onClick={(e) => { e.stopPropagation(); setGroupManageSeminarId(s._id); }}
                          >
                            <Users className="w-3.5 h-3.5" />
                            그룹 편성
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(s._id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {isExpanded && s.description && (
                      <CardContent className="pt-0 pb-4 px-4 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">{s.description}</p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSeminar ? "세미나 수정" : "세미나 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedCategory === "expert" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>대상 기수 <span className="text-destructive">*</span></Label>
                    <Select
                      value={formCohortId || (effectiveCohortId !== "all" && effectiveCohortId ? effectiveCohortId : (activeCohort?._id ?? ""))}
                      onValueChange={(v) => setFormCohortId(v as Id<"cohorts">)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="기수 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts?.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name} ({c.term === "first" ? "상반기" : "하반기"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>회차 번호</Label>
                    <Input
                      type="number"
                      placeholder="예: 1"
                      value={form.sessionNumber}
                      onChange={(e) => setForm({ ...form, sessionNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>세미나명 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="예: 1차 세미나"
                    value={form.title}
                    onChange={(e) => { setForm({ ...form, title: e.target.value }); setFormErrors((prev) => ({ ...prev, title: false })); }}
                    className={cn(formErrors.title && "border-destructive focus-visible:ring-destructive")}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>과정 분류 <span className="text-destructive">*</span></Label>
                    <Select
                      value={commonCourseSelect}
                      onValueChange={handleCommonCourseChange}
                    >
                      <SelectTrigger className={cn(formErrors.title && "border-destructive focus-visible:ring-destructive")}>
                        <SelectValue placeholder="과정 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>회차 번호</Label>
                    <Input
                      type="number"
                      placeholder="예: 1"
                      value={form.sessionNumber}
                      onChange={(e) => setForm({ ...form, sessionNumber: e.target.value })}
                    />
                  </div>
                </div>
                {commonCourseSelect === "기타(직접입력)" && (
                  <div className="space-y-2">
                    <Label>과정명 직접 입력 <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="과정명을 입력하세요"
                      value={customCourseTitle}
                      onChange={(e) => handleCustomTitleChange(e.target.value)}
                      className={cn(formErrors.title && "border-destructive focus-visible:ring-destructive")}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>세미나 유형</Label>
              <Select
                value={form.seminarType}
                onValueChange={(v: SeminarType) => setForm({ ...form, seminarType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="two_day">2일 세미나</SelectItem>
                  <SelectItem value="one_day">교재학습</SelectItem>
                  <SelectItem value="group_coaching">그룹코칭 (사례나눔)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Online/Offline toggle — only for one_day */}
            {form.seminarType === "one_day" && (
              <div className="space-y-2">
                <Label>진행 방식</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isOnline: false })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                      !form.isOnline
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <WifiOff className="w-4 h-4" />
                    오프라인 (Off)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isOnline: true })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                      form.isOnline
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-background border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Wifi className="w-4 h-4" />
                    온라인 (On)
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일 <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => { setForm({ ...form, startDate: e.target.value, endDate: form.seminarType !== "two_day" ? e.target.value : form.endDate }); setFormErrors((prev) => ({ ...prev, startDate: false })); }}
                  className={cn(formErrors.startDate && "border-destructive focus-visible:ring-destructive")}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일 <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => { setForm({ ...form, endDate: e.target.value }); setFormErrors((prev) => ({ ...prev, endDate: false })); }}
                  className={cn(formErrors.endDate && "border-destructive focus-visible:ring-destructive")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작 시간</Label>
                <Select
                  value={form.startTime || "none"}
                  onValueChange={(v) => setForm({ ...form, startTime: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="시작 시간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안함</SelectItem>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>종료 시간</Label>
                <Select
                  value={form.endTime || "none"}
                  onValueChange={(v) => setForm({ ...form, endTime: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="종료 시간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안함</SelectItem>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>장소</Label>
              <Select
                value={["MCCI 양재 센터", "한양대 올림픽체육관", "Zoom"].includes(form.location) ? form.location : "기타"}
                onValueChange={(val) => {
                  if (val !== "기타") setForm({ ...form, location: val });
                  else setForm({ ...form, location: "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="장소 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCCI 양재 센터">MCCI 양재 센터</SelectItem>
                  <SelectItem value="한양대 올림픽체육관">한양대 올림픽체육관</SelectItem>
                  <SelectItem value="Zoom">Zoom</SelectItem>
                  <SelectItem value="기타">기타 (직접 입력)</SelectItem>
                </SelectContent>
              </Select>
              {!["MCCI 양재 센터", "한양대 올림픽체육관", "Zoom"].includes(form.location) && (
                <Input
                  placeholder="장소를 직접 입력하세요"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <Textarea
                placeholder="세미나 내용, 준비물 등을 입력하세요"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="cursor-pointer">취소</Button>
            <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Coaching Assignment Dialog */}
      {groupManageSeminar && groupManageSeminar.cohortId && (
        <GroupAssignmentDialog
          seminar={groupManageSeminar}
          cohortId={groupManageSeminar.cohortId}
          onClose={() => setGroupManageSeminarId(null)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>세미나를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy seminars from previous cohort dialog */}
      <Dialog open={showCopyDialog} onOpenChange={(open) => { setShowCopyDialog(open); if (!open) { setCopySourceId(""); setCopyNewStart(""); setCopyModes(["all"]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-4 h-4" />
              이전 기수 세미나 복사
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              이전 기수의 세미나 일정을 <strong>{selectedCohort?.name}</strong>에 복사합니다.
              새 기수의 시작일을 입력하면 날짜를 자동으로 이동시켜 복사합니다.
            </p>
            <div className="space-y-2">
              <Label>복사할 기수 선택</Label>
              <Select
                value={copySourceId}
                onValueChange={(v) => setCopySourceId(v as Id<"cohorts">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="기수를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts
                    ?.filter((c) => c._id !== (effectiveCohortId !== "all" && effectiveCohortId ? effectiveCohortId : null))
                    .map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name} ({c.startDate})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Copy type selection */}
            <div className="space-y-2">
              <Label>복사할 일정 유형</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "all", label: "전체 복사", icon: <RefreshCw className="w-3.5 h-3.5" />, desc: "모든 유형" },
                    { value: "two_day", label: "2일 세미나", icon: <BookOpen className="w-3.5 h-3.5" />, desc: "세미나만" },
                    { value: "one_day", label: "교재복습", icon: <FileText className="w-3.5 h-3.5" />, desc: "교재학습만" },
                    { value: "group_coaching", label: "그룹코칭", icon: <Users className="w-3.5 h-3.5" />, desc: "그룹코칭만" },
                  ] as const
                ).map((opt) => {
                  const isSelected = copyModes.includes(opt.value);
                  const isAll = opt.value === "all";
                  const toggleMode = () => {
                    if (isAll) {
                      setCopyModes(["all"]);
                    } else {
                      setCopyModes((prev) => {
                        const withoutAll = prev.filter((m) => m !== "all");
                        if (withoutAll.includes(opt.value)) {
                          const next = withoutAll.filter((m) => m !== opt.value);
                          return next.length === 0 ? ["all"] : next;
                        } else {
                          return [...withoutAll, opt.value];
                        }
                      });
                    }
                  };
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={toggleMode}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer text-left",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted text-foreground"
                      )}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {copyModes.includes("all")
                  ? "2일 세미나, 교재복습, 그룹코칭 모두 복사됩니다."
                  : `선택한 유형만 복사됩니다: ${copyModes.map((m) => SEMINAR_TYPE_LABELS[m as SeminarType]).join(", ")}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label>새 기수 시작일 (기준일)</Label>
              <Input
                type="date"
                value={copyNewStart}
                onChange={(e) => setCopyNewStart(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                선택한 기수의 시작일 기준으로 날짜를 이동하여 복사합니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCopyDialog(false)}>취소</Button>
            <Button
              onClick={handleCopySeminars}
              disabled={!copySourceId || !copyNewStart || copying}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              {copying ? "복사 중..." : "복사하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Cohort Dialog */}
      <Dialog open={showCohortForm} onOpenChange={setShowCohortForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 과정(기수) 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>커리큘럼 분류 <span className="text-destructive">*</span></Label>
                <Select
                  value={cohortForm.educationCategory}
                  onValueChange={(v: EducationCategoryKey) => {
                    const catDef = categories.find((c) => c.key === v);
                    const firstCourse = catDef?.courses[0]?.key || "";
                    setCohortForm({
                      ...cohortForm,
                      educationCategory: v,
                      courseCode: firstCourse,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="커리큘럼 분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expert">멘탈전문가과정 (정규 장기)</SelectItem>
                    <SelectItem value="common">멘탈공통교육 (단기 과정)</SelectItem>
                    <SelectItem value="kca">KCA교육 (한국코치협회)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>소속 과정 <span className="text-destructive">*</span></Label>
                <Select
                  value={cohortForm.courseCode}
                  onValueChange={(v) => setCohortForm({ ...cohortForm, courseCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="소속 과정 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .find((c) => c.key === cohortForm.educationCategory)
                      ?.courses.map((course) => (
                        <SelectItem key={course.key} value={course.key}>
                          {course.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>과정/기수명 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="예: 19기"
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>기수 번호 <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  placeholder="예: 19"
                  value={cohortForm.number}
                  onChange={(e) => setCohortForm({ ...cohortForm, number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>과정 구분</Label>
                <Select value={cohortForm.term} onValueChange={(v: "first" | "second") => setCohortForm({ ...cohortForm, term: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">상반기</SelectItem>
                    <SelectItem value="second">하반기</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select value={cohortForm.status} onValueChange={(v: "upcoming" | "active" | "completed") => setCohortForm({ ...cohortForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">예정</SelectItem>
                    <SelectItem value="active">진행중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일 <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={cohortForm.startDate}
                  onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일 <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={cohortForm.endDate}
                  onChange={(e) => setCohortForm({ ...cohortForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <Textarea
                placeholder="과정(기수)에 대한 설명을 입력하세요"
                value={cohortForm.description}
                onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCohortForm(false)}>취소</Button>
            <Button onClick={handleSaveCohort} disabled={cohortSaving}>
              {cohortSaving ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 교육과정 등록 및 편집 다이얼로그 */}
      <Dialog open={showCourseDefForm} onOpenChange={setShowCourseDefForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              {isEditingCourseDef ? "교육과정 정보 편집" : "새 교육과정 등록"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>커리큘럼 분류 (교육 분류) <span className="text-destructive">*</span></Label>
              <Select
                value={courseDefCategory}
                onValueChange={(v) => setCourseDefCategory(v as EducationCategoryKey)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="교육 분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expert">멘탈전문가과정 (정규 장기과정)</SelectItem>
                  <SelectItem value="common">멘탈공통교육 (단기 과정)</SelectItem>
                  <SelectItem value="kca">KCA교육 (한국코치협회 단기과정)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>과정명 <span className="text-destructive">*</span></Label>
              <Input
                placeholder="예: KPC실습과정, 멘탈코칭기초"
                value={courseDefName}
                onChange={(e) => setCourseDefName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>인정 교육시간 (선택, 시간 단위)</Label>
              <Input
                type="number"
                min={0}
                placeholder="예: 20 (미입력 시 0)"
                value={courseDefHours}
                onChange={(e) => setCourseDefHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>과정 간단 설명 (선택)</Label>
              <Textarea
                rows={3}
                placeholder="과정에 대한 간략한 설명이나 목표를 입력하세요"
                value={courseDefDesc}
                onChange={(e) => setCourseDefDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileDown className="w-3.5 h-3.5 text-red-600" />
                안내 PDF 파일 링크 (선택)
              </Label>
              <Input
                placeholder="예: https://.../guide.pdf"
                value={courseDefPdfUrl}
                onChange={(e) => setCourseDefPdfUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                교육과정 소개서 또는 안내 PDF 파일의 웹 링크(URL)를 입력하세요.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                관련 랜딩페이지 링크 (선택)
              </Label>
              <Input
                placeholder="예: https://mcci.co.kr/courses/expert"
                value={courseDefLandingUrl}
                onChange={(e) => setCourseDefLandingUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                신청 또는 세부 정보를 확인할 수 있는 웹사이트 주소를 입력하세요.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCourseDefForm(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveCourseDef}
              disabled={savingCourseDef}
            >
              {savingCourseDef ? "저장 중..." : (isEditingCourseDef ? "수정 완료" : "등록 완료")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Group Assignment Dialog ───────────────────────────────────────────────────

const GROUP_NAMES = ["A조", "B조", "C조", "D조"];
const GROUP_COLORS = [
  "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
  "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
  "bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700",
  "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700",
];
const GROUP_HEADER_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-purple-500",
];

type GroupState = {
  groupNumber: number;
  groupName: string;
  memberIds: Id<"users">[];
  date: string;
  startTime: string;
  endTime: string;
  location: string;
};

type MemberInfo = {
  _id: Id<"users">;
  name?: string;
  email?: string;
  certificationGoal?: "KAC" | "KPC" | "SMPCC";
};

function GroupAssignmentDialog({
  seminar,
  cohortId,
  onClose,
}: {
  seminar: Seminar;
  cohortId: Id<"cohorts">;
  onClose: () => void;
}) {
  const members = useQuery(api.cohorts.getMembers, { cohortId });
  const existingGroups = useQuery(api.coachingGroups.getBySeminar, { seminarId: seminar._id });
  const saveGroups = useMutation(api.coachingGroups.saveGroups);

  const [groups, setGroups] = useState<GroupState[]>([
    { groupNumber: 1, groupName: "A조", memberIds: [], date: seminar.startDate, startTime: seminar.startTime ?? "", endTime: seminar.endTime ?? "", location: seminar.location ?? "" },
    { groupNumber: 2, groupName: "B조", memberIds: [], date: seminar.startDate, startTime: seminar.startTime ?? "", endTime: seminar.endTime ?? "", location: seminar.location ?? "" },
    { groupNumber: 3, groupName: "C조", memberIds: [], date: seminar.startDate, startTime: seminar.startTime ?? "", endTime: seminar.endTime ?? "", location: seminar.location ?? "" },
  ]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize from existing data
  if (!initialized && members !== undefined && existingGroups !== undefined) {
    if (existingGroups.length > 0) {
      setGroups(
        existingGroups
          .sort((a, b) => a.groupNumber - b.groupNumber)
          .map((g) => ({
            groupNumber: g.groupNumber,
            groupName: g.groupName,
            memberIds: g.memberIds,
            date: g.date ?? seminar.startDate,
            startTime: g.startTime ?? seminar.startTime ?? "",
            endTime: g.endTime ?? seminar.endTime ?? "",
            location: g.location ?? seminar.location ?? "",
          }))
      );
    }
    setInitialized(true);
  }

  const activeMembers: MemberInfo[] = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.status === "active" && m.user)
      .map((m) => ({
        _id: m.user!._id,
        name: m.user!.name,
        email: m.user!.email,
        certificationGoal: m.user!.certificationGoal,
      }));
  }, [members]);

  // Members not yet assigned to any group
  const assignedIds = new Set(groups.flatMap((g) => g.memberIds));
  const unassigned = activeMembers.filter((m) => !assignedIds.has(m._id));

  const addGroup = () => {
    if (groups.length >= 4) return;
    const nextNum = groups.length + 1;
    setGroups([...groups, {
      groupNumber: nextNum,
      groupName: GROUP_NAMES[nextNum - 1] ?? `${nextNum}조`,
      memberIds: [],
      date: seminar.startDate,
      startTime: seminar.startTime ?? "",
      endTime: seminar.endTime ?? "",
      location: seminar.location ?? "",
    }]);
  };

  const removeGroup = (idx: number) => {
    const removed = groups[idx];
    const newGroups = groups.filter((_, i) => i !== idx).map((g, i) => ({
      ...g,
      groupNumber: i + 1,
      groupName: GROUP_NAMES[i] ?? `${i + 1}조`,
    }));
    setGroups(newGroups);
  };

  const assignMember = (memberId: Id<"users">, groupIdx: number) => {
    setGroups(groups.map((g, i) => {
      if (i === groupIdx) return { ...g, memberIds: [...g.memberIds, memberId] };
      return { ...g, memberIds: g.memberIds.filter((id) => id !== memberId) };
    }));
  };

  const removeMember = (memberId: Id<"users">, groupIdx: number) => {
    setGroups(groups.map((g, i) => {
      if (i === groupIdx) return { ...g, memberIds: g.memberIds.filter((id) => id !== memberId) };
      return g;
    }));
  };

  const autoAssign = () => {
    const shuffled = [...activeMembers].sort(() => Math.random() - 0.5);
    const newGroups = groups.map((g) => ({ ...g, memberIds: [] as Id<"users">[] }));
    shuffled.forEach((m, i) => {
      newGroups[i % newGroups.length].memberIds.push(m._id);
    });
    setGroups(newGroups);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGroups({
        seminarId: seminar._id,
        cohortId,
        groups: groups.map((g) => ({
          groupNumber: g.groupNumber,
          groupName: g.groupName,
          memberIds: g.memberIds,
          date: g.date || undefined,
          startTime: g.startTime || undefined,
          endTime: g.endTime || undefined,
          location: g.location || undefined,
        })),
      });
      toast.success("그룹 편성이 저장되었습니다");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setSaving(false);
    }
  };

  const getMemberInfo = (id: Id<"users">) =>
    activeMembers.find((m) => m._id === id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            그룹 편성 — {seminar.title}
          </DialogTitle>
        </DialogHeader>

        {members === undefined || existingGroups === undefined ? (
          <div className="space-y-3 py-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Action bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                전체 {activeMembers.length}명 · 미배정 {unassigned.length}명
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={autoAssign}
                  className="gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  랜덤 배정
                </Button>
                {groups.length < 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addGroup}
                    className="gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    그룹 추가
                  </Button>
                )}
              </div>
            </div>

            {/* Unassigned pool */}
            {unassigned.length > 0 && (
              <div className="rounded-xl border border-dashed p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">미배정 수강생</p>
                <div className="flex flex-wrap gap-2">
                  {unassigned.map((m) => (
                    <div key={m._id} className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                      <span className="text-sm font-medium">{m.name ?? "이름 없음"}</span>
                      {m.certificationGoal && (
                        <span className="text-xs text-muted-foreground">({m.certificationGoal})</span>
                      )}
                      <div className="flex gap-1 ml-1">
                        {groups.map((g, idx) => (
                          <button
                            key={g.groupNumber}
                            onClick={() => assignMember(m._id, idx)}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-opacity hover:opacity-80",
                              GROUP_HEADER_COLORS[idx],
                              "text-white"
                            )}
                          >
                            {g.groupName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Groups */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {groups.map((g, idx) => (
                <div
                  key={g.groupNumber}
                  className={cn("rounded-xl border-2 overflow-hidden", GROUP_COLORS[idx])}
                >
                  {/* Group header */}
                  <div className={cn("flex items-center justify-between px-3 py-2", GROUP_HEADER_COLORS[idx])}>
                    <span className="text-sm font-bold text-white">{g.groupName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/80">{g.memberIds.length}명</span>
                      {groups.length > 1 && (
                        <button
                          onClick={() => removeGroup(idx)}
                          className="text-white/70 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Schedule inputs */}
                  <div className="px-2 pt-2 pb-1 space-y-1.5 bg-background/60 border-b">
                    <div className="grid grid-cols-3 gap-1">
                      <div className="col-span-3">
                        <Input
                          type="date"
                          value={g.date}
                          onChange={(e) => setGroups(groups.map((gr, i) => i === idx ? { ...gr, date: e.target.value } : gr))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <Select
                        value={g.startTime || "none"}
                        onValueChange={(v) => setGroups(groups.map((gr, i) => i === idx ? { ...gr, startTime: v === "none" ? "" : v } : gr))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="시작" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">시작 시간</SelectItem>
                          {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={g.endTime || "none"}
                        onValueChange={(v) => setGroups(groups.map((gr, i) => i === idx ? { ...gr, endTime: v === "none" ? "" : v } : gr))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="종료" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">종료 시간</SelectItem>
                          {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-7 text-xs"
                        placeholder="장소 / 줌 링크"
                        value={g.location}
                        onChange={(e) => setGroups(groups.map((gr, i) => i === idx ? { ...gr, location: e.target.value } : gr))}
                      />
                    </div>
                  </div>

                  {/* Members */}
                  <div className="p-2 min-h-[70px] space-y-1">
                    {g.memberIds.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        미배정 수강생을 클릭하여 추가하세요
                      </p>
                    ) : (
                      g.memberIds.map((id) => {
                        const info = getMemberInfo(id);
                        return (
                          <div key={id} className="flex items-center justify-between bg-background/80 rounded-lg px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                                GROUP_HEADER_COLORS[idx]
                              )}>
                                {(info?.name ?? "?")[0]}
                              </div>
                              <span className="text-sm font-medium">{info?.name ?? "이름 없음"}</span>
                              {info?.certificationGoal && (
                                <span className="text-xs text-muted-foreground">({info.certificationGoal})</span>
                              )}
                            </div>
                            <button
                              onClick={() => removeMember(id, idx)}
                              className="text-muted-foreground hover:text-destructive cursor-pointer ml-2"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                    {unassigned.length > 0 && (
                      <Select onValueChange={(v) => assignMember(v as Id<"users">, idx)}>
                        <SelectTrigger className="h-7 text-xs border-dashed mt-1 cursor-pointer">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <UserPlus className="w-3 h-3" />
                            수강생 추가
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {unassigned.map((m) => (
                            <SelectItem key={m._id} value={m._id}>
                              {m.name ?? "이름 없음"} {m.certificationGoal ? `(${m.certificationGoal})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="cursor-pointer">취소</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 cursor-pointer">
            <Save className="w-4 h-4" />
            {saving ? "저장 중..." : "그룹 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
