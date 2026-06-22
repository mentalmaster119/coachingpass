import { mutation } from "./mockAuth";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Clear existing data
    const tables = [
      "users",
      "coachingLogs",
      "educationRecords",
      "notifications",
      "reflectionJournals",
      "mentorCoachingLogs",
      "competencyAssessments",
      "announcements",
      "coachFeedbacks",
      "resources",
      "calendarEvents",
      "communityPosts",
      "communityComments",
      "communityLikes",
      "communityBookmarks",
      "bookReports",
      "coachingEssays",
      "attendances",
      "seminars",
      "coachingGroups",
      "cohorts",
      "cohortMembers",
      "trainingHistory",
      "coachLicenses",
      "certificationApplications",
      "smpccCertifications",
      "mentalForums",
      "forumAttendances",
      "dailyCheckIns",
      "bcpLogs",
      "courseCredits",
      "pushIdentities"
    ] as const;

    console.log("Clearing all collections...");
    for (const table of tables) {
      try {
        const items = await ctx.db.query(table).collect();
        for (const item of items) {
          await ctx.db.delete(item._id);
        }
      } catch (err) {
        console.error(`Failed to clear table ${table}:`, err);
      }
    }

    console.log("Seeding users...");
    // 2. Create Users
    const coachId = await ctx.db.insert("users", {
      tokenIdentifier: "coach-token",
      name: "김동식 코치",
      email: "coach_kds@mcci.com",
      role: "senior_coach",
      approvalStatus: "approved",
      onboardingCompleted: true,
      bio: "국제멘탈코칭센터 Senior Coach / 스포츠 심리학 박사",
      phone: "010-1234-5678",
      specializations: ["골프", "야구", "집중력 조절"],
      coachingStyle: "선수 중심의 자발적 동기 부여 및 루틴 설계"
    });

    const traineeId = await ctx.db.insert("users", {
      tokenIdentifier: "mock-token-identifier",
      name: "테스트 코치",
      email: "coach@test.com",
      role: "trainee",
      approvalStatus: "approved",
      onboardingCompleted: true,
      assignedCoachId: coachId,
      bio: "SMPCC 18기 교육생 / 성장의 기록을 시각화합니다.",
      phone: "010-9876-5432",
      specializations: ["축구", "멘탈 케어", "부상 복귀 마인드셋"],
      joinedAt: "2026-03-01T00:00:00Z",
      mbti: "ENFJ",
      motivationalMessage: "매일 한 발짝 성장하는 코치가 되자!"
    });

    const adminId = await ctx.db.insert("users", {
      tokenIdentifier: "admin-token",
      name: "박철수",
      email: "mentalmaster119@gmail.com",
      role: "admin",
      approvalStatus: "approved",
      onboardingCompleted: true
    });

    const buddyId = await ctx.db.insert("users", {
      tokenIdentifier: "buddy-token",
      name: "박민우 교육생",
      email: "buddy@test.com",
      role: "trainee",
      approvalStatus: "approved",
      onboardingCompleted: true,
      assignedCoachId: coachId
    });

    console.log("Seeding cohorts and seminars...");
    // 3. Create Cohort
    const cohortId = await ctx.db.insert("cohorts", {
      name: "18기",
      number: 18,
      term: "second",
      startDate: "2026-03-01",
      endDate: "2026-08-31",
      status: "active",
      createdBy: adminId,
      description: "2026년 하반기 MCCI-SMPCC 전문가 양성 과정"
    });

    // 4. Link members to Cohort
    await ctx.db.insert("cohortMembers", {
      cohortId,
      userId: traineeId,
      joinedAt: "2026-03-01T09:00:00Z",
      status: "active"
    });
    await ctx.db.insert("cohortMembers", {
      cohortId,
      userId: buddyId,
      joinedAt: "2026-03-01T09:00:00Z",
      status: "active"
    });

    // 5. Create Seminars
    const s1 = await ctx.db.insert("seminars", {
      cohortId,
      title: "1차 세미나 (이론 및 기초)",
      sessionNumber: 1,
      seminarType: "two_day",
      startDate: "2026-03-10",
      endDate: "2026-03-11",
      createdBy: adminId,
      location: "MCCI 교육장 1",
      isOnline: false
    });

    const s2 = await ctx.db.insert("seminars", {
      cohortId,
      title: "2차 세미나 (대화 모델 실습)",
      sessionNumber: 2,
      seminarType: "two_day",
      startDate: "2026-04-12",
      endDate: "2026-04-13",
      createdBy: adminId,
      location: "MCCI 교육장 1",
      isOnline: false
    });

    const s3 = await ctx.db.insert("seminars", {
      cohortId,
      title: "3차 세미나 (상황별 코칭 설계)",
      sessionNumber: 3,
      seminarType: "two_day",
      startDate: "2026-05-15",
      endDate: "2026-05-16",
      createdBy: adminId,
      location: "MCCI 교육장 2",
      isOnline: false
    });

    const s4 = await ctx.db.insert("seminars", {
      cohortId,
      title: "4차 세미나 (실기 시뮬레이션)",
      sessionNumber: 4,
      seminarType: "two_day",
      startDate: "2026-06-18",
      endDate: "2026-06-19",
      createdBy: adminId,
      location: "MCCI 교육장 1",
      isOnline: false
    });

    // 오늘(2026-06-22) 진행되는 5차 세미나 추가 (출석 테스트용)
    const s5 = await ctx.db.insert("seminars", {
      cohortId,
      title: "5차 세미나 (피드백 및 수료 준비)",
      sessionNumber: 5,
      seminarType: "two_day",
      startDate: "2026-06-22",
      endDate: "2026-06-23",
      createdBy: adminId,
      location: "MCCI 대강당",
      isOnline: false
    });

    // 6. Seed Attendances
    // 테스트 코치 출석 기록 (1~4차 출석 완료, 각 세미나의 이틀 모두 참석)
    await ctx.db.insert("attendances", { seminarId: s1, cohortId, userId: traineeId, date: "2026-03-10", status: "present", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s1, cohortId, userId: traineeId, date: "2026-03-11", status: "present", recordedBy: adminId });
    
    await ctx.db.insert("attendances", { seminarId: s2, cohortId, userId: traineeId, date: "2026-04-12", status: "present", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s2, cohortId, userId: traineeId, date: "2026-04-13", status: "present", recordedBy: adminId });
    
    await ctx.db.insert("attendances", { seminarId: s3, cohortId, userId: traineeId, date: "2026-05-15", status: "present", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s3, cohortId, userId: traineeId, date: "2026-05-16", status: "present", recordedBy: adminId });
    
    await ctx.db.insert("attendances", { seminarId: s4, cohortId, userId: traineeId, date: "2026-06-18", status: "present", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s4, cohortId, userId: traineeId, date: "2026-06-19", status: "present", recordedBy: adminId });

    // 박민우 교육생 출석 기록 (다양한 샘플 데이터)
    // s1: 양일 출석
    await ctx.db.insert("attendances", { seminarId: s1, cohortId, userId: buddyId, date: "2026-03-10", status: "present", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s1, cohortId, userId: buddyId, date: "2026-03-11", status: "present", recordedBy: adminId });
    
    // s2: Day 1 지각, Day 2 출석
    await ctx.db.insert("attendances", { seminarId: s2, cohortId, userId: buddyId, date: "2026-04-12", status: "late", note: "교통 정체로 인해 20분 지각", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s2, cohortId, userId: buddyId, date: "2026-04-13", status: "present", recordedBy: adminId });
    
    // s3: 양일 결석
    await ctx.db.insert("attendances", { seminarId: s3, cohortId, userId: buddyId, date: "2026-05-15", status: "absent", note: "개인 건강 문제로 불참", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s3, cohortId, userId: buddyId, date: "2026-05-16", status: "absent", note: "개인 건강 문제로 불참", recordedBy: adminId });
    
    // s4: Day 1 공결, Day 2 출석
    await ctx.db.insert("attendances", { seminarId: s4, cohortId, userId: buddyId, date: "2026-06-18", status: "excused", note: "소속팀 훈련 공식 참가로 인한 공결", recordedBy: adminId });
    await ctx.db.insert("attendances", { seminarId: s4, cohortId, userId: buddyId, date: "2026-06-19", status: "present", recordedBy: adminId });

    console.log("Seeding training history and education records...");
    // 7. Seed Training History
    await ctx.db.insert("trainingHistory", {
      userId: traineeId,
      courseType: "center",
      centerCourseName: "KAC기본과정",
      completionDate: "2025-05-20",
      notes: "KAC 자격 취득을 위한 기본 과정 수료"
    });
    await ctx.db.insert("trainingHistory", {
      userId: traineeId,
      courseType: "center",
      centerCourseName: "KPC심화과정",
      completionDate: "2025-10-15",
      notes: "KPC 자격 취득을 위한 심화 과정 수료"
    });

    // 8. Seed Education Records (for SMPCC certification)
    await ctx.db.insert("educationRecords", {
      userId: traineeId,
      educationName: "스포츠 멘탈코칭 핵심 원리",
      institution: "국제멘탈코칭센터",
      educationDate: "2026-03-20",
      hours: 10,
      approvalStatus: "approved",
      reviewedBy: adminId
    });
    await ctx.db.insert("educationRecords", {
      userId: traineeId,
      educationName: "선수 심리 조절 및 이완 요법 실무",
      institution: "국제멘탈코칭센터",
      educationDate: "2026-04-18",
      hours: 15,
      approvalStatus: "approved",
      reviewedBy: adminId
    });
    await ctx.db.insert("educationRecords", {
      userId: traineeId,
      educationName: "팀 다이내믹스 그룹 코칭 워크숍",
      institution: "국제멘탈코칭센터",
      educationDate: "2026-05-22",
      hours: 15,
      approvalStatus: "approved",
      reviewedBy: adminId
    });
    await ctx.db.insert("educationRecords", {
      userId: traineeId,
      educationName: "멘탈 포럼 - 엘리트 스포츠와 멘탈 루틴",
      institution: "국제멘탈코칭센터",
      educationDate: "2026-06-10",
      hours: 5,
      approvalStatus: "pending"
    });

    console.log("Seeding coaching logs...");
    // 9. Seed Coaching Logs
    // Approved Logs (needs ~40 hours for SMPCC)
    await ctx.db.insert("coachingLogs", {
      userId: traineeId,
      coachingDate: "2026-03-15",
      durationMinutes: 60,
      coachingType: "individual",
      coacheeInfo: "김철수 (고교 야구 투수)",
      coacheeGender: "male",
      coacheeAge: 18,
      coacheePersonality: "신중하고 완벽주의 성향",
      coacheeType: ["athlete"],
      ncpClientCategory: "athlete",
      coacheeField: "야구",
      topic: "경기 중 입스(Yips) 불안 극복 및 초점 전환",
      goals: "마운드 위에서 실점 후 평온함 유지 및 주의 집중 회복",
      summary: "선수의 경기 상황 중 불안 유발 요인을 분석하고 심호흡 앵커링을 설정하여 다음 투구 전 초점 전환 연습을 가졌음.",
      techniquesUsed: ["호흡 조절", "앵커링", "루틴 설정"],
      approvalStatus: "approved",
      reviewedBy: coachId
    });

    await ctx.db.insert("coachingLogs", {
      userId: traineeId,
      coachingDate: "2026-03-24",
      durationMinutes: 120,
      coachingType: "group",
      coacheeInfo: "팀 한강 축구 클럽 (11명)",
      coacheeType: ["athlete"],
      ncpClientCategory: "athlete",
      coacheeField: "축구",
      topic: "시즌 개막 전 원팀 스피릿 구축 및 전술적 소통",
      goals: "선수 간 비난을 멈추고 지지적인 소통 규칙 설계",
      summary: "서로의 강점 카드 찾기 세션을 진행하고, 실수 발생 시 팀이 즉각 사용할 수 있는 긍정 구호('다음 플레이!')를 도출함.",
      techniquesUsed: ["강점 탐색", "팀 빌딩", "팀 그라운드 룰"],
      approvalStatus: "approved",
      reviewedBy: coachId
    });

    await ctx.db.insert("coachingLogs", {
      userId: traineeId,
      coachingDate: "2026-04-05",
      durationMinutes: 60,
      coachingType: "individual",
      coacheeInfo: "이영희 (프로 골퍼)",
      coacheeGender: "female",
      coacheeAge: 24,
      coacheeType: ["athlete"],
      ncpClientCategory: "athlete",
      coacheeField: "골프",
      topic: "퍼팅 입스 극복을 위한 동작 루틴 최적화",
      goals: "퍼팅 스트로크 전 불필요한 의심 차단 및 셋업 루틴 일관화",
      summary: "퍼팅 전 어드레스 시점을 트리거로 설정하고, 1-2-3 템포에 맞추어 볼만을 주시하는 시각 고정 기법을 이식함.",
      techniquesUsed: ["루틴 설정", "시각화", "초점 제어"],
      approvalStatus: "approved",
      reviewedBy: coachId
    });

    await ctx.db.insert("coachingLogs", {
      userId: traineeId,
      coachingDate: "2026-04-20",
      durationMinutes: 60,
      coachingType: "individual",
      coacheeInfo: "최성진 (실업 사격 선수)",
      coacheeGender: "male",
      coacheeAge: 27,
      coacheeType: ["athlete"],
      ncpClientCategory: "athlete",
      coacheeField: "사격",
      topic: "격발 전 고조되는 심박수 안정화 및 격발 리듬 구축",
      goals: "격발 호흡 주기의 안정화 및 집중 조준선 정렬 유지",
      summary: "날숨의 끝에서 심장 박동 간 조준을 완료하는 바이오피드백 기반 심상 훈련을 반복하고, 선수 특유의 조준 트리거를 정의함.",
      techniquesUsed: ["호흡법", "심상 기법", "수행 루틴"],
      approvalStatus: "approved",
      reviewedBy: coachId
    });

    // Pending Log
    await ctx.db.insert("coachingLogs", {
      userId: traineeId,
      coachingDate: "2026-05-15",
      durationMinutes: 60,
      coachingType: "individual",
      coacheeInfo: "강수민 (양궁 청소년 대표)",
      coacheeGender: "female",
      coacheeAge: 16,
      coacheeType: ["athlete"],
      ncpClientCategory: "athlete",
      coacheeField: "양궁",
      topic: "바람 등 외부 환경 변화에 대한 흔들림 통제",
      goals: "바람이 불 때 슈팅 타이밍을 늦추지 않고 결단력 있게 격발",
      summary: "바람이 부는 환경을 수용하고, 타겟과의 일치 여부 대신 자신의 슈팅 메커니즘 동작에만 전념하도록 주의 집중 전환 유도.",
      techniquesUsed: ["수용과 전념", "행동 초점"],
      approvalStatus: "pending"
    });

    // Draft Log
    await ctx.db.insert("coachingLogs", {
      userId: traineeId,
      coachingDate: "2026-06-21",
      durationMinutes: 60,
      coachingType: "individual",
      coacheeInfo: "김민우 (주니어 테니스)",
      coacheeGender: "male",
      coacheeAge: 14,
      coacheeType: ["athlete"],
      ncpClientCategory: "athlete",
      coacheeField: "테니스",
      topic: "더블 폴트 실점 후 급해지는 템포 조절",
      goals: "서브 전 공 튕기기 루틴의 횟수(5회) 준수 및 마음 정돈",
      summary: "더블 폴트 이후 자책이 심해지며 다음 포인트 시작 속도가 빨라지는 경향 식별. 타월로 땀을 닦는 행위를 '리셋' 앵커로 도입 설계 중.",
      techniquesUsed: ["자가 조절", "템포 관리"],
      approvalStatus: "draft"
    });

    console.log("Seeding BCP logs...");
    // 10. Seed BCP Logs (Buddy Coaching Practice)
    await ctx.db.insert("bcpLogs", {
      userId: traineeId,
      sessionDate: "2026-03-25",
      buddyId1: buddyId,
      myRole: "coach",
      durationMinutes: 60,
      topic: "멘탈 코치로서의 지향점 및 나의 독창적 코칭 모델 설계",
      content: "동료 박민우 코치와 멘탈코칭 실습을 통해 내가 가진 최대 강점(경청 및 정서 지지)을 녹여낸 나만의 스포츠 멘탈코칭 프레임워크를 도출함.",
      approvalStatus: "approved",
      reviewedBy: adminId
    });

    await ctx.db.insert("bcpLogs", {
      userId: traineeId,
      sessionDate: "2026-04-08",
      buddyId1: buddyId,
      myRole: "coachee",
      durationMinutes: 60,
      topic: "학업과 멘탈코칭 실습 기록 관리 병행의 어려움 극복",
      content: "박민우 코치의 세션을 받으면서, 주 단위 일정의 고정 블록을 설정하고 매일 10분 체크인을 강제 루틴화하는 구체적인 실천 전략을 수립함.",
      approvalStatus: "approved",
      reviewedBy: adminId
    });

    await ctx.db.insert("bcpLogs", {
      userId: traineeId,
      sessionDate: "2026-05-24",
      buddyId1: buddyId,
      myRole: "coach",
      durationMinutes: 60,
      topic: "실패에 대한 공포로 시도를 주저하는 심리적 장벽 해소",
      content: "버디의 고민인 '실패 두려움'을 인지 왜곡 질문법을 이용해 해체하고, 배움의 프레임으로 리프레이밍하도록 대화를 설계 및 진행함.",
      approvalStatus: "pending"
    });

    console.log("Seeding mentor coaching logs...");
    // 11. Seed Mentor Coaching Logs
    await ctx.db.insert("mentorCoachingLogs", {
      userId: traineeId,
      sessionDate: "2026-03-30",
      sessionType: "mentor_coaching",
      coachName: "김동식 슈퍼바이저",
      durationMinutes: 60,
      topic: "1차 야구 투수 코칭 세션에 대한 1:1 슈퍼비전",
      content: "김철수 선수와의 1회차 녹음 파일을 토대로 대화 흐름을 분석함. 코칭 초반 코치 주도의 질문이 너무 많아 선수가 열린 답변을 할 기회가 부족했음을 성찰하고 다음 세션 개방형 질문 리스트를 작성함.",
      approvalStatus: "approved",
      reviewedBy: coachId
    });

    await ctx.db.insert("mentorCoachingLogs", {
      userId: traineeId,
      sessionDate: "2026-05-10",
      sessionType: "coder_co",
      coachName: "김동식 슈퍼바이저",
      durationMinutes: 120,
      topic: "그룹 코칭 세션 및 원팀 스피릿 구축 활동 피드백",
      content: "중학교 축구부 A팀 대상 그룹코칭의 구조화 방법을 피드백 받음. 선수들의 갈등 상황을 회피하지 않고 안전한 피드백 공간으로 승화시키는 진행 역량을 높이 평가받음.",
      approvalStatus: "approved",
      reviewedBy: coachId
    });

    await ctx.db.insert("mentorCoachingLogs", {
      userId: traineeId,
      sessionDate: "2026-06-15",
      sessionType: "mentor_coaching",
      coachName: "김동식 슈퍼바이저",
      durationMinutes: 60,
      topic: "양궁 청소년 대표 수행 루틴 수립 개입안 검토",
      content: "긴장 상황 시 셋업 동작을 단순화하려는 계획의 타당성을 논의함. 복잡한 신체 제어 단계를 단순한 2가지 키워드('단단하게', '부드럽게')로 축약하는 방안을 슈퍼바이저에게 제안하여 승인받음.",
      approvalStatus: "pending"
    });

    console.log("Seeding daily check-ins...");
    // 12. Seed Daily Check-ins (Last 7 days)
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const checkInDate = new Date(today);
      checkInDate.setDate(today.getDate() - i);
      const dateString = checkInDate.toISOString().split("T")[0];

      // Add variety to scores
      const bodyScore = 6 + (i % 4);
      const mindScore = 5 + ((i * 2) % 6);
      const passionScore = 7 + (i % 3);

      const messages = [
        "오늘 하루도 나에게 집중하기!",
        "부담감을 호기심으로 바꾸어보자.",
        "충분한 휴식을 취했으니 오늘은 강한 훈련이다.",
        "동료들과의 대화에서 큰 힘을 얻었다.",
        "내가 통제할 수 있는 것에 집중하자.",
        "피드백은 좌절이 아닌 배움의 신호이다.",
        "선수들과 동행하며 함께 호흡하는 코치가 되기."
      ];

      await ctx.db.insert("dailyCheckIns", {
        userId: traineeId,
        checkInDate: dateString,
        bodyScore,
        mindScore,
        passionScore,
        message: messages[i]
      });
    }

    console.log("Seeding weekly reflection journals...");
    // 13. Seed Reflection Journals
    await ctx.db.insert("reflectionJournals", {
      userId: traineeId,
      entryDate: "2026-06-05",
      title: "선수의 두려움을 성장의 트리거로 바꾸기",
      content: "멘탈 코치로서 선수가 털어놓는 솔직한 두려움을 어떻게 대면해야 하는지 깊이 성찰했다. 두려움을 억누르라고 요구하는 것이 아닌, 그 두려움을 관찰하고 스스로 이길 수 있는 맞춤 루틴을 설계해 주는 것이 진정한 동행임을 다시 깨닫는다.",
      relatedType: "coaching",
      mood: "good"
    });

    await ctx.db.insert("reflectionJournals", {
      userId: traineeId,
      entryDate: "2026-06-12",
      title: "조급한 답변에서 침묵의 경청으로",
      content: "최근 세션에서 선수가 고민을 말할 때 마음 깊이 조급함이 올라왔다. 김동식 슈퍼바이저님의 '코치가 먼저 정답을 주지 말라'는 멘토링이 기억났다. 3초간 머물고, 선수가 스스로 생각할 수 있도록 대화의 문을 활짝 열어주는 훈련을 계속하겠다.",
      relatedType: "mentor_coaching",
      mood: "great"
    });

    console.log("Seeding competency assessment...");
    // 14. Seed Competency Assessment
    await ctx.db.insert("competencyAssessments", {
      userId: traineeId,
      assessedAt: "2026-06-01T10:00:00Z",
      certificationGoal: "SMPCC",
      scores: [
        { itemId: "active_listening", score: 4 },
        { itemId: "powerful_questioning", score: 3 },
        { itemId: "creating_awareness", score: 4 },
        { itemId: "trust_intimacy", score: 5 },
        { itemId: "presence", score: 4 },
        { itemId: "goal_setting", score: 4 },
        { itemId: "routine_design", score: 5 },
        { itemId: "empathy_building", score: 5 }
      ],
      overallNotes: "대화 모델 경청 능력 및 친밀함 형성이 탁월하며, 강력한 질문 및 피드백 기술에서 정교함을 조금 더 다듬는 것을 권장함."
    });

    console.log("Seeding announcements and calendar events...");
    // 15. Seed Announcements
    await ctx.db.insert("announcements", {
      title: "[중요] 18기 MCCI-SMPCC 자격 이수 요건 충족 마감 및 자격시험 안내",
      content: "18기 교육생 여러분, 자격 취득을 위해 코칭 실습 40시간(개인 30시간 이상), 멘토코칭/코더코 10시간, 교육 이수 40시간 및 성찰 일지 충족 마감일은 2026년 8월 25일까지입니다. 기한을 반드시 엄수하여 본 시스템에 승인 신청을 완료해 주시기 바랍니다.",
      authorId: adminId,
      category: "important",
      isPinned: true,
      isPublished: true,
      viewCount: 78
    });

    await ctx.db.insert("announcements", {
      title: "6월 스포츠 멘탈코칭 참관 참인정 멘탈 포럼 안내 (2026-06-25)",
      content: "6월 25일 개최 예정인 멘탈 포럼의 주제는 '양궁 대표팀의 격발 전 동작 고정 심상 요법'입니다. 참관 희망자는 시스템을 통해 사전에 신청해 주시기 바라며, 승인 완료 시 2시간의 멘탈 포럼 교육 인정 시간이 주어집니다.",
      authorId: adminId,
      category: "event",
      isPinned: false,
      isPublished: true,
      viewCount: 42
    });

    // 16. Seed Calendar Events
    await ctx.db.insert("calendarEvents", {
      userId: traineeId,
      title: "김철수 선수 5회차 개인 코칭",
      description: "경기불안 해소 훈련 및 앵커링 실전 적용 점검",
      eventDate: "2026-06-23",
      startTime: "14:00",
      endTime: "15:00",
      eventType: "coaching",
      isShared: false
    });

    await ctx.db.insert("calendarEvents", {
      userId: traineeId,
      title: "김동식 코치님 1:1 멘토 코칭",
      description: "청소년 대표 슈팅 루틴 설계 및 코칭 모델 점검",
      eventDate: "2026-06-24",
      startTime: "16:00",
      endTime: "17:00",
      eventType: "mentor_coaching",
      isShared: false
    });

    await ctx.db.insert("calendarEvents", {
      userId: traineeId,
      title: "6월 MCCI 스포츠 멘탈 포럼",
      description: "양궁 대표팀 멘탈 루틴 사례 발표 참관",
      eventDate: "2026-06-25",
      startTime: "19:00",
      endTime: "21:00",
      eventType: "shared",
      isShared: true
    });

    console.log("Seeding classroom bookings...");
    // 17. Seed Classroom Bookings
    await ctx.db.insert("classroomBookings", {
      userId: buddyId,
      bookerName: "박민우 교육생",
      date: "2026-06-22",
      timeSlot: "10:00-12:00",
      coachingType: "buddy",
      notes: "18기 버디코칭 1회차 실습",
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("classroomBookings", {
      userId: traineeId,
      bookerName: "테스트 코치",
      date: "2026-06-22",
      timeSlot: "13:00-15:00",
      coachingType: "mentor",
      notes: "김동식 코치님과 1:1 멘토코칭 세션",
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("classroomBookings", {
      userId: buddyId,
      bookerName: "박민우 교육생",
      date: "2026-06-23",
      timeSlot: "16:00-18:00",
      coachingType: "supervision",
      notes: "슈퍼바이저 참관 피드백 세션",
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("classroomBookings", {
      userId: traineeId,
      bookerName: "테스트 코치",
      date: "2026-06-24",
      timeSlot: "10:00-12:00",
      coachingType: "buddy",
      notes: "버디코칭 2회차 실습",
      createdAt: new Date().toISOString(),
    });

    console.log("Seeding complete!");
    return { success: true, message: "Mock data successfully seeded!" };
  }
});
