# Core Data Invariants & Zero-Trust Threat Specifications

This document outlines the security invariants, threat validation cases ("Dirty Dozen" payloads), and rules structures for the **AI StockVision** platform.

## 1. Core Data Invariants

1. **Strict Ownership Invariant**: A user's preference node (`/preferences/{userId}`) can only be retrieved, written to, or modified by the user whose UID matches `{userId}`.
2. **Email Verification Invariant**: To write security changes or update profiles, the user's Google Auth Token must have `email_verified == true`.
3. **Immutability of Identity**: Once created, a profile document `/users/{userId}` cannot have its `uid` or `email` changed under any update scenario.
4. **Clean Types & Boundaries**: Non-string values or oversized inputs in watchlists are strictly gated from database storage.

---

## 2. The "Dirty Dozen" Threat Payloads (Verification Targets Matrix)

The following 12 payloads represent malicious attempts to bypass identity boundaries or feed tainted variables to security schemas.

### Identity Spoofing Targets
1. **Unauthenticated Profile Creation**: Guest payload writing to `/users/eviluid` without any valid auth header.
2. **UID Mismatch Injection**: Signed-in user `user_A` trying to write a profile document to `/users/user_B`.
3. **Relational Owner Spoofing**: User `user_A` writing preference configurations with `userId: "user_B"` inside the document.

### Value Poisoning Targets
4. **Watchlist Type Pollution**: Sending a boolean list element `watchlist: [123, "AAPL", true]` to bypass symbol validations.
5. **Junk ID Parameter Flooding**: Trying to insert a 2MB junk-string parameter as `{userId}` parameter (Denial of Wallet).
6. **Temporal Spoofing**: Client-supplied timestamp payload setting `createdAt` to dynamic futures instead of `request.time`.

### Lifecycle and State Escalation Targets
7. **Bypassing Verification Status**: User `user_A` with unverified email (`email_verified: false`) attempting critical read/write configurations.
8. **Immutability Mutation**: Attempting to alter the immutable `createdAt` parameter of a registered profile.
9. **Role Self-Escalation**: Maliciously appending `role: "admin"` to profile schemas.

---

## 3. Test Assertions Verification Runner

`firestore.rules.test.ts` compiles these conditions under Local Emulator contexts to guarantee absolute safety lines.
