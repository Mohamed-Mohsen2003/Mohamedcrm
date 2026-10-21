"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace, type CreateKind } from "./workspace-context";

export function CreateButton({ kind, label, defaults, variant = "primary" }: { kind: CreateKind; label: string; defaults?: Record<string, string | undefined>; variant?: "primary" | "secondary" }) {
  const { openCreate } = useWorkspace();
  return (
    <Button variant={variant} onClick={() => openCreate(kind, defaults)}>
      <Plus />
      {label}
    </Button>
  );
}
