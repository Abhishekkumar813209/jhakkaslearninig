import { ShieldAlert } from "lucide-react";

export const ReadOnlyBanner = () => {
  return (
    <div className="bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>You are viewing in <strong>read-only mode</strong>. Data modifications are disabled.</span>
    </div>
  );
};
