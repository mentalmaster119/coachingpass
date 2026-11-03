import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { Users, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";

interface ParsedUser {
  name: string;
  email: string;
  phone?: string;
  role: "trainee" | "senior_coach" | "admin";
}

export function BulkUserImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const cohorts = useQuery(api.cohorts.list, {});
  const bulkCreate = useMutation(api.admin.bulkCreateUsers);

  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [initialPassword, setInitialPassword] = useState("M12345");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse lines (comma, tab, or space separated)
  const parseLines = (text: string): ParsedUser[] => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: ParsedUser[] = [];

    for (const line of lines) {
      // Split by tab (Excel copy) or comma
      const delimiter = line.includes("\t") ? "\t" : ",";
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const email = parts[1];
        const phone = parts[2] || undefined;
        let role: "trainee" | "senior_coach" | "admin" = "trainee";

        if (parts[3]) {
          const r = parts[3].toLowerCase();
          if (r.includes("멘토") || r.includes("senior") || r.includes("coach")) role = "senior_coach";
          else if (r.includes("관리자") || r.includes("admin")) role = "admin";
        }

        if (email.includes("@")) {
          parsed.push({ name, email, phone, role });
        }
      }
    }
    return parsed;
  };

  const parsedUsers = parseLines(inputText);

  const handleImport = async () => {
    if (parsedUsers.length === 0) {
      toast.error("유효한 사용자 데이터가 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await bulkCreate({
        cohortId: selectedCohortId ? (selectedCohortId as Id<"cohorts">) : undefined,
        users: parsedUsers,
        initialPassword: initialPassword.trim() || "M12345",
      });

      const createdCount = results.filter((r) => r.status === "created").length;
      const existingCount = results.filter((r) => r.status === "already_exists").length;

      toast.success("명단 일괄 등록이 완료되었습니다!", {
        description: `신규 등록: ${createdCount}명, 기존 계정 기수 연결: ${existingCount}명`,
      });

      setInputText("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "일괄 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    setInputText(`홍길동\thong@example.com\t010-1234-5678\t코치
이영희\tyounghee@example.com\t010-9876-5432\t코치
김멘토\tmentor.kim@example.com\t010-5555-7777\t멘토코치`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            코치 명단 엑셀 일괄 등록
          </DialogTitle>
          <DialogDescription>
            엑셀 표의 셀 영역(이름, 이메일, 전화번호, 역할)을 복사하여 아래에 붙여넣으면 한 번에 계정이 생성되고 기수에 배정됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 배정할 기수 선택 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>소속 기수 배정 (선택)</Label>
              <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                <SelectTrigger>
                  <SelectValue placeholder="기수 선택 (생략 시 미배정)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">기수 미지정</SelectItem>
                  {cohorts?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>초기 부여 비밀번호</Label>
              <Input
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="예: M12345"
              />
              <p className="text-[11px] text-muted-foreground">코치가 첫 로그인 후 직접 변경할 수 있습니다.</p>
            </div>
          </div>

          {/* 붙여넣기 입력창 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulkInput">엑셀 데이터 붙여넣기 (Ctrl+V / Cmd+V)</Label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                예시 서식 불러오기
              </button>
            </div>
            <Textarea
              id="bulkInput"
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="이름 [탭] 이메일 [탭] 전화번호(선택) [탭] 역할(선택)&#10;예시: 홍길동	hong@example.com	010-1234-5678	코치"
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          {/* 파싱 미리보기 */}
          {parsedUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  인식된 명단: {parsedUsers.length}명
                </span>
                <span className="text-muted-foreground">초기 상태: 자동 승인됨</span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-muted/30">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground border-b border-border sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">이름</th>
                      <th className="py-2 px-3">이메일</th>
                      <th className="py-2 px-3">전화번호</th>
                      <th className="py-2 px-3">역할</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedUsers.map((u, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="py-1.5 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-semibold">{u.name}</td>
                        <td className="py-1.5 px-3 text-muted-foreground font-mono">{u.email}</td>
                        <td className="py-1.5 px-3 text-muted-foreground">{u.phone || "—"}</td>
                        <td className="py-1.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium">
                            {u.role === "senior_coach" ? "멘토코치" : u.role === "admin" ? "관리자" : "코치"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            onClick={handleImport}
            disabled={isSubmitting || parsedUsers.length === 0}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isSubmitting ? "등록 처리 중..." : `${parsedUsers.length}명 일괄 등록`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
