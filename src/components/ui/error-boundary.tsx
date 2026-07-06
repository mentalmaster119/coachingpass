import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-card border border-destructive/20 rounded-xl shadow-sm my-4 max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-foreground">화면을 불러오는 중 오류가 발생했습니다</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              임시 연결 오류이거나 예기치 않은 시스템 에러일 수 있습니다.
            </p>
          </div>
          {this.state.error && (
            <div className="text-[10px] bg-muted p-2 rounded text-left font-mono max-h-24 overflow-y-auto text-muted-foreground w-full break-all">
              {this.state.error.message}
            </div>
          )}
          <Button
            size="sm"
            onClick={this.handleReset}
            className="gap-1.5 cursor-pointer text-xs h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침 및 재시도
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
