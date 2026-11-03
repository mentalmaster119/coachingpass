import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { reportClientError } from "@/lib/error-tracker.ts";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reported: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    reported: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reported: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    reportClientError(error, {
      componentStack: errorInfo.componentStack || undefined,
      severity: "fatal",
    });
    this.setState({ reported: true });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearCacheAndReload = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-card border border-destructive/25 rounded-2xl shadow-md my-4 max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-foreground">화면을 불러오는 중 오류가 발생했습니다</h3>
            <p className="text-xs text-muted-foreground leading-relaxed break-keep">
              오류 내용이 관측 시스템에 자동 접수되었습니다. 아래 버튼을 눌러 화면을 다시 불러와 주세요.
            </p>
          </div>
          {this.state.error && (
            <div className="text-[10px] bg-muted/60 p-2.5 rounded-lg text-left font-mono max-h-24 overflow-y-auto text-muted-foreground w-full break-all border border-border/50">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
            <Button
              size="sm"
              onClick={this.handleReset}
              className="gap-1.5 cursor-pointer text-xs h-8.5 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              새로고침 및 재시도
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleClearCacheAndReload}
              className="gap-1.5 cursor-pointer text-xs h-8.5 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-3.5 h-3.5" />
              캐시 초기화
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
