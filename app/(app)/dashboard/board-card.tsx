"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteBoard,
  regenerateLinkToken,
  renameBoard,
  setVisibility,
} from "./actions";
import type { Visibility } from "@/lib/supabase/types";
import type { DashboardBoard } from "./board-list";

const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "Private",
  link: "Anyone with link",
  public: "Public",
};

export function BoardCard({ board }: { board: DashboardBoard }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [pending, start] = useTransition();

  return (
    <li className="group flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <form
            action={(fd) => {
              start(async () => {
                await renameBoard(board.id, fd);
                setRenaming(false);
              });
            }}
            className="flex flex-1 items-center gap-1"
          >
            <input
              name="title"
              defaultValue={board.title}
              autoFocus
              className="h-8 flex-1 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
            />
            <button
              type="submit"
              disabled={pending}
              className="h-8 rounded-md bg-zinc-950 px-2 text-xs font-medium text-zinc-50 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
            >
              Save
            </button>
          </form>
        ) : (
          <Link
            href={`/b/${board.id}`}
            className="flex-1 truncate text-base font-medium text-zinc-950 hover:underline dark:text-zinc-50"
          >
            {board.title}
          </Link>
        )}
        <BoardMenu
          shared={board.shared}
          onRename={() => setRenaming(true)}
          onShare={() => setShareOpen(true)}
          onDelete={() =>
            start(async () => {
              if (confirm(`Delete "${board.title}"? This can't be undone.`)) {
                await deleteBoard(board.id);
              }
            })
          }
        />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-1.5 w-1.5 rounded-full ${
              board.visibility === "public"
                ? "bg-emerald-500"
                : board.visibility === "link"
                  ? "bg-amber-500"
                  : "bg-zinc-400"
            }`}
          />
          {VISIBILITY_LABEL[board.visibility]}
          {board.shared && <span className="ml-1">· shared with you</span>}
        </div>
        <time dateTime={board.updated_at}>
          {new Date(board.updated_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>

      {shareOpen && !board.shared && (
        <ShareModal
          board={board}
          pending={pending}
          start={start}
          onClose={() => setShareOpen(false)}
        />
      )}
    </li>
  );
}

function BoardMenu({
  shared,
  onRename,
  onShare,
  onDelete,
}: {
  shared: boolean;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const items = shared
    ? [{ label: "Rename", fn: onRename }]
    : [
        { label: "Rename", fn: onRename },
        { label: "Share", fn: onShare },
        { label: "Delete", fn: onDelete, danger: true as const },
      ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        aria-label="Board actions"
      >
        ⋯
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-8 z-20 flex w-40 flex-col rounded-md border border-zinc-200 bg-white py-1 shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.fn();
                }}
                className={`px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                  "danger" in item && item.danger
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ShareModal({
  board,
  pending,
  start,
  onClose,
}: {
  board: DashboardBoard;
  pending: boolean;
  start: (fn: () => void | Promise<void>) => void;
  onClose: () => void;
}) {
  const shareUrl =
    board.visibility === "link" && board.link_token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/b/${board.id}?t=${board.link_token}`
      : board.visibility === "public"
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/b/${board.id}`
        : null;

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Share &ldquo;{board.title}&rdquo;
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Anyone with link or fully public boards can be opened without signing in.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {(["private", "link", "public"] as Visibility[]).map((v) => (
            <label
              key={v}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                board.visibility === v
                  ? "border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={board.visibility === v}
                onChange={() => start(() => setVisibility(board.id, v))}
                disabled={pending}
                className="accent-zinc-900 dark:accent-zinc-100"
              />
              <span className="flex flex-col">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {VISIBILITY_LABEL[v]}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {v === "private" && "Only you and people you invite."}
                  {v === "link" && "Anyone with the unguessable link can edit."}
                  {v === "public" && "Anyone on the internet can edit."}
                </span>
              </span>
            </label>
          ))}
        </div>

        {shareUrl && (
          <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <code className="break-all text-xs text-zinc-800 dark:text-zinc-200">
              {shareUrl}
            </code>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Copy link
              </button>
              {board.visibility === "link" && (
                <button
                  type="button"
                  onClick={() => start(() => regenerateLinkToken(board.id))}
                  disabled={pending}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Regenerate
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
