"use client";

import { Button } from "@/components/ui/button";
import { useUiPreferences } from "@/components/UiPreferencesProvider";

export default function SidebarScaleControl() {
  const { scale, setScale, adjustScale, minScale, maxScale } = useUiPreferences();

  return (
    <div className="space-y-1">
      <div className="text-s text-muted-foreground px-1">Text Scale</div>
      <div className="grid grid-cols-3 gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustScale(-0.1)}
          aria-label="Decrease text size"
          disabled={scale <= minScale}
        >
          A-
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScale(1)}
          aria-label="Reset text size"
        >
          {Math.round(scale * 100)}%
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustScale(0.1)}
          aria-label="Increase text size"
          disabled={scale >= maxScale}
        >
          A+
        </Button>
      </div>
    </div>
  );
}


