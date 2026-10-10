"use server";
import { CreateProjectSchema, UpdateProjectSchema } from "@bolder/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { api, getAuthHeaders } from "@/lib/api";
export async function saveProject(_previous: string, form: FormData): Promise<string> {
  const session = await auth();
  if (!session?.user || !["tech_lead", "admin"].includes(session.user.role))
    return "You cannot modify projects.";
  const projectId = String(form.get("projectId") ?? "");
  const date = String(form.get("deadline") ?? "");
  const input = {
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    deadline: date ? Date.parse(`${date}T00:00:00Z`) : null,
    memberIds: form.getAll("memberIds").map(Number),
  };
  if (!(projectId ? UpdateProjectSchema : CreateProjectSchema).safeParse(input).success)
    return "Check the project name and deadline.";
  let destination = projectId;
  try {
    const headers = await getAuthHeaders();
    const response = projectId
      ? await api.api.projects[":projectId"].$patch(
          { param: { projectId }, json: UpdateProjectSchema.parse(input) },
          { headers },
        )
      : await api.api.projects.$post({ json: CreateProjectSchema.parse(input) }, { headers });
    if (!response.ok) return "Unable to save the project. Check your permissions and participants.";
    const result = await response.json();
    if (!result.project) return "Unable to save the project.";
    destination = String(result.project.id);
  } catch {
    return "Unable to reach the API. Please try again.";
  }
  revalidatePath("/app");
  revalidatePath("/app/projects", "layout");
  redirect(`/app/projects/${destination}`);
}

export async function deleteProjectAction(_previous: string, form: FormData): Promise<string> {
  const session = await auth();
  if (!session?.user || !["tech_lead", "admin"].includes(session.user.role))
    return "You cannot delete projects.";
  const projectId = String(form.get("projectId") ?? "");
  if (
    !/^\d+$/.test(projectId) ||
    !Number.isSafeInteger(Number(projectId)) ||
    Number(projectId) <= 0
  )
    return "Invalid project.";
  try {
    const headers = await getAuthHeaders();
    const response = await api.api.projects[":projectId"].$delete(
      { param: { projectId } },
      { headers },
    );
    if (!response.ok) return "Unable to delete the project. Check your permissions and try again.";
  } catch {
    return "Unable to reach the API. Please try again.";
  }
  revalidatePath("/app", "layout");
  redirect("/app/projects");
}
