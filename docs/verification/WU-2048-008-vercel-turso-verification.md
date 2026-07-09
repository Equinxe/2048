# WU-2048-008 — Vercel + Turso Pre-Signup Verification Report

**Author:** DevOps Engineer (AI Employee)
**Date:** 2026-07-09
**Work Unit:** WU-2048-008
**Verdict:** GO — with two conditions for Director acknowledgement

---

## Purpose

Executes the mandatory pre-signup verification checklist from `docs/adr/ADR-2048-001-backend-technology-selection.md` (Implementation Notes) for Vercel and Turso, before any account is created or resource deployed. The Director approved ADR-2048-001's Decision (Option 4: Vercel + Turso) explicitly for its zero-cost profile — this report exists to confirm that assumption against live, current documentation rather than repeat the earlier Fly.io cost-framing mistake (corrected in the ADR after a Director challenge).

---

## Checklist Results

### 1. Vercel Hobby: non-commercial personal use, no credit card required

**Confirmed, with a condition.** Vercel Hobby is free. Per `vercel.com/pricing` (fetched 2026-07-09), no credit card is required to create an account or deploy. Per `vercel.com/docs/limits/fair-use-guidelines` (last updated 2026-06-16): *"Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan."* Commercial use includes payment processing, advertising, affiliate linking, or receiving payment to build or host the site; donations count as commercial too.

The project as currently defined (personal portfolio, single Director, no revenue) is fully compliant.

**Condition:** if the project ever adds monetization, advertising, or any compensated involvement, Hobby must upgrade to Pro (~$20/month, credit card required at that point).

### 2. Turso free-tier limits vs. this project's workload

**Confirmed — workload fits with orders-of-magnitude margin.** Per `turso.tech/pricing` (fetched 2026-07-09):

| Resource | Free Tier Limit | This Workload | Margin |
|---|---|---|---|
| Storage | 5 GB | < 5 MB | ~1,000x |
| Rows read / month | 500 million | < 10,000 | ~50,000x |
| Rows written / month | 10 million | < 1,000 | ~10,000x |
| Databases | 100 | 1 | Well inside |

No credit card required ("Start free today, no credit card required").

### 3. Turso free tier backup / point-in-time recovery

**Confirmed — 1-day PITR retention.** Per `turso.tech/pricing` (fetched 2026-07-09), the free tier includes "1 day" point-in-time restore. Data loss discovered more than 24 hours after the fact cannot be recovered from backup on the free tier.

**Condition (informational):** acceptable for this project's data profile (player names and scores, not business-critical). Turso Scaler ($24.92/month) offers 30-day PITR if the Director later wants stronger recovery guarantees. Not a blocker.

### 4. Vercel usage pushing the account onto a paid tier

**No risk.** Per `vercel.com/docs/plans/hobby` (last updated 2026-06-16): 1,000,000 function invocations/month (this workload: <1,000), 100 GB Fast Data Transfer (this workload: <1MB), 4 CPU-hrs Active CPU (negligible for this workload). Hobby has no pay-as-you-go billing — overages pause features (up to 30 days) rather than generate a charge. No scenario at this workload produces an unexpected bill.

### 5. Any recurring cost or credit-card requirement?

**None.** Neither Vercel Hobby nor Turso Free requires a credit card or has a recurring cost at this workload.

---

## Go / No-Go Recommendation

**GO.** Both services are genuinely free at this project's scale — materially better than the previously corrected Fly.io estimate (~$2-5/month). No credit card gate on either service. Proceed with account creation once the Director has acknowledged the two conditions below.

**Conditions for Director acknowledgement before account creation:**
1. Vercel's non-commercial restriction is real and currently satisfied — but any future monetization triggers a required upgrade to Pro.
2. Turso's free-tier PITR retention is 1 day only — acceptable now, but a known limitation.

---

## Sources

- `https://vercel.com/pricing` (fetched 2026-07-09)
- `https://vercel.com/docs/limits/fair-use-guidelines` (last_updated 2026-06-16)
- `https://vercel.com/docs/plans/hobby` (last_updated 2026-06-16)
- `https://turso.tech/pricing` (fetched 2026-07-09)
