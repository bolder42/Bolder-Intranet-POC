import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  redirect: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/api", () => ({
  getAuthHeaders: async () => ({ authorization: "Bearer test" }),
  api: {
    api: {
      projects: { $post: mocks.post, ":projectId": { $patch: mocks.patch, $delete: mocks.delete } },
    },
  },
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveProject, deleteProjectAction } from "./actions";
beforeEach(() => {
  vi.clearAllMocks();
});
function form() {
  const data = new FormData();
  data.set("name", "Apollo");
  data.set("deadline", "2026-11-06");
  data.append("memberIds", "2");
  return data;
}
it("denies Dev deletion before calling the API", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "dev" } });
  expect(await deleteProjectAction("", form())).toContain("cannot");
  expect(mocks.delete).not.toHaveBeenCalled();
});
it.each(["admin", "tech_lead"])("deletes and returns %s to the project list", async (role) => {
  mocks.auth.mockResolvedValue({ user: { role } });
  mocks.delete.mockResolvedValue({ ok: true });
  const data = form();
  data.set("projectId", "4");
  await deleteProjectAction("", data);
  expect(mocks.delete).toHaveBeenCalledWith(
    { param: { projectId: "4" } },
    { headers: { authorization: "Bearer test" } },
  );
  expect(mocks.revalidate).toHaveBeenCalledWith("/app", "layout");
  expect(mocks.redirect).toHaveBeenCalledWith("/app/projects");
});
it("does not redirect when deletion fails", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "admin" } });
  mocks.delete.mockResolvedValue({ ok: false });
  const data = form();
  data.set("projectId", "4");
  expect(await deleteProjectAction("", data)).toContain("Unable to delete");
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("denies Dev mutations before contacting the API", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "dev" } });
  expect(await saveProject("", form())).toContain("cannot");
  expect(mocks.post).not.toHaveBeenCalled();
});
it("creates a project with deadline and participants then opens Overview", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "tech_lead" } });
  mocks.post.mockResolvedValue({ ok: true, json: async () => ({ project: { id: 4 } }) });
  await saveProject("", form());
  expect(mocks.post).toHaveBeenCalledWith(
    { json: { name: "Apollo", description: "", deadline: Date.UTC(2026, 10, 6), memberIds: [2] } },
    { headers: { authorization: "Bearer test" } },
  );
  expect(mocks.redirect).toHaveBeenCalledWith("/app/projects/4");
});
it("edits project metadata and can clear its deadline", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "admin" } });
  mocks.patch.mockResolvedValue({ ok: true, json: async () => ({ project: { id: 4 } }) });
  const data = form();
  data.set("projectId", "4");
  data.set("deadline", "");
  await saveProject("", data);
  expect(mocks.patch).toHaveBeenCalledWith(
    { param: { projectId: "4" }, json: { name: "Apollo", description: "", deadline: null } },
    { headers: { authorization: "Bearer test" } },
  );
});
it("keeps the form available after API failures", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "admin" } });
  mocks.post.mockRejectedValue(new Error("offline"));
  expect(await saveProject("", form())).toContain("reach the API");
  expect(mocks.redirect).not.toHaveBeenCalled();
});
