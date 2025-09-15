"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { EditProjectSection } from "@/components/dashboard/EditProject";

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = useMemo(() => String(params?.id ?? ""), [params]);

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 py-10 mobile-bottom-safe">
      <div className="container mx-auto max-w-5xl space-y-6">
        <h1 className="font-serif text-2xl">Editar proyecto</h1>
        <EditProjectSection projectId={projectId} />
      </div>
    </main>
  );
}
