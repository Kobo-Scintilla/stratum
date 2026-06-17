# Collaborative Chat System — Full Design

## Goals

1. **1-to-1 DM** between buddies. Standalone + inline panel inside any session.
2. **Shared AI sessions** — multiple users see same AI response, send messages, with **queue** (FIFO) or **steer** (explicit cancel+send).
3. **Unified chat UI** — same message list, input bar, session concept — whether recipient is AI or human.
4. **No auto-interrupt** — AI never stops mid-response unless user explicitly `/steer`s.
5. **Cross-share AI messages into DMs** — any AI message (or range) can be forwarded into a DM thread.

---

## Core Concepts

### Session Types

- `"ai"` — AI chat session. Has model, system prompt, headroom config, etc.
- `"dm"` — 1-to-1 DM between exactly 2 users. No AI. Pure user→user + shared AI snippets.

### Participants (Shared AI Sessions)

```ts
ChatSessionSettings {
  id, ownerId,
  type: "ai" | "dm";
  recipientId?: string;       // for type="dm"
  participants: string[];     // for type="ai" — user IDs (includes owner)
  visibility: "private" | "shared";
  collaborationMode: "queue" | "steer";  // for type="ai"
  activeSenderId?: string;    // who's currently sending to AI
  systemPrompt: string;       // custom system prompt override
  // existing: modelProvider, modelId, contextWindow, thinkingLevel, headroom*, title, pinned
}
```

### Collaboration Modes

| Mode | AI idle | AI mid-response | `/queue` cmd | `/steer` cmd |
|---|---|---|---|---|
| `queue` (default) | Send now | Queue (FIFO) | Queue | Cancel + send now |
| `steer` | Send now | Queue (FIFO) | Queue | Cancel + send now |

**No auto-interrupt.** Only explicit `/steer` cancels AI mid-response.

---

## Message Flow

### AI Session

1. User types. `/steer` prefix → cancel AI, send now. `/queue` → always queue. Otherwise: queue if AI busy, send if idle.
2. Inserted as `ChatMessage` with `role: "user"`, `senderId`.
3. If queued → added to `ActiveStream.queue` FIFO array.
4. After AI finishes → `drainQueue()` pops next from FIFO, processes it.

### DM Session

1. Message goes directly to `ChatMessage` with `role: "user"`, `senderId`.
2. No AI, no queue, no stream.
3. Other user sees it via Remult live query.

### Queue Storage

```ts
ActiveStream.queue: Array<{
  messageId: string; senderId: string; prompt: string; enqueuedAt: Date
}>
```

---

## Data Model

### Modified: `ChatMessage`

```ts
{
  // existing fields: id, sessionId, ownerId, role, content, toolCalls, ..., createdAt
  senderId: string;          // userId of who sent this
  pending: boolean;          // true if queued, not yet sent to AI
  editedAt?: Date;           // last edit timestamp
  deletedAt?: Date;          // soft-delete tombstone
  share?: {                  // for AI snippets forwarded into a DM
    fromSessionId: string;
    fromSessionTitle: string;
    fromUserId: string;
    sharedAt: Date;
    contextBefore: number;
    contextAfter: number;
  };
}
```

### New: `Buddy`

```ts
@Entity("buddies")
class Buddy {
  id: string;
  userId: string;       // owner of this row
  buddyId: string;      // the other user
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  acceptedAt?: Date;
}
```

Two rows per accepted relationship (A→B and B→A), query by `userId`.

### Modified: User schema (better-auth)

Add `username: string` — unique, indexed, lowercase. Used for buddy lookup.

### Removed

`BuddyMessage` entity — redundant. `ChatMessage` handles everything.

---

## Cross-Sharing AI Messages into DMs

### Use Cases

1. Single message share — hover AI message → "Share to DM"
2. Range share — select N messages, share as one snippet
3. Full session context bundle — share last N messages as a card

### Rendered Snippet Card

