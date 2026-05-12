import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import {
  getMyEmail,
  graphFetch,
  isDirectlyAddressedTo,
  isIncomingFromOthers,
  normEmail,
  threadLatestSender,
  type GraphMessage,
} from "@/lib/graph";
import { getDemoMailPayload } from "@/lib/demo-data";
import { reminderHoursFromSeed } from "@/lib/stable-reminder";

function hoursFrom(ms: number, h: number): string {
  return new Date(ms + h * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.isDemo) {
    return NextResponse.json(getDemoMailPayload());
  }

  const token = session.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const myEmail = await getMyEmail(token);
    const inbox = await graphFetch<{ value: GraphMessage[] }>(
      token,
      `/me/mailFolders/inbox/messages?$top=55&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,conversationId,bodyPreview,isRead,webLink&$filter=isDraft eq false`
    );

    const candidates = inbox.value.filter(
      (m) =>
        isIncomingFromOthers(myEmail, m) &&
        isDirectlyAddressedTo(myEmail, m)
    );

    const byConv = new Map<string, GraphMessage>();
    for (const m of candidates) {
      const prev = byConv.get(m.conversationId);
      if (!prev || new Date(m.receivedDateTime) > new Date(prev.receivedDateTime)) {
        byConv.set(m.conversationId, m);
      }
    }

    const convIds = [...byConv.keys()].slice(0, 22);
    const needsReply: {
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
    }[] = [];

    for (const cid of convIds) {
      const msg = byConv.get(cid)!;
      const latest = await threadLatestSender(token, cid);
      if (!latest) continue;
      if (normEmail(latest.address) === normEmail(myEmail)) {
        continue;
      }
      const anchorMs = new Date(latest.receivedDateTime).getTime();
      const remindH = reminderHoursFromSeed(cid, 4, 8);
      needsReply.push({
        id: msg.id,
        conversationId: cid,
        subject: msg.subject || "(no subject)",
        from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || "Unknown",
        fromAddress: msg.from?.emailAddress?.address || "",
        receivedDateTime: msg.receivedDateTime,
        lastMessageAt: latest.receivedDateTime,
        bodyPreview: msg.bodyPreview || "",
        isRead: msg.isRead,
        suggestedDeadline: hoursFrom(anchorMs, 24),
        actionTarget: hoursFrom(anchorMs, remindH),
        reminderHours: remindH,
        webLink: msg.webLink,
      });
    }

    needsReply.sort(
      (a, b) =>
        new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
    );

    return NextResponse.json({ items: needsReply, myEmail });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
