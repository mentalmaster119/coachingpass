import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import AppLayout from "./components/layout/app-layout.tsx";

// Lazy-loaded public & auth routes
const AuthCallback = lazy(() => import("./pages/auth/Callback.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PendingPage = lazy(() => import("./pages/pending/page.tsx"));
const OnboardingPage = lazy(() => import("./pages/onboarding/page.tsx"));
const InviteLandingPage = lazy(() => import("./pages/invite/page.tsx"));
const VerifyCertPage = lazy(() => import("./pages/verify/page.tsx"));

// Lazy-loaded protected routes
const DashboardPage = lazy(() => import("./pages/dashboard/page.tsx"));
const CoachingLogPage = lazy(() => import("./pages/coaching-log/page.tsx"));
const CoachingQualityPage = lazy(() => import("./pages/coaching-quality/page.tsx"));
const MentorCoachingPage = lazy(() => import("./pages/mentor-coaching/page.tsx"));
const MentorsPage = lazy(() => import("./pages/mentors/page.tsx"));
const ProgressPage = lazy(() => import("./pages/progress/page.tsx"));
const TraineeDetailPage = lazy(() => import("./pages/progress/trainee/page.tsx"));
const AdminDashboardPage = lazy(() => import("./pages/admin/page.tsx"));
const AdminUsersPage = lazy(() => import("./pages/admin/users/page.tsx"));
const AdminEducationPage = lazy(() => import("./pages/admin/education/page.tsx"));
const AdminCoachingPage = lazy(() => import("./pages/admin/coaching/page.tsx"));
const AdminMentorCoachingPage = lazy(() => import("./pages/admin/mentor-coaching/page.tsx"));
const AdminAssignmentsPage = lazy(() => import("./pages/admin/assignments/page.tsx"));
const AdminCertificationPage = lazy(() => import("./pages/admin/certification/page.tsx"));
const CoachTraineesPage = lazy(() => import("./pages/coach/trainees/page.tsx"));
const CoachMentoringHistoryPage = lazy(() => import("./pages/coach/mentoring-history/page.tsx"));
const CertificationPage = lazy(() => import("./pages/certification/page.tsx"));
const ReflectionPage = lazy(() => import("./pages/reflection/page.tsx"));
const AnnouncementsPage = lazy(() => import("./pages/announcements/page.tsx"));
const AdminAnnouncementsPage = lazy(() => import("./pages/admin/announcements/page.tsx"));
const CompetencyAssessmentPage = lazy(() => import("./pages/competency/page.tsx"));
const ResourcesPage = lazy(() => import("./pages/resources/page.tsx"));
const AdminResourcesPage = lazy(() => import("./pages/admin/resources/page.tsx"));
const FeedbackPage = lazy(() => import("./pages/feedback/page.tsx"));
const CoachFeedbackPage = lazy(() => import("./pages/coach/feedback/page.tsx"));
const AdminFeedbackPage = lazy(() => import("./pages/admin/feedback/page.tsx"));
const CalendarPage = lazy(() => import("./pages/calendar/page.tsx"));
const ProfilePage = lazy(() => import("./pages/profile/page.tsx"));
const CommunityPage = lazy(() => import("./pages/community/page.tsx"));
const ExportPage = lazy(() => import("./pages/admin/export/page.tsx"));
const AdminCohortsPage = lazy(() => import("./pages/admin/cohorts/page.tsx"));
const AdminSeminarsPage = lazy(() => import("./pages/admin/seminars/page.tsx"));
const AdminAttendancePage = lazy(() => import("./pages/admin/attendance/page.tsx"));
const AdminCompletionPage = lazy(() => import("./pages/admin/completion/page.tsx"));
const AdminReportPage = lazy(() => import("./pages/admin/report/page.tsx"));
const TrainingHistoryPage = lazy(() => import("./pages/training-history/page.tsx"));
const TraineeAttendancePage = lazy(() => import("./pages/attendance/page.tsx"));
const QrCheckInLandingPage = lazy(() => import("./pages/attendance/qr-checkin/page.tsx"));
const SettingsPage = lazy(() => import("./pages/settings/page.tsx"));
const AdminSmpccPage = lazy(() => import("./pages/admin/smpcc/page.tsx"));
const MentalForumPage = lazy(() => import("./pages/mental-forum/page.tsx"));
const DailyCheckInPage = lazy(() => import("./pages/daily-checkin/page.tsx"));
const AdminCheckInPage = lazy(() => import("./pages/admin/checkin/page.tsx"));
const InstallGuidePage = lazy(() => import("./pages/install-guide/page.tsx"));
const AdminTraineeProfilePage = lazy(() => import("./pages/admin/trainee-profile/page.tsx"));
const BcpPage = lazy(() => import("./pages/bcp/page.tsx"));
const AdminBcpPage = lazy(() => import("./pages/admin/bcp/page.tsx"));
const RecognitionStatusPage = lazy(() => import("./pages/recognition-status/page.tsx"));
const SearchPage = lazy(() => import("./pages/search/page.tsx"));
const ClassroomBookingPage = lazy(() => import("./pages/classroom-booking/page.tsx"));
const SupervisionPage = lazy(() => import("./pages/supervision/page.tsx"));
const SubmissionsPage = lazy(() => import("./pages/submissions/page.tsx"));
const AdminCoachingAnalysisPage = lazy(() => import("./pages/admin/coaching-analysis/page.tsx"));

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/25 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground animate-pulse font-medium">화면을 불러오는 중...</span>
      </div>
    </div>
  );
}

