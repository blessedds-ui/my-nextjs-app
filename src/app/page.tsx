import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { HomeSignIn } from "@/components/home-sign-in";
import { authOptions } from "@/lib/auth-options";

const microsoftAvailable =
  Boolean(process.env.AZURE_AD_CLIENT_ID) &&
  Boolean(process.env.AZURE_AD_CLIENT_SECRET) &&
  Boolean(process.env.AZURE_AD_TENANT_ID);

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-80" />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-cyan-400/90">
          Demo mode
        </p>
        <h1 className="bg-gradient-to-br from-white via-cyan-100 to-violet-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          Pulse desk
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-400">
          Live triage for mail that still needs your voice, tasks with deadlines, and quiet
          nudges when something has been waiting too long. The demo uses sample data — no
          Microsoft account required.
        </p>
        {session ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
            >
              Open dashboard
            </Link>
          </div>
        ) : (
          <HomeSignIn microsoftAvailable={microsoftAvailable} />
        )}
        <p className="mt-14 max-w-lg font-mono text-xs leading-relaxed text-slate-500">
          Demo sign-in uses a fixed session (password{" "}
          <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-cyan-200/90">demo</code>
          ). For production Microsoft 365, set{" "}
          <code className="rounded bg-slate-800/80 px-1.5 py-0.5">AZURE_AD_*</code> and{" "}
          <code className="rounded bg-slate-800/80 px-1.5 py-0.5">NEXTAUTH_*</code> from{" "}
          <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-cyan-200/90">
            env.example
          </code>
          .
        </p>
      </main>
    </div>
  );
}
