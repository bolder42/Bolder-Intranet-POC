import { WikiPageSchema } from "@bolder/shared";
import { apiFetch } from "@/lib/api";
import { WikiWorkspace } from "./wiki-workspace";

export interface WikiPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function WikiPage({ params, searchParams }: WikiPageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  try {
    const response = await apiFetch(`/wiki/${projectId}`);
    if (!response.ok) return <p role="alert">Unable to load this project wiki.</p>;
    const payload = (await response.json()) as { pages: unknown[] };
    const pages = payload.pages.map((page) => WikiPageSchema.parse(page));
    const selectedPageId = query.page && /^\d+$/.test(query.page) ? Number(query.page) : undefined;
    return (
      <WikiWorkspace
        projectId={projectId}
        initialPages={pages}
        {...(selectedPageId === undefined ? {} : { selectedPageId })}
      />
    );
  } catch {
    return <p role="alert">Unable to load this project wiki. Check the API connection.</p>;
  }
}