```
┌──────────────────────────────────────────┐
│ ━━ From "Refactor auth" session ━━━━━━━━ │
│  [USER]: how do I use jwt?               │
│  [AI]:   Use the svelteKitHandler...     │
│  [USER]: does it support refresh?        │
│  [AI]:   Yes, configure plugin...        │
│  ── shared by @alice · 2h ago ────────── │
└──────────────────────────────────────────┘
```

### Backend Endpoint

```ts
AgentService.shareMessagesToDm(args: {
  fromSessionId: string;
  toBuddyId: string;
  messageIds: string[];
  comment?: string;  // optional DM text after the snippet
}): { dmSessionId: string; shareMessageId: string }
```

- Verifies access to `fromSessionId`, verifies buddy is accepted.
- Fetches messages, builds snippet, inserts into DM session.
- Snippet is a static copy of the original message content at share time.

### Frontend Components

- **ShareToDmModal** — buddy picker, comment field, preview, Cancel/Share
- **SharedAiSnippet.svelte** — renders `ChatMessage` with `share` populated. Shows origin session link, sender labels, markdown content, "shared by" footer.
- **Range select mode** — toggle in AI session header, checkbox overlays, Shift+click range, bottom action bar.

---

## Backend Endpoints

### Buddy System

| Method | Signature | Purpose |
|---|---|---|
| `lookupUserByUsername` | `(username: string) → { id, name, email, username }` | Public lookup |
| `sendBuddyRequest` | `(buddyUsername: string) → Buddy` | Create pending Buddy row |
| `acceptBuddyRequest` | `(buddyRequestId: string) → Buddy` | Accept + create mirror row |
| `declineBuddyRequest` | `(buddyRequestId: string) → void` | Delete pending row |
| `listBuddies` | `() → Buddy[]` | Accepted buddies for current user |
| `listPendingBuddyRequests` | `() → Buddy[]` | Incoming pending requests |
| `removeBuddy` | `(buddyId: string) → void` | Delete both rows |

### DM Sessions

| Method | Signature | Purpose |
|---|---|---|
| `startOrGetDmSession` | `(otherUserId: string) → { sessionId }` | Find or create DM session |
| `listDmSessions` | `() → DmSessionDto[]` | DM sessions with last message preview + unread |
| `listDmMessages` | `(sessionId: string) → ChatMessage[]` | Messages in a DM |

### Shared AI Sessions

| Method | Signature | Purpose |
|---|---|---|
| `inviteToSession` | `(sessionId: string, buddyId: string) → void` | Add to participants |
| `removeParticipant` | `(sessionId: string, participantId: string) → void` | Remove (owner only) |
| `leaveSession` | `(sessionId: string) → void` | Remove self (non-owner) |
| `listParticipants` | `(sessionId: string) → ParticipantDto[]` | With name/email |
| `setCollaborationMode` | `(sessionId: string, mode) → void` | Per-session override |
| `listInvitableBuddies` | `(sessionId: string) → Buddy[]` | Buddies not in session |

### Cross-Share

| Method | Signature | Purpose |
|---|---|---|
| `shareMessagesToDm` | `(args) → { dmSessionId, shareMessageId }` | Share AI messages into DM |
| `listSessionMessagesForShare` | `(sessionId: string) → ChatMessage[]` | Visible messages to share |

### Modified: `AgentService.ask`

```ts
ask(args: {
  prompt: string;
  sessionId: string;
  steer?: boolean;
  queue?: boolean;
})
```

### Session Management

| Method | Signature | Purpose |
|---|---|---|
| `listSessions` | `() → SessionDto[]` (updated) | Returns AI + shared + DM sessions |
| `deleteSession` | `(sessionId: string) → void` | Existing |
| `renameSession` | `(sessionId, title: string) → void` | Existing |
| `togglePinSession` | `(sessionId: string) → boolean` | Existing |
| `setSystemPrompt` | `(sessionId: string, prompt: string) → void` | Custom system prompt |

### Messages

| Method | Signature | Purpose |
|---|---|---|
| `editMessage` | `(messageId: string, content: string) → void` | Edit own message (DM or queued) |
| `deleteMessage` | `(messageId: string) → void` | Soft-delete own message |
| `recoverMessages` | `(sessionIds: string[]) → ChatMessage[]` | Existing |

