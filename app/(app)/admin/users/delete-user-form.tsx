"use client"

import { deleteUser } from "./actions"

export function DeleteUserForm({ userId, email }: { userId: string; email: string }) {
  return (
    <form
      action={deleteUser.bind(null, userId)}
      onSubmit={e => {
        if (!confirm(`Delete ${email}? This cannot be undone.`)) e.preventDefault()
      }}
    >
      <button type="submit" className="text-xs text-destructive hover:underline">
        Delete
      </button>
    </form>
  )
}