export default function App() {
  useServiceWorker();
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Non-layout routes */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<Index />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/invite" element={<InviteLandingPage />} />
            <Route path="/verify/:certNumber" element={<VerifyCertPage />} />

            {/* Protected routes with sidebar layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/practice-group" element={<Navigate to="/coaching-log" replace />} />
              <Route path="/education" element={<Navigate to="/training-history" replace />} />
              <Route path="/coaching-log" element={<CoachingLogPage />} />
              <Route path="/coaching-quality" element={<CoachingQualityPage />} />
              <Route path="/mentor-coaching" element={<MentorCoachingPage />} />
              <Route path="/mentors" element={<MentorsPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/progress/trainee/:userId" element={<TraineeDetailPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/education" element={<AdminEducationPage />} />
              <Route path="/admin/coaching" element={<AdminCoachingPage />} />
              <Route path="/admin/mentor-coaching" element={<AdminMentorCoachingPage />} />
              <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
              <Route path="/admin/certification" element={<AdminCertificationPage />} />
              <Route path="/coach/trainees" element={<CoachTraineesPage />} />
              <Route path="/coach/mentoring-history" element={<CoachMentoringHistoryPage />} />
              <Route path="/certification" element={<CertificationPage />} />
              <Route path="/reflection" element={<ReflectionPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/competency-assessment" element={<CompetencyAssessmentPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/admin/resources" element={<AdminResourcesPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/coach/feedback" element={<CoachFeedbackPage />} />
              <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/admin/export" element={<ExportPage />} />
              <Route path="/admin/cohorts" element={<AdminCohortsPage />} />
              <Route path="/admin/seminars" element={<AdminSeminarsPage />} />
              <Route path="/admin/attendance" element={<AdminAttendancePage />} />
              <Route path="/admin/completion" element={<AdminCompletionPage />} />
              <Route path="/admin/report" element={<AdminReportPage />} />
              <Route path="/training-history" element={<TrainingHistoryPage />} />
              <Route path="/attendance" element={<TraineeAttendancePage />} />
              <Route path="/attendance/qr-checkin" element={<QrCheckInLandingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/smpcc" element={<AdminSmpccPage />} />
              <Route path="/mental-forum" element={<MentalForumPage />} />
              <Route path="/daily-checkin" element={<DailyCheckInPage />} />
              <Route path="/admin/checkin" element={<AdminCheckInPage />} />
              <Route path="/install-guide" element={<InstallGuidePage />} />
              <Route path="/admin/trainee/:userId" element={<AdminTraineeProfilePage />} />
              <Route path="/bcp" element={<BcpPage />} />
              <Route path="/admin/bcp" element={<AdminBcpPage />} />
              <Route path="/recognition-status" element={<RecognitionStatusPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/classroom-booking" element={<ClassroomBookingPage />} />
              <Route path="/supervision" element={<SupervisionPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/admin/coaching-analysis" element={<AdminCoachingAnalysisPage />} />
              <Route path="/admin/coaching-analysis/:userId" element={<AdminCoachingAnalysisPage />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DefaultProviders>
  );
}
