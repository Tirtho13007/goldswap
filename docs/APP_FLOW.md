# GoldSwap Application Flow

**Status:** Approved navigation and state-flow baseline  
**Version:** 1.0  
**Last updated:** 2 November 2026

## 1. Top-level navigation

```text
Public website
├─ Home
├─ How it works
├─ Market
├─ Trade levels
├─ Company / trust
├─ FAQ
├─ Dashboard showcase
└─ Guides: help, security, fees, payment methods, status, terms, privacy, risk

Customer workspace
├─ Overview
├─ Wallet / assets
├─ Deposit
├─ Buy / Sell
├─ Swap
├─ Withdraw
├─ My trades
├─ Physical gold
├─ Transactions
├─ Notifications
├─ Support
├─ Account
└─ Security

Staff workspace (permission-filtered)
├─ Overview
├─ Users
├─ KYC requests
├─ Deposit requests
├─ Withdrawal requests
├─ Physical requests
├─ Holding records
├─ Gold inventory
├─ Coins & networks
├─ Support inbox
├─ Staff & permissions
├─ Website settings
├─ Mail/service status
├─ Audit history
└─ My staff account / security
```

Staff navigation must not include customer financial actions.

Staff destinations persist in the hash as `#account/deposits`, `#account/kyc`, and equivalent navigation IDs. Reload and browser history restore the permitted destination. Review queues show oldest-first results, explicit status/email filters, loading/error/empty states and a selected row. Selecting a request opens and focuses its adjacent proof/decision panel; narrow screens stack the panels. Selection never submits a decision.

## 2. Registration and verification

```text
Register -> account created -> signed-in dashboard
                         ├─ verification reminder shown
                         ├─ resend verification available
                         └─ all feature pages remain visible

Email link -> token validated -> email marked verified -> notification/reminder cleared
```

Unverified email is not a dashboard-access gate. KYC, balance, liquidity and operational rules can still prevent a financial submission.

## 3. KYC lifecycle

```text
Not submitted
  -> select National ID / Passport / Birth certificate
  -> upload private document(s)
  -> Pending
      -> Approved
      -> More information -> customer resubmits -> Pending
      -> Rejected -> reason shown -> eligible resubmission
Approved -> expiry/renewal condition -> renewal required -> resubmit
Deletion request -> retention/legal-hold checks -> encrypted content purge
```

Every review transition stores actor, time, reason and snapshot/history.

## 4. Crypto deposit

```text
Deposit
  -> choose asset
  -> choose enabled network
  -> show exact address + QR + memo/tag warning
  -> enter amount and transaction reference
  -> upload proof
  -> review summary
  -> submit Pending
      -> staff validates external evidence
      -> Approved: internal balance credited once + receipt + notification
      -> Rejected: no credit + reason + notification
```

Changing asset/network resets address-dependent form state. The customer must acknowledge irreversible network mistakes.

## 5. Buy gold

```text
Choose crypto balance -> enter amount / MAX -> request server quote
  -> Review: crypto debit, gold credit, price, fee, quote countdown
  -> Confirm before expiry
      -> balance + platform inventory/liquidity revalidated atomically
      -> Success result + transaction detail
      -> Expired/changed -> return for fresh quote
      -> Insufficient balance/inventory -> no state change
```

Sell gold mirrors this flow with gold debit and crypto credit.

## 6. Internal crypto swap

```text
From asset -> To asset -> amount / MAX -> quote
  -> review source, rate, fee and expected receive
  -> confirm
  -> atomic source debit + destination credit + treasury movement
  -> result / transaction detail
```

From and To cannot match. Output rounds down to destination precision. This is an internal ledger exchange, not a blockchain swap.

## 7. Five-day hold

```text
Available gold -> select amount
  -> level/rate derived from grams
  -> review 5-day terms and expected gold payout
  -> confirm
  -> principal locked + platform profit reserved atomically
  -> Active trade: live countdown + progress bar
  -> worker detects maturity
  -> principal + reserved profit credited exactly once
  -> Settled transaction + notification
```

No early exit is provided. If profit reserve is unavailable, the hold is not created and customer gold remains available.

## 8. Crypto withdrawal

```text
Withdraw -> choose balance/route -> destination + memo/tag
  -> validate address -> amount / MAX
  -> estimate/review: gross, 1.5% fee, net, USD minimum
  -> KYC and liquidity checks -> submit Pending
      -> staff Approves / Rejects
      -> Approved -> Processing (external transaction reference/proof)
      -> Completed after manual verification
```

Pending cancellation, when allowed, releases reserves exactly once. Completion provides receipt and explorer link when a compatible transaction reference exists.

## 9. Physical gold order

```text
Physical gold -> enter delivered grams (minimum 500)
  -> show fee and total deduction (quantity × 1.02)
  -> confirm recipient, phone and delivery address
  -> approved KYC + sufficient gold -> reserve total
  -> staff review -> stock allocation -> dispatch tracking/proof
  -> delivered acknowledgement -> final deduction
```

Rejection/cancellation releases the total reserve. Delivery timing is confirmed by staff; no instant shipping promise.

## 10. Support and notifications

```text
Help & Support -> create ticket + optional transaction + attachment
  -> Open / Waiting staff
  -> assigned staff conversation
  -> Waiting customer / Resolved / Closed

Notification centre -> unread/read -> deep link to relevant record
Email outbox -> queued -> provider accepted OR retry -> failed visibility to staff
```

## 11. Staff control flow

```text
Staff login -> production MFA challenge -> staff workspace
  -> read queues permitted by RBAC
  -> sensitive write -> recent reauthentication dialog
  -> server re-checks permission + assurance
  -> action committed + audit event + customer notification
```

Super Admin staff management:

```text
Create staff -> private one-time password setup
 -> assign admin/moderator/custom role
 -> role permissions + optional user overrides
 -> deny overrides grant
 -> change/remove/restrict -> sessions revoked where applicable
```

## 12. Error and recovery rules

- Never clear entered non-secret data on a recoverable validation error.
- Never submit twice while a confirmation is running.
- Expired quote returns the customer to review with a clear refresh action.
- Network/server error shows retry and preserves context; it must not display success.
- Manual-review records always show current status, last update and next expected action.
- Empty, loading, offline, forbidden and error states are designed states, not blank cards.