---

## Frontend Routes

```
/dashboard/ai/[sessionId]    — AI chat view
/dashboard/dm/[sessionId]    — DM chat view
/dashboard/buddies           — buddy list + pending requests
```

---

## Sidebar Updates

**Sessions tab** (updated):
- "My AI sessions" — pinned + unpinned (existing)
- "Shared with me" — AI sessions where user is participant (not owner)
- "Direct Messages" — DM sessions, sorted by last message

**Buddies tab** (new):
- Pending requests (accept/decline)
- Accepted buddies list
- "Add buddy" → username lookup → send request

---

## Inline DM Panel (Inside AI Sessions)

Collapsible right-side panel:
- Header: "DM with [buddy]" + close
- Body: same `ChatMessageList` + `SharedAiSnippet` for shared messages
- Footer: `ChatInputBar` in DM mode
- Multi-buddy tabs
- Live query on DM session's ChatMessages

Trigger: "DM" button in AI session header, or `@buddy` mention.

---

## Settings Page Updates

- **Default Collaboration Mode** — AppSettings: queue | steer
- **Buddy Management** — search, requests, accepted list
- **Per-session overrides** — mode, system prompt, participants list, "Share with buddy"

---

## Additional Features (P8+)

### P8: Message Editing & Deletion
- Edit own messages (DM and own queued AI messages). AI messages immutable.
- Soft-delete with `deletedAt` tombstone. Render as "message deleted".
- Edit shows `editedAt` timestamp. Render " (edited)" badge.

### P9: Keyboard Shortcuts
- `Cmd+K` — command palette (jump session, send to buddy, toggle DM panel)
- `Cmd+Enter` — send message
- `Cmd+Shift+S` — share selected messages
- `Escape` — cancel selection / close modal / close DM panel

### P10: File Attachments
- Drag-and-drop files onto `ChatInputBar`
- Paste images from clipboard
- Upload to object storage or local `~/.stratum/uploads/`
- Render inline (images) or as attachment cards (other files)
- Share attachments in DMs

### P11: Voice Input
- Speech-to-text button in `ChatInputBar`
- Web Speech API hook (browser-native, no external dependency)
- Inserts transcribed text at cursor position
- Toggle on/off, visual recording indicator

### P12: Usage Dashboard
- Route: `/dashboard/usage`
- Total messages, total cost (from `usageCost`), average per session
- Token usage: input/output/cache totals
- Headroom tokens saved, average headroom compression ratio
- Top models by usage, busiest day
- Export as CSV
- Data already exists in `ChatMessage` fields — just aggregating

### P13: Multi-Device Session Management
- List active better-auth sessions: device name, IP, last active, current session flag
- Log out other devices individually
- Uses better-auth's `listSessions` / `revokeSession` APIs
- Route: `/dashboard/sessions` (or tab in Settings)

### P14: Custom System Prompt Per Session
- `systemPrompt` field in `ChatSessionSettings`
- Editable in session settings panel (Settings tab → per-session card)
- Overrides the default agent system prompt
- If empty → use agent registry default
- Also set default system prompt in `AppSettings`

---

## Implementation Phases

### P1: Buddy System
- Buddy entity, username field on User
- sendBuddyRequest, acceptBuddyRequest, declineBuddyRequest, listBuddies, listPendingBuddyRequests, removeBuddy, lookupUserByUsername
- Buddies sidebar tab + accept/decline UI

### P2: DM Sessions
- Add `type`, `recipientId`, `senderId`, `pending` to entities
- startOrGetDmSession, listDmSessions, listDmMessages
- DM sidebar section in Sessions tab
- `/dashboard/dm/[sessionId]` route
- Shared `ChatMessageList` and `ChatInputBar` work as-is

### P3: Shared AI Sessions
- Add `participants`, `collaborationMode` to ChatSessionSettings
- inviteToSession, removeParticipant, leaveSession, listParticipants, listInvitableBuddies
- "Shared with me" sidebar section
- Invite UI: share button → buddy list picker

