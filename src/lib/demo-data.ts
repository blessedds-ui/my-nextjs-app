import { reminderHoursFromSeed } from "@/lib/stable-reminder";

const DEMO_MY_EMAIL = "morgan.chen@fabrikam.com";

function hoursFrom(ms: number, h: number): string {
  return new Date(ms + h * 60 * 60 * 1000).toISOString();
}

/** Mail payload matching `/api/dashboard/mail` success shape. */
export function getDemoMailPayload(): {
  items: {
    id: string;
    conversationId: string;
    subject: string;
    from: string;
    fromAddress: string;
    receivedDateTime: string;
    lastMessageAt: string;
    bodyPreview: string;
    isRead: boolean;
    suggestedDeadline: string;
    actionTarget: string;
    reminderHours: number;
    webLink?: string;
  }[];
  myEmail: string;
} {
  const now = Date.now();
  const threads: {
    cid: string;
    id: string;
    subject: string;
    from: string;
    fromAddress: string;
    bodyPreview: string;
    isRead: boolean;
    lastMsgHoursAgo: number;
    threadMsgHoursAgo: number;
  }[] = [
    {
      cid: "conv-q3-budget",
      id: "dm-001",
      subject: "Re: Q3 budget — need your sign-off today",
      from: "Jordan Blake",
      fromAddress: "jordan.blake@northwind.com",
      bodyPreview:
        "Finance is blocking the vendor payment run until we have your written OK on the revised line items. Can you reply-all with approval or edits by 4pm?",
      isRead: false,
      lastMsgHoursAgo: 1.2,
      threadMsgHoursAgo: 1.2,
    },
    {
      cid: "conv-api-outage",
      id: "dm-002",
      subject: "Customer impact: API latency spike (P1)",
      from: "Priya Nandakumar",
      fromAddress: "priya.n@contoso.com",
      bodyPreview:
        "We are seeing 8s p95 on checkout in EU-West since 09:40 UTC. On-call rolled a hotfix but wants you to confirm whether we should fail open on inventory holds.",
      isRead: false,
      lastMsgHoursAgo: 0.4,
      threadMsgHoursAgo: 0.4,
    },
    {
      cid: "conv-design-review",
      id: "dm-003",
      subject: "Design review deck — comments by EOD?",
      from: "Sam Okonkwo",
      fromAddress: "sam.okonkwo@fabrikam.com",
      bodyPreview:
        "I dropped v3 of the onboarding flow in Figma. Legal asked for one more pass on consent copy; if you can leave notes on slides 4–7 we can ship to eng tomorrow.",
      isRead: true,
      lastMsgHoursAgo: 3,
      threadMsgHoursAgo: 3,
    },
    {
      cid: "conv-contract-redline",
      id: "dm-004",
      subject: "Vendor MSA — redlines attached",
      from: "Elena Rossi",
      fromAddress: "elena.rossi@tailspin.com",
      bodyPreview:
        "Attached are our comments on §7 (liability cap) and §9 (data processing). Let me know if Tuesday 10am CET works for a 30m legal sync.",
      isRead: false,
      lastMsgHoursAgo: 6,
      threadMsgHoursAgo: 6,
    },
    {
      cid: "conv-hiring-panel",
      id: "dm-005",
      subject: "Staff engineer loop — your panel slot",
      from: "HR Scheduling",
      fromAddress: "scheduling@fabrikam.com",
      bodyPreview:
        "We still need your 45m system design panel next week. Current candidate pool is backend-heavy; your distributed systems screen would balance the loop.",
      isRead: true,
      lastMsgHoursAgo: 18,
      threadMsgHoursAgo: 18,
    },
    {
      cid: "conv-security-questionnaire",
      id: "dm-006",
      subject: "Security questionnaire — prospect Acme",
      from: "Riley Park",
      fromAddress: "riley.park@fabrikam.com",
      bodyPreview:
        "Sales needs the SOC2 + encryption answers for rows 34–41 before the enterprise demo Friday. I stubbed answers in the sheet; please validate column D.",
      isRead: false,
      lastMsgHoursAgo: 30,
      threadMsgHoursAgo: 30,
    },
  ];

  const items = threads.map((t) => {
    const receivedMs = now - t.threadMsgHoursAgo * 60 * 60 * 1000;
    const lastMs = now - t.lastMsgHoursAgo * 60 * 60 * 1000;
    const remindH = reminderHoursFromSeed(t.cid, 4, 8);
    return {
      id: t.id,
      conversationId: t.cid,
      subject: t.subject,
      from: t.from,
      fromAddress: t.fromAddress,
      receivedDateTime: new Date(receivedMs).toISOString(),
      lastMessageAt: new Date(lastMs).toISOString(),
      bodyPreview: t.bodyPreview,
      isRead: t.isRead,
      suggestedDeadline: hoursFrom(lastMs, 24),
      actionTarget: hoursFrom(lastMs, remindH),
      reminderHours: remindH,
    };
  });

  items.sort(
    (a, b) =>
      new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
  );

  return { items, myEmail: DEMO_MY_EMAIL };
}

