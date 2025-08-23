'use client'

import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function TasksDemo() {
  const tasks = useQuery(api.tasks.get)

  return (
    <div className="mt-8 p-6 rounded-2xl bg-[color:var(--surface)] ring-1 ring-[color:var(--border)]">
      <h3 className="text-lg font-medium mb-4">
        Convex Demo - Tasks from Database
      </h3>
      {tasks === undefined ? (
        <p className="text-[color:var(--muted)]">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-[color:var(--muted)]">No tasks found</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task._id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                task.isCompleted
                  ? 'bg-[color:var(--surface-2)] text-[color:var(--muted)]'
                  : 'bg-[color:var(--accent)] text-[color:var(--foreground)]'
              }`}
            >
              <span className="msr">
                {task.isCompleted ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={task.isCompleted ? 'line-through' : ''}>
                {task.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
