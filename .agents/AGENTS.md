# MCCI-SMPCC 개발 및 배포 관리 규칙 (AGENTS.md)

이 문서에는 Coachingpass 프로젝트의 SPA 라우팅 트러블슈팅 가이드 및 어드민 역할 전환(Switcher) 구현 시 고려해야 할 설계 규칙이 기록되어 있습니다. 향후 기능 변경이나 웹 앱 고도화 작업 시 이 규칙을 최우선으로 참고하여 반영합니다.

---

## 1. Vercel SPA (Single Page Application) 배포 및 라우팅 규칙
Vercel 환경에서 새로고침 혹은 특정 경로(예: `/dashboard`)로 직접 접근할 때 404 에러나 하얀 화면(Blank Screen)이 발생하는 것을 방지하기 위해 다음 원칙을 고수합니다.

### A. 에셋 하이재킹 방지
* `"cleanUrls": true` 옵션과 와일드카드 리라이트(`/:path*`) 설정을 임의로 조합하지 않습니다. 정적 파일(`.js`, `.css` 등) 요청이 `index.html`로 잘못 리다이렉트되어 JS 구문 오류 크래시를 유발합니다.
* 배포 설정(`vercel.json`)은 항상 다음과 같이 물리 파일(확장자 포함 경로)과 `api` 경로를 제외하고 페이지 URL만 `index.html`로 이송하도록 정규식 필터링을 유지합니다:
```json
{
  "rewrites": [
    {
      "source": "/((?!api|static|.*\\..*$).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 2. Mock Auth 기반 역할(Role) 전환 스위처 연동 규칙
어드민(Admin)이 코치(Coach)나 교육생(Trainee) 역할로 뷰를 전환할 때 데이터베이스 단의 접근 제어(Permission) 에러를 방지하고 프론트엔드와 백엔드의 싱크를 맞추기 위한 개발 지침입니다.

### A. 백엔드 활성 모크 유저 동기화
* 프론트엔드에서 사용자의 역할을 임의로 전환하는 것만으로는 부족하며, Convex 백엔드 데이터베이스 상에서도 해당 모크 유저의 활성화 여부가 업데이트되어야 백엔드 쿼리/뮤테이션 실행 시 `ConvexError`나 `FORBIDDEN` 권한 에러가 발생하지 않습니다.
* 역할 전환 이벤트 발생 시 프론트엔드 UI 상태를 변경함과 동시에, `api.users.setActiveMockUser` 뮤테이션을 함께 호출하여 백엔드 상의 Active Mock User 값을 항상 일치시킵니다.

### B. 캐시 비우기 및 강제 새로고침 유틸리티 보존
* 모바일 기기 웹뷰 또는 PWA(Progressive Web App) 환경에서는 이전의 서비스 워커(Service Worker) 캐시 및 로컬 세션 정보가 꼬여 화면 갱신이 안 되거나 예전 페이지를 강제 호출할 수 있습니다.
* 사이드바 하단 등 접근이 쉬운 경로에 다음 작업을 순차적으로 수행해 주는 **"캐시 비우기 및 새로고침"** 버튼 및 유틸리티 함수를 유지합니다:
  1. 등록된 모든 서비스 워커 해제 (`navigator.serviceWorker.getRegistrations`)
  2. 브라우저 캐시 저장소 비우기 (`caches.keys` 및 `caches.delete`)
  3. 로컬 스토리지 및 세션 스토리지 클리어 (`localStorage.clear`, `sessionStorage.clear`)
  4. 최신 자산을 강제 로드하기 위한 강제 리로드 (`window.location.reload(true)`)
