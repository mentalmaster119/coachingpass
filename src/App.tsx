import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import AppLayout from "./components/layout/app-layout.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PendingPage from "./pages/pending/page.tsx";
import OnboardingPage from "./pages/onboarding/page.tsx";
import DashboardPage from "./pages/dashboard/page.tsx";
import AdminDashboardPage from "./pages/admin/page.tsx";
import AdminUsersPage from "./pages/admin/users/page.tsx";
import AdminEducationPage from "./pages/admin/education/page.tsx";
import AdminCoachingPage from "./pages/admin/coaching/page.tsx";
import EducationPage from "./pages/education/page.tsx";
import CoachingLogPage from "./pages/coaching-log/page.tsx";
import ProgressPage from "./pages/progress/page.tsx";
import TraineeDetailPage from "./pages/progress/trainee/page.tsx";
import SettingsPage from "./pages/settings/page.tsx";
import MentorCoachingPage from "./pages/mentor-coaching/page.tsx";
import AdminMentorCoachingPage from "./pages/admin/mentor-coaching/page.tsx";
import AdminAssignmentsPage from "./pages/admin/assignments/page.tsx";
import CoachTraineesPage from "./pages/coach/trainees/page.tsx";
import ReflectionPage from "./pages/reflection/page.tsx";
import CertificationPage from "./pages/certification/page.tsx";
import AdminCertificationPage from "./pages/admin/certification/page.tsx";
import AnnouncementsPage from "./pages/announcements/page.tsx";
import AdminAnnouncementsPage from "./pages/admin/announcements/page.tsx";
import CompetencyAssessmentPage from "./pages/competency/page.tsx";
import ResourcesPage from "./pages/resources/page.tsx";
import AdminResourcesPage from "./pages/admin/resources/page.tsx";
import FeedbackPage from "./pages/feedback/page.tsx";
import CoachFeedbackPage from "./pages/coach/feedback/page.tsx";
import AdminFeedbackPage from "./pages/admin/feedback/page.tsx";
import CalendarPage from "./pages/calendar/page.tsx";
import ProfilePage from "./pages/profile/page.tsx";
import CommunityPage from "./pages/community/page.tsx";
import ExportPage from "./pages/admin/export/page.tsx";
import AdminCohortsPage from "./pages/admin/cohorts/page.tsx";
import AdminSeminarsPage from "./pages/admin/seminars/page.tsx";
import AdminAttendancePage from "./pages/admin/attendance/page.tsx";
import AdminCompletionPage from "./pages/admin/completion/page.tsx";
import AdminReportPage from "./pages/admin/report/page.tsx";
import TrainingHistoryPage from "./pages/training-history/page.tsx";
import TraineeAttendancePage from "./pages/attendance/page.tsx";
import AdminSmpccPage from "./pages/admin/smpcc/page.tsx";
import MentalForumPage from "./pages/mental-forum/page.tsx";
import DailyCheckInPage from "./pages/daily-checkin/page.tsx";
import AdminCheckInPage from "./pages/admin/checkin/page.tsx";
import InstallGuidePage from "./pages/install-guide/page.tsx";
import AdminTraineeProfilePage from "./pages/admin/trainee-profile/page.tsx";
import BcpPage from "./pages/bcp/page.tsx";
import AdminBcpPage from "./pages/admin/bcp/page.tsx";
import RecognitionStatusPage from "./pages/recognition-status/page.tsx";
import SearchPage from "./pages/search/page.tsx";
import ClassroomBookingPage from "./pages/classroom-booking/page.tsx";

export default function App() {
  useServiceWorker();
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          {/* Non-layout routes */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<Index />} />
          <Route path="/pending" element={<PendingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Protected routes with sidebar layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/education" element={<EducationPage />} />
            <Route path="/coaching-log" element={<CoachingLogPage />} />
            <Route path="/mentor-coaching" element={<MentorCoachingPage />} />
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
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
