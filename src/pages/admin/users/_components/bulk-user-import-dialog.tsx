import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Trash2,
  FileUp,
  Clipboard,
  AlertTriangle,
  Users,
} from "lucide-react";
import { downloadCSV } from "@/lib/csv.ts";

export interface ParsedUserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "trainee" | "senior_coach" | "admin";
  isValid: boolean;
  errorReason?: string;
  isDuplicate?: boolean;
}

export function BulkUserImportDialog({
  open,
  onOpenChange,
  initialCohortId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCohortId?: string;
  onSuccess?: () => void;
}) {
  const cohorts = useQuery(api.cohorts.list, {});
  const bulkCreate = useMutation(api.admin.bulkCreateUsers);

  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"paste" | "file">("paste");
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [initialPassword, setInitialPassword] = useState("M12345");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ParsedUserRow[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCohortId) {
      setSelectedCohortId(initialCohortId);
    }
  }, [initialCohortId, open]);

  // 이메일 유효성 정규식
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 텍스트 라인 파싱 및 유효성 검증
  const parseRawText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: ParsedUserRow[] = [];
    const seenEmails = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 탭, 쉼표, 세미콜론 분리자 자동 인식
      let delimiter = ",";
      if (line.includes("\t")) delimiter = "\t";
      else if (line.includes(";")) delimiter = ";";

      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length === 0 || !parts[0]) continue;

      // 헤더 행 자동 감지 및 건너뛰기
      const firstCol = parts[0].toLowerCase();
      if (
        i === 0 &&
        (firstCol.includes("이름") ||
          firstCol.includes("name") ||
          firstCol.includes("성명") ||
          parts[1]?.toLowerCase().includes("email") ||
          parts[1]?.toLowerCase().includes("이메일"))
      ) {
        continue;
      }

      const name = parts[0] || "";
      const email = (parts[1] || "").toLowerCase();
      const phone = parts[2] || undefined;
      const rawRole = parts[3] || "";

      let role: "trainee" | "senior_coach" | "admin" = "trainee";
      const r = rawRole.toLowerCase();
      if (
        r.includes("멘토") ||
        r.includes("수퍼") ||
        r.includes("senior") ||
        r.includes("coach") ||
        r.includes("mentor") ||
        r.includes("supervisor")
      ) {
        role = "senior_coach";
      } else if (r.includes("관리자") || r.includes("admin") || r.includes("운영")) {
        role = "admin";
      }

      let isValid = true;
      let errorReason: string | undefined;

      if (!name) {
        isValid = false;
        errorReason = "이름 누락";
      } else if (!email) {
        isValid = false;
        errorReason = "이메일 누락";
      } else if (!emailRegex.test(email)) {
        isValid = false;
        errorReason = "이메일 형식 오류";
      }

      const isDuplicate = seenEmails.has(email);
      if (isDuplicate) {
        errorReason = "명단 내 이메일 중복";
      } else if (email) {
        seenEmails.add(email);
      }

      parsed.push({
        id: `row-${i}-${Date.now()}`,
        name,
        email,
        phone,
        role,
        isValid: isValid && !isDuplicate,
        errorReason,
        isDuplicate,
      });
    }

    setRows(parsed);
  };

  // 붙여넣기 텍스트 변경 시 파싱
  const handleTextChange = (text: string) => {
    setInputText(text);
    parseRawText(text);
  };

  // 파일 업로드 처리
  const processFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      setInputText(content);
      parseRawText(content);
      toast.success(`${file.name} 파일을 읽었습니다.`);
    };
    reader.onerror = () => {
      toast.error("파일을 읽는 중 오류가 발생했습니다.");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // 샘플 데이터 불러오기
  const handleLoadSample = () => {
    const sample = `이름\t이메일\t전화번호\t역할
홍길동\thong@example.com\t010-1234-5678\t코치
이영희\tyounghee@example.com\t010-9876-5432\t코치
김멘토\tmentor.kim@example.com\t010-5555-7777\t멘토코치
박수퍼\tsuper.park@example.com\t010-3333-2222\t멘토코치`;
    setInputText(sample);
    parseRawText(sample);
    setFileName(null);
  };

  // CSV 템플릿 파일 다운로드
  const handleDownloadTemplate = () => {
    const templateContent = `이름,이메일,전화번호,역할
홍길동,coach1@example.com,010-1234-5678,코치
이영희,coach2@example.com,010-9876-5432,코치
김멘토,mentor.kim@example.com,010-5555-7777,멘토코치
박수퍼,supervisor.park@example.com,010-3333-2222,멘토코치`;
    downloadCSV(templateContent, "MCCI_코치명단_등록양식.csv");
    toast.success("엑셀/CSV 등록 양식이 다운로드되었습니다.");
  };

  // 단일 행 삭제
  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // 단일 행 역할 변경
  const handleRoleChange = (id: string, newRole: "trainee" | "senior_coach" | "admin") => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, role: newRole } : r))
    );
  };

  const validUsers = rows.filter((r) => r.isValid);
  const invalidUsers = rows.filter((r) => !r.isValid);

  // 일괄 등록 실행
  const handleImport = async () => {
    if (validUsers.length === 0) {
      toast.error("등록 가능한 유효한 사용자 데이터가 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadUsers = validUsers.map((u) => ({
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
      }));

      const results = await bulkCreate({
        cohortId:
          selectedCohortId && selectedCohortId !== "none"
            ? (selectedCohortId as Id<"cohorts">)
            : undefined,
        users: payloadUsers,
        initialPassword: initialPassword.trim() || "M12345",
      });

      const createdCount = results.filter((r) => r.status === "created").length;
      const existingCount = results.filter((r) => r.status === "already_exists").length;

      toast.success("명단 일괄 등록이 완료되었습니다!", {
        description: `신규 등록: ${createdCount}명, 기존 계정 기수 연결: ${existingCount}명`,
      });

      setInputText("");
      setRows([]);
      setFileName(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "일괄 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              신규 기수 코치 엑셀/CSV 일괄 대량 배정
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              표준 양식 다운로드 (.csv)
            </Button>
          </div>
          <DialogDescription>
            엑셀 표의 셀을 복사하여 붙여넣거나 CSV 파일을 드래그하여 등록하면 계정 자동 생성 및 기수 배정이 한 번에 완료됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. 기수 배정 및 비밀번호 설정 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-border/70 bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">배정할 기수 선택</Label>
              <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="기수 선택 (생략 시 미배정)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">기수 미지정 (계정만 생성)</SelectItem>
                  {cohorts?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">초기 비밀번호</Label>
              <Input
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="예: M12345"
                className="h-9 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                코치 첫 로그인 후 직접 변경 가능
              </p>
            </div>
          </div>

          {/* 2. 입력 방식 선택 (Tabs) */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "paste" | "file")}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-2">
              <TabsList className="h-8">
                <TabsTrigger value="paste" className="gap-1.5 text-xs">
                  <Clipboard className="w-3.5 h-3.5" />
                  직접 붙여넣기 (Excel 복사)
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-1.5 text-xs">
                  <FileUp className="w-3.5 h-3.5" />
                  파일 업로드 (CSV/TSV)
                </TabsTrigger>
              </TabsList>

              {activeTab === "paste" && (
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  예시 서식 불러오기
                </button>
              )}
            </div>

            {/* 탭 1: 직접 붙여넣기 */}
            <TabsContent value="paste" className="mt-0 space-y-1.5">
              <Textarea
                rows={5}
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="이름 [탭 또는 쉼표] 이메일 [탭 또는 쉼표] 전화번호(선택) [탭 또는 쉼표] 역할(선택)&#10;예시: 홍길동	hong@example.com	010-1234-5678	코치"
                className="font-mono text-xs leading-relaxed resize-y"
              />
            </TabsContent>

            {/* 탭 2: 파일 업로드 (드래그앤드롭) */}
            <TabsContent value="file" className="mt-0 space-y-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileUp className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  CSV 또는 TSV 파일을 이곳에 끌어다 놓거나 클릭하여 선택하세요
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  UTF-8 인코딩 지원 (.csv, .tsv, .txt)
                </p>
                {fileName && (
                  <Badge variant="secondary" className="mt-3 gap-1">
                    선택된 파일: {fileName}
                  </Badge>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* 3. 파싱 및 사전 검증 결과 요약 */}
          {rows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    총 인식된 인원: {rows.length}명
                  </span>
                  <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                    등록 가능 {validUsers.length}명
                  </Badge>
                  {invalidUsers.length > 0 && (
                    <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800">
                      형식 오류 {invalidUsers.length}건
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground text-[11px]">
                  가입 상태: 자동 '승인완료' 처리
                </span>
              </div>

              {/* 검증 오류 알림 배너 */}
              {invalidUsers.length > 0 && (
                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>
                    오류가 있는 행({invalidUsers.length}건)은 일괄 등록 시 자동으로 제외되며, 유효한 {validUsers.length}명만 등록됩니다.
                  </span>
                </div>
              )}

              {/* 미리보기 테이블 */}
              <div className="max-h-56 overflow-y-auto border border-border rounded-lg bg-card shadow-inner">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground border-b border-border sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3">이름</th>
                      <th className="py-2 px-3">이메일</th>
                      <th className="py-2 px-3">전화번호</th>
                      <th className="py-2 px-3">배정 역할</th>
                      <th className="py-2 px-3">상태</th>
                      <th className="py-2 px-3 w-10 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={`hover:bg-muted/40 transition-colors ${
                          !u.isValid ? "bg-rose-500/5 dark:bg-rose-950/20" : ""
                        }`}
                      >
                        <td className="py-1.5 px-3 text-center text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-foreground">
                          {u.name || <span className="text-rose-500">누락</span>}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="py-1.5 px-3 text-muted-foreground">
                          {u.phone || "—"}
                        </td>
                        <td className="py-1.5 px-3">
                          <Select
                            value={u.role}
                            onValueChange={(val) =>
                              handleRoleChange(
                                u.id,
                                val as "trainee" | "senior_coach" | "admin"
                              )
                            }
                          >
                            <SelectTrigger className="h-6 text-[11px] px-1.5 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trainee">코치</SelectItem>
                              <SelectItem value="senior_coach">멘토코치</SelectItem>
                              <SelectItem value="admin">관리자</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-3">
                          {u.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> 정상
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                              <AlertCircle className="w-3 h-3" /> {u.errorReason}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRow(u.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleImport}
            disabled={isSubmitting || validUsers.length === 0}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isSubmitting
              ? "등록 처리 중..."
              : `${validUsers.length}명 일괄 등록 및 기수 배정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
