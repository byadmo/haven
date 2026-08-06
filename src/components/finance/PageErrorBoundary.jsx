import React from "react";

// Per-page error boundary: a crash in one page renders a small retry fallback
// instead of taking down the whole app. Used by KeepAliveOutlet so each kept-
// alive page instance is isolated. Pure resilience — no effect on the happy
// path.
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
     
    console.error("[PageErrorBoundary]", err, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: "60vh" }}>
          <p className="text-sm text-white/70 mb-1">Something went wrong loading this page.</p>
          <p className="text-xs text-white/40 mb-4">Your data is safe. Try again.</p>
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg border border-emerald-400/30 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}