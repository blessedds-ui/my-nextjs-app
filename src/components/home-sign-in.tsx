"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export function HomeSignIn({ microsoftAvailable }: { microsoftAvailable: boolean }) {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
      <button
        type="button"
        onClick={() =>
          void signIn("demo", { password: "demo", callbackUrl: "/dashboard" })
        }
        className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
      >
        Open demo dashboard
      </button>
      {microsoftAvailable && (
        <Link
          href="/api/auth/signin?callbackUrl=/dashboard"
          className="rounded-xl border border-slate-600/80 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
        >
          Sign in with Microsoft
        </Link>
      )}
    </div>
  );
}
