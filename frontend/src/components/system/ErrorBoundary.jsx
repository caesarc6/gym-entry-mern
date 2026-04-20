import PropTypes from "prop-types";
import React from "react";

export default class ErrorBoundary extends React.Component {
  static propTypes = {
    children: PropTypes.node,
  };

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Keep a visible error UI for black-screen crashes.
    // Still log to console so devtools shows the stack.
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error?.message || String(this.state.error) || "Unknown error";

    return (
      <div
        style={{
          padding: 16,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
          color: "#111827",
          background: "#f9fafb",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            App crashed
          </div>
          <div style={{ color: "#374151", marginBottom: 12 }}>
            There’s a runtime error preventing the UI from rendering.
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#0b1020",
              color: "#e5e7eb",
              padding: 12,
              borderRadius: 10,
              overflow: "auto",
              margin: 0,
            }}
          >
            {message}
          </pre>
          <div style={{ color: "#6b7280", marginTop: 12, fontSize: 12 }}>
            Open DevTools Console for full stack trace.
          </div>
        </div>
      </div>
    );
  }
}

