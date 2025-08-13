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
    // Log the error to an error reporting service if desired
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground p-6">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          {error?.digest && (
            <div className="text-xs text-muted-foreground">Error id: {error.digest}</div>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}


