import Link from "next/link";

export default function UpgradePage() {
  const pay = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "";

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-bold">Upgrade to Pro</h1>
        <p className="mt-2 text-slate-600">
          BankrollPro Pro (Beta) is <span className="font-semibold">£9/month</span>.
        </p>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Share reports (public links)</li>
            <li>Export bets (CSV)</li>
            <li>More insights (rolling out)</li>
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {pay ? (
              <a
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                href={pay}
                target="_blank"
                rel="noreferrer"
              >
                Pay with Stripe
              </a>
            ) : (
              <div className="text-sm text-red-700">
                Missing NEXT_PUBLIC_STRIPE_PAYMENT_LINK env var.
              </div>
            )}

            <Link className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50" href="/dashboard/all">
              Back to Dashboard
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Beta note: payment is via Stripe Payment Link. Access is enabled via the toggle in Settings for now.
          </div>
        </div>
      </div>
    </main>
  );
}