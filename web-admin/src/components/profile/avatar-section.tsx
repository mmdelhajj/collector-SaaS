"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteAvatarAction, uploadAvatarAction } from "@/lib/profile-actions";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function AvatarSection({
  initialHasAvatar,
  initialVersion,
  name,
}: {
  initialHasAvatar: boolean;
  initialVersion: string | null;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasAvatar, setHasAvatar] = useState(initialHasAvatar);
  // Cache buster used in the <img src> — changes after every upload/remove
  // so the browser refetches even when the path stays /api/avatar/me.
  const [version, setVersion] = useState<string>(initialVersion ?? "0");

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U";

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 2 MB or smaller");
      e.target.value = "";
      return;
    }

    // Optimistic preview while the upload runs.
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const fd = new FormData();
    fd.append("avatar", file);

    startTransition(async () => {
      const res = await uploadAvatarAction(fd);
      URL.revokeObjectURL(localUrl);
      setPreviewUrl(null);
      e.target.value = "";
      if (res.ok) {
        setHasAvatar(true);
        setVersion(String(Date.now()));
        toast.success("Avatar updated");
      } else {
        toast.error(res.error ?? "Upload failed");
      }
    });
  }

  function remove() {
    if (!confirm("Remove your avatar? You can upload a new one anytime."))
      return;
    startTransition(async () => {
      const res = await deleteAvatarAction();
      if (res.ok) {
        setHasAvatar(false);
        setVersion(String(Date.now()));
        toast.success("Avatar removed");
      } else {
        toast.error(res.error ?? "Could not remove");
      }
    });
  }

  const displayUrl = previewUrl
    ? previewUrl
    : hasAvatar
      ? `/api/avatar/me?v=${version}`
      : null;

  return (
    <section className="flex flex-wrap items-center gap-5 rounded-2xl border bg-card p-6">
      <div className="relative">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="Profile photo"
            className="size-20 rounded-full border-2 border-card object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary ring-2 ring-primary/20">
            {initials}
          </div>
        )}
        {isPending && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="size-5 animate-spin" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-[200px]">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          <UserCircle2 className="size-4 text-muted-foreground" />
          Profile photo
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          JPG, PNG, or WebP. Up to 2 MB. Square images look best.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChosen}
        />
        <Button
          type="button"
          onClick={pickFile}
          disabled={isPending}
          className="gap-1.5"
        >
          <ImagePlus className="size-4" />
          {hasAvatar ? "Replace" : "Upload"}
        </Button>
        {hasAvatar && (
          <Button
            type="button"
            variant="outline"
            onClick={remove}
            disabled={isPending}
            className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
        )}
      </div>
    </section>
  );
}
