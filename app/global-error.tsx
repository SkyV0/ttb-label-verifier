"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#faf8f3",
            color: "#1c1b18",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 480,
              textAlign: "center",
              padding: "32px",
              background: "#ffffff",
              borderRadius: 16,
              border: "1px solid #d9d4c4",
              boxShadow: "0 4px 16px rgba(28, 27, 24, 0.08)",
            }}
          >
            <h1 style={{ margin: "0 0 12px 0", fontSize: 22 }}>
              Something went wrong.
            </h1>
            <p style={{ margin: "0 0 24px 0", color: "#5a5650" }}>
              The application encountered an unexpected error. You can reload to
              try again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#b8693d",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