/** Tasks payload matching `/api/dashboard/tasks` success shape. */
export function getDemoTasksPayload(): {
  items: {
    id: string;
    title: string;
    status: string;
    importance: string;
    createdDateTime?: string;
    lastModifiedDateTime?: string;
    dueDateTime?: { dateTime: string; timeZone: string };
    reminderDateTime?: { dateTime: string; timeZone: string };
    listId: string;
    listName: string;
    suggestedDue: string;
    actionTarget: string;
    reminderHours: number;
  }[];
} {
  const now = Date.now();
  const tz = "UTC";

  const raw: {
    listId: string;
    listName: string;
    id: string;
    title: string;
    importance: string;
    createdHoursAgo: number;
    dueInHours?: number;
  }[] = [
    {
      listId: "list-work",
      listName: "Work",
      id: "task-101",
      title: "Draft incident timeline for last weekend",
      importance: "high",
      createdHoursAgo: 20,
      dueInHours: 4,
    },
    {
      listId: "list-work",
      listName: "Work",
      id: "task-102",
      title: "Pair with infra on Redis connection pool limits",
      importance: "normal",
      createdHoursAgo: 8,
    },
    {
      listId: "list-work",
      listName: "Work",
      id: "task-103",
      title: "Reply to finance on CapEx spreadsheet",
      importance: "normal",
      createdHoursAgo: 48,
      dueInHours: 36,
    },
    {
      listId: "list-personal",
      listName: "Personal",
      id: "task-201",
      title: "Renew passport — check appointment slots",
      importance: "high",
      createdHoursAgo: 120,
    },
    {
      listId: "list-personal",
      listName: "Personal",
      id: "task-202",
      title: "Book dentist cleaning",
      importance: "low",
      createdHoursAgo: 240,
      dueInHours: 72,
    },
    {
      listId: "list-pulse",
      listName: "Pulse desk",
      id: "task-301",
      title: "Define nudge thresholds for mail vs tasks",
      importance: "normal",
      createdHoursAgo: 3,
    },
    {
      listId: "list-pulse",
      listName: "Pulse desk",
      id: "task-302",
      title: "Prototype dismissed-items persistence",
      importance: "normal",
      createdHoursAgo: 6,
      dueInHours: 8,
    },
    {
      listId: "list-pulse",
      listName: "Pulse desk",
      id: "task-303",
      title: "Write README section for Azure AD setup",
      importance: "low",
      createdHoursAgo: 30,
    },
  ];

  const items = raw.map((t) => {
    const createdMs = now - t.createdHoursAgo * 60 * 60 * 1000;
    const modifiedMs = createdMs + 15 * 60 * 1000;
    const suggestedDue = t.dueInHours
      ? hoursFrom(now, t.dueInHours)
      : hoursFrom(createdMs, 48);
    const remindH = reminderHoursFromSeed(`${t.listId}:${t.id}`, 4, 8);
    const dueDateTime = t.dueInHours
      ? { dateTime: hoursFrom(now, t.dueInHours), timeZone: tz }
      : undefined;
    return {
      id: t.id,
      title: t.title,
      status: "notStarted",
      importance: t.importance,
      createdDateTime: new Date(createdMs).toISOString(),
      lastModifiedDateTime: new Date(modifiedMs).toISOString(),
      dueDateTime,
      listId: t.listId,
      listName: t.listName,
      suggestedDue,
      actionTarget: hoursFrom(createdMs, remindH),
      reminderHours: remindH,
    };
  });

  items.sort((a, b) => {
    const ad = a.dueDateTime?.dateTime
      ? new Date(a.dueDateTime.dateTime).getTime()
      : Number.MAX_SAFE_INTEGER;
    const bd = b.dueDateTime?.dateTime
      ? new Date(b.dueDateTime.dateTime).getTime()
      : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  return { items };
}