### P4: Queue + Steer
- Add `queue` array to ActiveStream
- Modify AgentService.ask to accept steer/queue flags
- Add drainQueue() called after AI finishes
- /steer and /queue command parsing in ChatInputBar
- Per-session collaborationMode setting in settings panel
- UI: show queue length, active sender badge

### P5: Cross-Share AI Messages into DMs
- Add `share` field to ChatMessage
- shareMessagesToDm backend endpoint
- listSessionMessagesForShare backend endpoint
- ShareToDmModal component (buddy picker, comment, preview)
- SharedAiSnippet.svelte component for rendering in DM
- Single-message share button (hover on AI/user message)
- Range selection mode in AI session view
- Origin session link in shared snippet

### P6: Inline DM Panel
- Collapsible right-side panel
- Tabs for multiple buddies
- Live updates via live query
- Renders shared AI snippets inline

### P7: Settings Page Polish
- Default mode selector
- Buddy management card
- Pending requests notifications

### P8: Message Editing & Deletion
- editMessage, deleteMessage endpoints
- " (edited)" badge on editedAt > createdAt
- Soft-delete with "message deleted" placeholder
- Only owner can edit/delete, only DM + own queued messages

### P9: Keyboard Shortcuts
- Shortcut registry store
- `Cmd+K` command palette component
- Keybindings for send, share, select, cancel, close DM panel

### P10: File Attachments
- File upload endpoint (local storage: `~/.stratum/uploads/`)
- Drag-and-drop + paste support in ChatInputBar
- ChatAttachment component for inline rendering
- Share attachments in DMs same as messages

### P11: Voice Input
- VoiceInputButton component
- Web Speech API (SpeechRecognition) hook
- Insert transcribed text at cursor position
- Toggle on/off with recording indicator

### P12: Usage Dashboard
- `/dashboard/usage` route
- Backend: aggregate stats endpoint
- Frontend: charts (total messages, cost, tokens, models)
- CSV export button

### P13: Multi-Device Sessions
- Settings tab: "Active Sessions"
- List sessions from better-auth API
- "Log out" button on non-current sessions

### P14: Custom System Prompt
- `systemPrompt` field in ChatSessionSettings
- Editable in per-session settings card
- Default system prompt in AppSettings
- Agent context builder reads session.systemPrompt || appSettings.defaultSystemPrompt || agent.default

---

## Open Questions

- **Notifications**: v1 relies on live queries + badge counters. Push notifications later.
- **File sharing**: out of scope for v1 (P10).
- **Voice messages**: out of scope for v1 (P11).
- **Read receipts**: skip for v1.
- **Live share** (streaming AI response into DM in real-time): static copy only for v1.
- **Snippet context size**: when sharing a range, include exactly the selected messages. No auto-expansion.
- **Edit/Delete shared snippets**: immutable once shared.
- **Group DMs**: out of scope for v1 (1-to-1 only).

---

## Acceptance Criteria (P1-P7)

- [ ] User A searches for User B by username, sends buddy request.
- [ ] User B accepts → both see each other in buddy list.
- [ ] User A clicks "Message" on buddy → DM session opens, can send messages.
- [ ] User B sees new DM message appear live without refresh.
- [ ] User A creates AI session, clicks "Share", picks User B.
- [ ] User B sees session in "Shared with me", opens it, sees all messages + can send.
- [ ] Both send while AI responding → messages queue FIFO.
- [ ] `/steer` while AI responding → AI cancels, message sent immediately.
- [ ] `/queue` while AI idle → message queued, sent after current.
- [ ] User A removes User B from participants → B loses access instantly.
- [ ] Inline DM panel works inside any session, can message any buddy.
- [ ] Hover AI message → "Share to DM" button appears.
- [ ] Share to DM → modal with buddy picker + comment → snippet appears in DM.
- [ ] Range select mode → pick 3 messages → share as single snippet.
- [ ] Comment after share → appears in DM as normal message.
- [ ] Origin session link in snippet → opens AI session (if user has access).
