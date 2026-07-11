import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(
      v.literal("trainee"),
      v.literal("senior_coach"),
      v.literal("admin"),
    ),
    approvalStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    rejectionReason: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    assignedCoachId: v.optional(v.id("users")), // senior coach assigned to this trainee
    // Legacy field kept for DB compatibility (SMPCC is the only certification goal now)
    certificationGoal: v.optional(v.union(v.literal("KAC"), v.literal("KPC"), v.literal("SMPCC"))),
    // Extended profile fields
    avatarStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),            // 자기소개
    phone: v.optional(v.string()),          // 전화번호
    specializations: v.optional(v.array(v.string())), // 전문 분야 태그
    coachingStyle: v.optional(v.string()),  // 코칭 스타일
    joinedAt: v.optional(v.string()),       // ISO 8601 - when they joined
    mbti: v.optional(v.string()),          // MBTI 유형 (예: INFJ, 모를 경우 미입력)
    motivationalMessage: v.optional(v.string()), // 자신에게 힘을 주는 메시지
    // 알림 리마인더 설정
    checkInReminderEnabled: v.optional(v.boolean()),
    checkInReminderHourUTC: v.optional(v.number()), // 0-23 UTC hour
    reflectionReminderEnabled: v.optional(v.boolean()), // 주간 성찰 일지 리마인더
    coachingLogReminderEnabled: v.optional(v.boolean()), // 코칭 로그 초안 리마인더
    isMockActive: v.optional(v.boolean()), // 로컬 개발용 활성 모크 유저 플래그
    activeMockRole: v.optional(v.union(v.literal("trainee"), v.literal("senior_coach"))), // 어드민별 화면 프리뷰 역할 설정
    passwordHash: v.optional(v.string()), // 자체 로그인을 위한 비밀번호 해시
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_approval_status", ["approvalStatus"])
    .index("by_role", ["role"]),

  coachingLogs: defineTable({
    userId: v.id("users"),
    // ── Ⅰ. 기본정보 ──
    coachingDate: v.string(),                  // ISO 8601 date
    coachingStartTime: v.optional(v.string()), // HH:mm
    coachingEndTime: v.optional(v.string()),   // HH:mm
    durationMinutes: v.number(),
    coachingType: v.union(
      v.literal("individual"),
      v.literal("group"),
      v.literal("team"),
      v.literal("buddy"),
      v.literal("mentor"),
      v.literal("sv")
    ),
    coachingPlace: v.optional(v.union(
      v.literal("zoom"), v.literal("study_room"), v.literal("center"),
      v.literal("home"), v.literal("other"), v.literal("hanyang")
    )),
    coachingPlaceOther: v.optional(v.string()),
    sessionNumber: v.optional(v.string()),     // "1","2","3","other"
    coacheeInfo: v.string(),                   // 코치이 이름
    coacheeGender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    coacheeAge: v.optional(v.number()),
    coacheePersonality: v.optional(v.string()),
    coacheeType: v.optional(v.array(v.string())),  // 고객유형 (복수)
    ncpClientCategory: v.optional(v.union(v.literal("athlete"), v.literal("general"))), // NCP 고객 분류
    coacheeField: v.optional(v.string()),           // 종목/직군
    // ── Ⅱ. 코칭 주제 ──
    topic: v.string(),
    coreIssues: v.optional(v.array(v.string())),   // 핵심 문제 (복수)
    // ── Ⅲ. 상태 진단 ──
    preCoachingState: v.optional(v.object({
      motivation: v.union(v.number(), v.null()),   // 의욕 (null = 진단 안함)
      confidence: v.union(v.number(), v.null()),   // 자신감
      focus: v.union(v.number(), v.null()),        // 집중력
      calmness: v.union(v.number(), v.null()),     // 평온함
      actionWill: v.union(v.number(), v.null()),   // 실행의지
    })),
    postCoachingState: v.optional(v.object({
      motivation: v.union(v.number(), v.null()),
      confidence: v.union(v.number(), v.null()),
      focus: v.union(v.number(), v.null()),
      calmness: v.union(v.number(), v.null()),
      actionWill: v.union(v.number(), v.null()),
    })),
    // ── Ⅳ. 사용 기법 ──
    techniquesUsed: v.optional(v.array(v.string())),
    techniqueOther: v.optional(v.string()),
    // ── Ⅴ. 핵심 발견 ──
    clientInsight: v.optional(v.string()),     // 고객의 핵심 통찰
    coachPattern: v.optional(v.string()),      // 코치가 발견한 핵심 패턴
    // ── Ⅵ. 실행 ──
    goals: v.string(),                         // 코칭 목표
    actionPlan: v.optional(v.string()),        // 고객의 실행계획
    nextSessionPractice: v.optional(v.string()), // 다음 회차까지 실천사항
    // ── Ⅶ. 코치 성장 ──
    summary: v.string(),                       // 코칭 내용 요약
    reflection: v.optional(v.string()),        // 성찰
    bestOfSession: v.optional(v.string()),     // 이번 세션에서 가장 잘한 점
    improvementForNext: v.optional(v.string()), // 다음 세션에서 개선할 점
    changeKeywords: v.optional(v.array(v.string())), // 변화 키워드 (최대 3개)
    mostEffectiveTechnique: v.optional(v.string()), // 가장 효과적이었던 개입
    clientQuote: v.optional(v.string()),       // 고객의 대표 한마디
    coachOverallFeedback: v.optional(v.string()), // 코치 전체 소감
    mcciDomain: v.optional(v.union(            // MCCI 4대 영역
      v.literal("motivation"), v.literal("skill"),
      v.literal("performance"), v.literal("relationship")
    )),
    // ── 증빙 / 승인 ──
    evidenceStorageId: v.optional(v.id("_storage")),
    approvalStatus: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "approvalStatus"])
    .index("by_approval_status", ["approvalStatus"]),

  coachingLogComments: defineTable({
    coachingLogId: v.id("coachingLogs"),
    userId: v.id("users"),
    userName: v.string(),
    role: v.union(v.literal("admin"), v.literal("senior_coach"), v.literal("trainee")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_log", ["coachingLogId"]),

  educationRecords: defineTable({
    userId: v.id("users"),
    educationName: v.string(),
    institution: v.string(),
    educationDate: v.string(), // ISO 8601 date string
    hours: v.number(),
    certificateStorageId: v.optional(v.id("_storage")),
    approvalStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "approvalStatus"])
    .index("by_approval_status", ["approvalStatus"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("education_approved"),
      v.literal("education_rejected"),
      v.literal("coaching_approved"),
      v.literal("coaching_rejected"),
      v.literal("mentor_coaching_approved"),
      v.literal("mentor_coaching_rejected"),
      v.literal("account_approved"),
      v.literal("account_rejected"),
      v.literal("account_pending"),
      v.literal("certification_approved"),
      v.literal("certification_rejected"),
      v.literal("feedback_received"),
      v.literal("profile_incomplete"),
      v.literal("announcement"),
      v.literal("bcp_approved"),
      v.literal("bcp_rejected"),
      v.literal("coaching_log_submitted"),    // for coach: trainee submitted log
      v.literal("reflection_submitted"),      // for coach: trainee wrote reflection
      v.literal("trainee_progress_alert"),    // for admin: trainee inactive
      v.literal("coaching_log_commented"),    // for comment alerts
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"]),

  reflectionJournals: defineTable({
    userId: v.id("users"),
    entryDate: v.string(), // ISO 8601 date string
    title: v.string(),
    content: v.string(),
    relatedType: v.optional(
      v.union(
        v.literal("general"),       // 일반 성찰
        v.literal("coaching"),      // 코칭 실습 관련
        v.literal("mentor_coaching"), // 멘토코칭/코더코 관련
        v.literal("education"),     // 교육 이수 관련
      ),
    ),
    mood: v.optional(
      v.union(
        v.literal("great"),
        v.literal("good"),
        v.literal("neutral"),
        v.literal("difficult"),
        v.literal("challenging"),
      ),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "entryDate"]),

  mentorCoachingLogs: defineTable({
    userId: v.id("users"), // trainee
    sessionDate: v.string(), // ISO 8601
    sessionType: v.union(
      v.literal("mentor_coaching"), // 멘토코칭
      v.literal("coder_co"),        // 코더코
    ),
    coachName: v.string(),   // name of the mentor/senior coach
    durationMinutes: v.number(),
    topic: v.string(),
    content: v.string(),     // summary of session
    reflection: v.optional(v.string()),
    evidenceStorageId: v.optional(v.id("_storage")),
    approvalStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "approvalStatus"])
    .index("by_approval_status", ["approvalStatus"]),

  competencyAssessments: defineTable({
    userId: v.id("users"),
    assessedAt: v.string(), // ISO 8601 date string
    certificationGoal: v.optional(v.union(v.literal("SMPCC"), v.literal("KAC"), v.literal("KPC"))),
    scores: v.array(
      v.object({
        itemId: v.string(),  // e.g. "rel_rapport"
        score: v.number(),   // 1 ~ 5
      }),
    ),
    overallNotes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "assessedAt"]),

  announcements: defineTable({
    title: v.string(),
    content: v.string(),
    authorId: v.id("users"),
    category: v.union(
      v.literal("general"),    // 일반
      v.literal("important"),  // 중요
      v.literal("event"),      // 행사/이벤트
    ),
    isPinned: v.boolean(),
    isPublished: v.boolean(),
    viewCount: v.number(),
  })
    .index("by_published", ["isPublished"])
    .index("by_pinned", ["isPinned"])
    .index("by_category", ["category"]),

  coachFeedbacks: defineTable({
    traineeId: v.id("users"),
    coachId: v.id("users"),
    feedbackDate: v.string(), // ISO 8601
    rating: v.number(),       // 1~5
    strengths: v.string(),    // 잘한 점
    improvements: v.string(), // 개선할 점
    content: v.optional(v.string()), // 추가 코멘트
    category: v.union(
      v.literal("coaching_skills"),   // 코칭 기술
      v.literal("communication"),     // 소통 능력
      v.literal("self_development"),  // 자기 개발 노력
      v.literal("overall"),           // 종합 평가
    ),
    isRead: v.boolean(),
  })
    .index("by_trainee", ["traineeId"])
    .index("by_coach", ["coachId"])
    .index("by_trainee_and_read", ["traineeId", "isRead"]),

  resources: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("education"),     // 교육자료
      v.literal("form"),          // 양식/서식
      v.literal("guideline"),     // 가이드라인/규정
      v.literal("reference"),     // 참고자료
      v.literal("other"),         // 기타
    ),
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),         // bytes
    mimeType: v.string(),
    uploadedBy: v.id("users"),
    isPublished: v.boolean(),
    downloadCount: v.number(),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_published", ["isPublished"])
    .index("by_category", ["category"])
    .index("by_uploader", ["uploadedBy"]),

  calendarEvents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(), // ISO 8601 date string (YYYY-MM-DD)
    startTime: v.optional(v.string()), // HH:mm
    endTime: v.optional(v.string()),   // HH:mm
    eventType: v.union(
      v.literal("personal"),       // 개인 일정
      v.literal("coaching"),       // 코칭 실습
      v.literal("education"),      // 교육 이수
      v.literal("mentor_coaching"), // 멘토코칭/코더코
      v.literal("shared"),         // 공유 일정 (admin creates)
    ),
    isShared: v.boolean(), // If true, visible to all users
    color: v.optional(v.string()), // custom color hex
  })
    .index("by_user", ["userId"])
    .index("by_date", ["eventDate"])
    .index("by_user_and_date", ["userId", "eventDate"])
    .index("by_shared", ["isShared"]),

  communityPosts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal("general"),       // 자유게시판
      v.literal("question"),      // 질문/답변
      v.literal("sharing"),       // 경험 나눔
      v.literal("resource"),      // 자료 공유
    ),
    isPinned: v.boolean(),
    viewCount: v.number(),
    likeCount: v.number(),
    commentCount: v.number(),
    isDeleted: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_author", ["authorId"])
    .index("by_pinned", ["isPinned"])
    .searchIndex("search_posts", { searchField: "title", filterFields: ["category", "isDeleted"] }),

  communityComments: defineTable({
    postId: v.id("communityPosts"),
    authorId: v.id("users"),
    content: v.string(),
    isDeleted: v.boolean(),
    parentCommentId: v.optional(v.id("communityComments")), // for replies
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"]),

  communityLikes: defineTable({
    postId: v.id("communityPosts"),
    userId: v.id("users"),
  })
    .index("by_post", ["postId"])
    .index("by_post_and_user", ["postId", "userId"])
    .index("by_user", ["userId"]),

  communityBookmarks: defineTable({
    postId: v.id("communityPosts"),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_post_and_user", ["postId", "userId"]),

  // 독후감 제출
  bookReports: defineTable({
    userId: v.id("users"),
    bookTitle: v.string(),       // 책 제목
    author: v.optional(v.string()),
    submittedAt: v.string(),     // ISO 8601
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
    approvalStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "approvalStatus"]),

  // 멘탈코칭 에세이 제출
  coachingEssays: defineTable({
    userId: v.id("users"),
    title: v.string(),
    submittedAt: v.string(),     // ISO 8601
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
    approvalStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "approvalStatus"]),

  // 출석 기록
  attendances: defineTable({
    seminarId: v.id("seminars"),
    cohortId: v.optional(v.id("cohorts")),
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    status: v.union(
      v.literal("present"),   // 출석
      v.literal("absent"),    // 결석
      v.literal("late"),      // 지각
      v.literal("excused"),   // 공결
    ),
    note: v.optional(v.string()),
    recordedBy: v.id("users"),
    selfCheckedIn: v.optional(v.boolean()),
    checkedInAt: v.optional(v.string()),
    dayNumber: v.optional(v.number()),
  })
    .index("by_seminar", ["seminarId"])
    .index("by_cohort_and_user", ["cohortId", "userId"])
    .index("by_seminar_and_user", ["seminarId", "userId"])
    .index("by_user", ["userId"])
    .index("by_seminar_and_user_and_date", ["seminarId", "userId", "date"]),

  // 세미나 일정
  seminars: defineTable({
    cohortId: v.optional(v.id("cohorts")),
    title: v.string(),                // e.g. "1차 세미나"
    sessionNumber: v.number(),        // 회차 번호
    seminarType: v.union(
      v.literal("two_day"),           // 2일 세미나 (월 1회)
      v.literal("one_day"),           // 1일 세미나 (교재학습)
      v.literal("group_coaching"),    // 그룹코칭 (사례나눔)
    ),
    startDate: v.string(),            // ISO 8601 (YYYY-MM-DD)
    endDate: v.string(),              // ISO 8601 (YYYY-MM-DD) - same as startDate for 1-day
    startTime: v.optional(v.string()), // HH:mm
    endTime: v.optional(v.string()),   // HH:mm
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    isOnline: v.optional(v.boolean()), // 교재학습 온/오프라인 구분
    createdBy: v.id("users"),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_cohort_and_date", ["cohortId", "startDate"]),

  // 그룹코칭 그룹 편성
  coachingGroups: defineTable({
    seminarId: v.id("seminars"),
    cohortId: v.id("cohorts"),
    groupNumber: v.number(),         // 1, 2, 3, 4
    groupName: v.string(),           // "A조", "B조", etc.
    memberIds: v.array(v.id("users")),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_seminar", ["seminarId"])
    .index("by_cohort", ["cohortId"]),

  // 기수(코호트) 관리
  cohorts: defineTable({
    name: v.string(),           // e.g. "17기", "18기"
    number: v.number(),         // 17, 18, ...
    term: v.union(v.literal("first"), v.literal("second")), // 상반기/하반기
    startDate: v.string(),      // ISO 8601 date (YYYY-MM-DD)
    endDate: v.string(),        // ISO 8601 date (YYYY-MM-DD)
    status: v.union(
      v.literal("upcoming"),    // 예정
      v.literal("active"),      // 진행중
      v.literal("completed"),   // 완료
    ),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_number", ["number"])
    .index("by_status", ["status"]),

  // 기수-교육생 연결
  cohortMembers: defineTable({
    cohortId: v.id("cohorts"),
    userId: v.id("users"),
    joinedAt: v.string(),       // ISO 8601
    status: v.union(
      v.literal("active"),      // 수강중
      v.literal("completed"),   // 수료
      v.literal("withdrawn"),   // 중도탈락
    ),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_user", ["userId"])
    .index("by_cohort_and_user", ["cohortId", "userId"]),

  // 과정 이수 이력 (센터 개설 과정 + 외부 과정)
  trainingHistory: defineTable({
    userId: v.id("users"),
    courseType: v.union(v.literal("center"), v.literal("external")), // 센터 과정 vs 외부 과정
    centerCourseName: v.optional(v.union(
      v.literal("KAC기본과정"),
      v.literal("KPC심화과정"),
      v.literal("MSPE기본과정"),
      v.literal("SuperVision과정"),
      v.literal("스포츠멘탈코칭강독기본과정"),
      v.literal("스포츠멘탈코칭강독심화과정"),
    )),
    externalCourseName: v.optional(v.string()),
    organizer: v.optional(v.string()),       // 주관 기관/회사
    completionDate: v.string(),              // ISO 8601 (YYYY-MM-DD)
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "courseType"]),

  // 코치 자격증
  coachLicenses: defineTable({
    userId: v.id("users"),
    licenseType: v.union(
      v.literal("KAC"),
      v.literal("KPC"),
      v.literal("KSC"),
      v.literal("ACC"),
      v.literal("PCC"),
      v.literal("MCC"),
      v.literal("other"),
    ),
    otherLicenseName: v.optional(v.string()), // licenseType === "other" 일 때 자격증명
    issuedBy: v.optional(v.string()),         // 발급 기관
    acquiredDate: v.optional(v.string()),     // 취득일 ISO 8601
    expiryDate: v.optional(v.string()),       // 만료일 (선택)
    isActive: v.boolean(),                    // 현재 유효 여부
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"]),

  certificationApplications: defineTable({
    userId: v.id("users"),
    certificationGoal: v.optional(v.union(v.literal("SMPCC"), v.literal("KAC"), v.literal("KPC"))),
    submittedAt: v.string(), // ISO 8601
    status: v.union(
      v.literal("submitted"),    // 신청 완료, 검토 대기
      v.literal("under_review"), // 검토 중
      v.literal("approved"),     // 승인
      v.literal("rejected"),     // 반려
    ),
    personalStatement: v.string(), // 지원 동기 및 각오
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    reviewComment: v.optional(v.string()),
    // Progress snapshot at time of application
    educationHoursAtSubmission: v.number(),
    coachingHoursAtSubmission: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // SMPCC 자격 취득 기록 (인증시험 통과 후 관리자가 등록)
  smpccCertifications: defineTable({
    userId: v.id("users"),
    issuedAt: v.string(),         // 자격 취득일 ISO 8601 (YYYY-MM-DD)
    expiresAt: v.string(),        // 만료일 (취득일 + 3년) ISO 8601 (YYYY-MM-DD)
    status: v.union(
      v.literal("active"),        // 유효
      v.literal("expired"),       // 만료
      v.literal("renewed"),       // 갱신됨 (이전 기록)
    ),
    issuedBy: v.id("users"),      // 등록한 관리자
    notes: v.optional(v.string()),
    // 갱신 시 이전 자격 ID 참조
    renewedFromId: v.optional(v.id("smpccCertifications")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // 멘탈 포럼 (연 4~6회, 참석 시 2시간 인정)
  mentalForums: defineTable({
    title: v.string(),            // 포럼명
    forumDate: v.string(),        // 개최일 ISO 8601 (YYYY-MM-DD)
    startTime: v.optional(v.string()), // HH:mm
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    creditHours: v.number(),      // 인정 시간 (기본 2시간)
    createdBy: v.id("users"),
  })
    .index("by_date", ["forumDate"]),

  // 멘탈 포럼 참석 신청 및 승인
  forumAttendances: defineTable({
    forumId: v.id("mentalForums"),
    userId: v.id("users"),
    appliedAt: v.string(),        // 신청일 ISO 8601
    status: v.union(
      v.literal("pending"),       // 신청 완료, 승인 대기
      v.literal("approved"),      // 승인 (교육시간 인정됨)
      v.literal("rejected"),      // 반려
    ),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_forum", ["forumId"])
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_forum_and_user", ["forumId", "userId"]),

  // 매일 자기 체크인
  dailyCheckIns: defineTable({
    userId: v.id("users"),
    checkInDate: v.string(),       // ISO 8601 (YYYY-MM-DD)
    bodyScore: v.number(),         // 1~10
    mindScore: v.number(),         // 1~10
    passionScore: v.number(),      // 1~10
    message: v.optional(v.string()), // 오늘 자신에게 힘을 주는 한 마디
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "checkInDate"])
    .index("by_date", ["checkInDate"]),


  // BCP (Buddy Coaching Practice) - 버디 코칭 실습
  bcpLogs: defineTable({
    userId: v.id("users"),             // 교육생 (기록 작성자)
    sessionDate: v.string(),           // ISO 8601 date
    buddyId1: v.id("users"),           // 버디 파트너 1 (필수)
    buddyId2: v.optional(v.id("users")), // 버디 파트너 2 (선택)
    myRole: v.union(v.literal("coach"), v.literal("coachee")), // 내 역할
    durationMinutes: v.number(),       // 세션 시간(분)
    location: v.optional(v.string()),  // 장소
    topic: v.string(),                 // 코칭 주제
    content: v.string(),               // 세션 내용 요약
    reflection: v.optional(v.string()), // 성찰
    evidenceStorageId: v.optional(v.id("_storage")),
    approvalStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "approvalStatus"])
    .index("by_approval_status", ["approvalStatus"]),

  courseCredits: defineTable({
    courseKey: v.string(),         // 고유 키 (e.g. "two_day_seminar", "mental_forum")
    courseName: v.string(),        // 표시 이름
    creditHours: v.number(),       // 인정 시간
    description: v.optional(v.string()),
    updatedBy: v.id("users"),
  })
    .index("by_key", ["courseKey"]),

  // Push notification identity mapping (Hercules SDK)
  pushIdentities: defineTable({
    secret: v.string(),     // Subscription secret (unique per device)
    visitorId: v.string(),  // User identifier for targeting notifications
  })
    .index("by_secret", ["secret"])
    .index("by_visitorId", ["visitorId"]),

  // 양재 센터 교육장 예약
  classroomBookings: defineTable({
    userId: v.id("users"),
    bookerName: v.string(),
    date: v.string(), // YYYY-MM-DD
    timeSlot: v.union(v.literal("10:00-12:00"), v.literal("13:00-15:00"), v.literal("16:00-18:00")),
    coachingType: v.union(v.literal("buddy"), v.literal("mentor"), v.literal("supervision")),
    notes: v.optional(v.string()),
    createdAt: v.string(), // ISO string
  })
    .index("by_date_and_slot", ["date", "timeSlot"])
    .index("by_user", ["userId"]),
});
