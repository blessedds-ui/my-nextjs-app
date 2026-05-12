import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { getDemoTasksPayload } from "@/lib/demo-data";
import { graphFetch, type GraphTodoTask } from "@/lib/graph";
import { reminderHoursFromSeed } from "@/lib/stable-reminder";

type List = { id: string; displayName: string };
type RawTask = {
  id: string;
  title: string;
  status: string;
  importance: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  dueDateTime?: { dateTime: string; timeZone: string };
  reminderDateTime?: { dateTime: string; timeZone: string };
};

function defaultSuggestedDue(created?: string, modified?: string): string {
  const base = new Date(created || modified || Date.now()).getTime();
  return new Date(base + 48 * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.isDemo) {
    return NextResponse.json(getDemoTasksPayload());
  }

  const token = session.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lists = await graphFetch<{ value: List[] }>(token, "/me/todo/lists");
    const out: GraphTodoTask[] = [];

    for (const list of lists.value ?? []) {
      const tasks = await graphFetch<{ value: RawTask[] }>(
        token,
        `/me/todo/lists/${list.id}/tasks?$top=80&$filter=status ne 'completed'&$orderby=lastModifiedDateTime desc`
      );
      for (const t of tasks.value ?? []) {
        const suggestedDue = t.dueDateTime?.dateTime
          ? new Date(t.dueDateTime.dateTime).toISOString()
          : defaultSuggestedDue(t.createdDateTime, t.lastModifiedDateTime);
        const baseMs = new Date(
          t.createdDateTime || t.lastModifiedDateTime || Date.now()
        ).getTime();
        const remindH = reminderHoursFromSeed(`${list.id}:${t.id}`, 4, 8);
        out.push({
          id: t.id,
          title: t.title || "(untitled)",
          status: t.status,
          importance: t.importance,
          createdDateTime: t.createdDateTime,
          lastModifiedDateTime: t.lastModifiedDateTime,
          dueDateTime: t.dueDateTime,
          reminderDateTime: t.reminderDateTime,
          listId: list.id,
          listName: list.displayName,
          suggestedDue,
          actionTarget: new Date(baseMs + remindH * 60 * 60 * 1000).toISOString(),
          reminderHours: remindH,
        });
      }
    }

    out.sort((a, b) => {
      const ad = a.dueDateTime?.dateTime
        ? new Date(a.dueDateTime.dateTime).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bd = b.dueDateTime?.dateTime
        ? new Date(b.dueDateTime.dateTime).getTime()
        : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

    return NextResponse.json({ items: out });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
