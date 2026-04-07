"use client";
import { useState } from "react";

const PLANS = [
  {
    name: "Free", tier: "free", price: "$0", period: "forever",
    features: ["100 requests/day", "1 API key", "Keyword search", "Community support"],
  },
  {
    name: "Pro", tier: "pro", price: "$29", period: "/month",
    features: ["10,000 requests/day", "Unlimited API keys", "Semantic search", "Priority support"],
    highlight: true,
  },
  {
    name: "Enterprise", tier: "enterprise", price: "Custom", period: "",
    features: ["Unlimited requests", "Unlimited keys", "Dedicated support", "Custom SLA", "On-premise option"],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoading(false);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Billing</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div key={plan.tier}
            className={`bg-surface border rounded-xl p-5 flex flex-col ${
              plan.highlight ? "border-accent ring-1 ring-accent" : "border-border"
            }`}>
            <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-2xl font-bold">{plan.price}</span>
              <span className="text-secondary text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-secondary flex items-center gap-2">
                  <span className="text-price">✓</span> {f}
                </li>
              ))}
            </ul>
            {plan.tier === "pro" && (
              <button onClick={handleUpgrade} disabled={loading}
                className="w-full bg-accent hover:bg-[#8b5cf6] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {loading ? "Redirecting..." : "Upgrade to Pro"}
              </button>
            )}
            {plan.tier === "enterprise" && (
              <a href="mailto:agora@bentolabs.co.uk?subject=Agora Enterprise"
                className="w-full block text-center bg-surface border border-border hover:border-[#3f3f46] text-[#e5e5e5] py-2 rounded-lg text-sm font-medium transition-colors">
                Contact Us
              </a>
            )}
            {plan.tier === "free" && (
              <div className="w-full text-center text-secondary text-sm py-2">Current plan</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
