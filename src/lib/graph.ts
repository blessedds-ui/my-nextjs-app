export type GraphMessage = {
  id: string;
  subject: string;
  receivedDateTime: string;
  conversationId: string;
  webLink?: string;
  bodyPreview?: string;
  isRead: boolean;
  from: { emailAddress?: { name?: string; address?: string } };
  toRecipients: { emailAddress?: { address?: string } }[];
  ccRecipients: { emailAddress?: { address?: string } }[];
};

export type GraphTodoTask = {
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
  /** When no Graph due date, server suggests this */
  suggestedDue?: string;
  /** First reminder window (4–8h from anchor time) */
  actionTarget?: string;
  reminderHours?: number;
};

export async function graphFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `https://graph.microsoft.com/v1.0${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

export function normEmail(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function isDirectlyAddressedTo(
  myEmail: string,
  msg: Pick<GraphMessage, "toRecipients" | "ccRecipients">
): boolean {
  const me = normEmail(myEmail);
  const inTo = msg.toRecipients?.some(
    (r) => normEmail(r.emailAddress?.address) === me
  );
  if (!inTo) return false;
  return true;
}

export function isIncomingFromOthers(
  myEmail: string,
  msg: Pick<GraphMessage, "from">
): boolean {
  const me = normEmail(myEmail);
  const from = normEmail(msg.from?.emailAddress?.address);
  if (!from) return false;
  return from !== me;
}

export async function threadLatestSender(
  accessToken: string,
  conversationId: string
): Promise<{ address: string; receivedDateTime: string } | null> {
  const escaped = conversationId.replace(/'/g, "''");
  const data = await graphFetch<{ value: GraphMessage[] }>(
    accessToken,
    `/me/messages?$filter=conversationId eq '${escaped}'&$orderby=receivedDateTime desc&$top=15&$select=from,receivedDateTime`
  );
  const first = data.value?.[0];
  const addr = first?.from?.emailAddress?.address;
  if (!addr || !first?.receivedDateTime) return null;
  return { address: addr, receivedDateTime: first.receivedDateTime };
}

export async function getMyEmail(accessToken: string): Promise<string> {
  const me = await graphFetch<{ mail?: string; userPrincipalName?: string }>(
    accessToken,
    "/me?$select=mail,userPrincipalName"
  );
  return normEmail(me.mail || me.userPrincipalName || "");
}
