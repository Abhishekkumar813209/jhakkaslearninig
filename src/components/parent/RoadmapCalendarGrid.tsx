import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DailyTopicProgress {
  date: string;
  day_number: number;
  subject: string;
  chapter: string;
  topic_name: string;
  is_completed: boolean;
  completed_at: string | null;
  games_completed: number;
}

interface RoadmapCalendarGridProps {
  dailyProgress: Record<string, Record<string, DailyTopicProgress[]>>;
}

export function RoadmapCalendarGrid({ dailyProgress }: RoadmapCalendarGridProps) {
  const dates = useMemo(() => Object.keys(dailyProgress).sort(), [dailyProgress]);
  const subjects = useMemo(() => {
    const s = new Set<string>();
    for (const d of Object.keys(dailyProgress)) {
      for (const sub of Object.keys(dailyProgress[d])) s.add(sub);
    }
    return Array.from(s).sort();
  }, [dailyProgress]);

  const [openCells, setOpenCells] = useState<Record<string, boolean>>({});
  const toggleCell = (key: string) => setOpenCells((p) => ({ ...p, [key]: !p[key] }));

  if (dates.length === 0 || subjects.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      weekday: "short",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Learning Calendar</CardTitle>
        <CardDescription>Date-wise roadmap topics by subject with submission status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="min-w-[720px] grid"
            style={{ gridTemplateColumns: `220px repeat(${subjects.length}, minmax(220px, 1fr))` }}
          >
            {/* Header Row */}
            <div className="px-3 py-2 text-sm font-medium border-b">Date</div>
            {subjects.map((s) => (
              <div key={s} className="px-3 py-2 text-sm font-medium border-b">
                {s}
              </div>
            ))}

            {dates.map((date) => (
              <React.Fragment key={date}>
                {/* Date Cell */}
                <div className={`px-3 py-4 border-r border-b bg-muted/30 ${date === today ? "bg-primary/10" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatDate(date)}</span>
                    {date === today && <Badge variant="default">Today</Badge>}
                  </div>
                </div>

                {/* Subject Cells */}
                {subjects.map((subject) => {
                  const topics = dailyProgress[date]?.[subject] || [];
                  const total = topics.length;
                  const done = topics.filter((t) => t.is_completed).length;
                  const key = `${date}-${subject}`;

                  const cellState = total === 0
                    ? "empty"
                    : done === total
                    ? "done"
                    : done === 0
                    ? "pending"
                    : "partial";

                  const bg =
                    cellState === "done"
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : cellState === "pending"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      : cellState === "partial"
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                      : "bg-muted/30 border-muted";

                  return (
                    <div key={subject} className={`px-3 py-3 border-b ${subjects[subjects.length - 1] !== subject ? "border-r" : ""}`}>
                      {total === 0 ? (
                        <div className="text-sm text-muted-foreground">—</div>
                      ) : (
                        <div className={`rounded-lg border p-3 ${bg}`}>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium truncate">
                              {topics[0]?.chapter || topics[0]?.topic_name}
                            </div>
                            <div className="text-xs text-muted-foreground ml-2">
                              {done}/{total}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCell(key)}
                            className="mt-2 text-xs text-primary inline-flex items-center gap-1"
                          >
                            {openCells[key] ? (
                              <>
                                Hide Topics <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Show Topics ({total}) <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </button>
                          {openCells[key] && (
                            <ul className="mt-2 space-y-1">
                              {topics.map((t, i) => (
                                <li
                                  key={`${t.topic_name}-${i}`}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="truncate">{t.topic_name}</span>
                                  <Badge
                                    className={
                                      t.is_completed
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-red-600 hover:bg-red-700"
                                    }
                                  >
                                    {t.is_completed ? "Submitted" : "Pending"}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
