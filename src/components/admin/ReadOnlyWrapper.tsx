import React, { useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Wraps admin content area. In read-only mode, intercepts clicks on
 * interactive mutation elements (buttons, selects, switches, inputs)
 * and shows a toast instead of allowing the action.
 * 
 * Read-only elements like search inputs and scroll are NOT blocked.
 */
export const ReadOnlyWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isReadOnly } = useAuth();
  const { toast } = useToast();
  const lastToastRef = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isReadOnly) return;

      const target = e.target as HTMLElement;
      const interactiveEl = target.closest(
        'button, [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], [data-radix-collection-item]'
      );

      if (!interactiveEl) return;

      // Allow sidebar navigation and tab switching (non-mutation clicks)
      const isSidebarOrNav = interactiveEl.closest(
        '[data-sidebar], nav, [role="tablist"], [data-radix-scroll-area-viewport]'
      );
      if (isSidebarOrNav) return;

      // Allow collapsible triggers, accordion triggers (read-only UI interactions)
      const isUIToggle = interactiveEl.closest(
        '[data-state="open"], [data-state="closed"]'
      );
      const isCollapsible = interactiveEl.hasAttribute('data-radix-collapsible-trigger') ||
        interactiveEl.closest('[data-radix-collapsible-trigger]');
      if (isCollapsible) return;

      // Allow search buttons (they have Search icon or "Search" text)
      const text = interactiveEl.textContent?.trim().toLowerCase() ?? '';
      if (text === 'search' || text.startsWith('search')) return;

      // Allow filter/view toggles
      if (text === 'filter' || text === 'filters' || text === 'view') return;

      // Block mutation actions
      e.preventDefault();
      e.stopPropagation();

      // Throttle toast (max once per 2s)
      const now = Date.now();
      if (now - lastToastRef.current > 2000) {
        lastToastRef.current = now;
        toast({
          title: "Read-Only Mode",
          description: "You have read-only access. Data modifications are disabled.",
          variant: "destructive",
        });
      }
    },
    [isReadOnly, toast]
  );

  if (!isReadOnly) {
    return <>{children}</>;
  }

  return (
    <div onClickCapture={handleClick} className="read-only-admin">
      <style>{`
        .read-only-admin button:not([data-sidebar] button):not(nav button):not([role="tablist"] button),
        .read-only-admin [role="switch"],
        .read-only-admin [role="checkbox"] {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .read-only-admin [data-sidebar] button,
        .read-only-admin nav button {
          opacity: 1;
          cursor: pointer;
        }
      `}</style>
      {children}
    </div>
  );
};
