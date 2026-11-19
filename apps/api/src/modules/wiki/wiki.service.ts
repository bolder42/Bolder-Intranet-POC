import { requireProjectMember } from "@bolder/auth";
import type { AuthContext } from "@bolder/auth";
import { ApiError, ErrorCode, type CreateWikiInput, type UpdateWikiInput } from "@bolder/shared";
import { wikiRepo } from "./wiki.repo.js";

function requirePage(projectId: number, pageId: number) {
  const page = wikiRepo.byId(projectId, pageId);
  if (!page) throw new ApiError(ErrorCode.NOT_FOUND, "Wiki page not found.");
  return page;
}

function checkTitle(projectId: number, title: string, exceptId?: number) {
  const match = wikiRepo.byTitle(projectId, title);
  if (match && match.id !== exceptId)
    throw new ApiError(
      ErrorCode.CONFLICT,
      "A wiki page with this title already exists in the project.",
    );
}

export function listWiki(ctx: AuthContext, projectId: number) {
  requireProjectMember(ctx, projectId);
  return wikiRepo.list(projectId);
}

export function getWikiPage(ctx: AuthContext, projectId: number, pageId: number) {
  requireProjectMember(ctx, projectId);
  return requirePage(projectId, pageId);
}

export function createWikiPage(ctx: AuthContext, projectId: number, input: CreateWikiInput) {
  requireProjectMember(ctx, projectId);
  checkTitle(projectId, input.title);
  return wikiRepo.create({ ...input, projectId, authorId: ctx.user.id });
}

export function updateWikiPage(
  ctx: AuthContext,
  projectId: number,
  pageId: number,
  input: UpdateWikiInput,
) {
  requireProjectMember(ctx, projectId);
  requirePage(projectId, pageId);
  if (input.title !== undefined) checkTitle(projectId, input.title, pageId);
  const patch: { title?: string; content?: string } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;
  return wikiRepo.update(projectId, pageId, patch);
}

export function deleteWikiPage(ctx: AuthContext, projectId: number, pageId: number) {
  requireProjectMember(ctx, projectId);
  requirePage(projectId, pageId);
  wikiRepo.delete(projectId, pageId);
}
