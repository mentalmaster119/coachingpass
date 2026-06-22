import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Pencil, Trash2, BookOpen, Users, MessageSquare, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
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
import ReflectionForm from "./reflection-form.tsx";

type ReflectionDoc = Doc<"reflectionJournals">;

const RELATED_TYPE_CONFIG = {
  general:         { label: "일반 성찰",      icon: BookOpen,      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  coaching:        { label: "코칭 실습",       icon: Users,         color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  mentor_coaching: { label: "멘토코칭/코더코", icon: MessageSquare, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  education:       { label: "교육 이수",       icon: GraduationCap, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
} as const;

const MOOD_CONFIG = {
  great:       { label: "매우 좋음", emoji: "😊" },
  good:        { label: "좋음",     emoji: "🙂" },
  neutral:     { label: "보통",     emoji: "😐" },
  difficult:   { label: "어려움",   emoji: "😔" },
  challenging: { label: "도전적",   emoji: "💪" },
} as const;

interface ReflectionCardProps {
  entry: ReflectionDoc;
  readOnly?: boolean;
}

export default function ReflectionCard({ entry, readOnly = false }: ReflectionCardProps) {
  const removeJournal = useMutation(api.reflections.remove);
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const typeConfig = entry.relatedType ? RELATED_TYPE_CONFIG[entry.relatedType] : RELATED_TYPE_CONFIG.general;
  const TypeIcon = typeConfig.icon;
  const moodConfig = entry.mood ? MOOD_CONFIG[entry.mood] : null;

  const preview = entry.content.slice(0, 150);
  const isLong = entry.content.length > 150;

  const formattedDate = (() => {
    try {
      return format(new Date(entry.entryDate), "yyyy년 M월 d일 (EEE)", { locale: ko });
    } catch {
      return entry.entryDate;
    }
  })();

  const handleDelete = async () => {
    try {
      await removeJournal({ journalId: entry._id });
      toast.success("일지가 삭제되었습니다.");
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            {/* Type icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
              <TypeIcon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{formattedDate}</span>
                    <Badge variant="secondary" className={`text-[11px] px-1.5 py-0 ${typeConfig.color}`}>
                      {typeConfig.label}
                    </Badge>
                    {moodConfig && (
                      <span className="text-xs text-muted-foreground">
                        {moodConfig.emoji} {moodConfig.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!readOnly && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mt-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {expanded ? entry.content : preview}
                  {isLong && !expanded && "..."}
                </p>
                {isLong && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {expanded ? (
                      <>접기 <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>더 보기 <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <>
          <ReflectionForm open={editOpen} onOpenChange={setEditOpen} editEntry={entry} />

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>일지 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  "{entry.title}" 일지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
