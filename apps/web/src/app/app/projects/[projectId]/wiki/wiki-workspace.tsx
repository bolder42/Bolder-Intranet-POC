"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { WikiPage } from "@bolder/shared";
import { createWikiPage, removeWikiPage, updateWikiPage } from "./actions";

function inline(text: string, pages: WikiPage[], projectId: string, keyPrefix: string) {
  const parts = text.split(
    /(\[\[[^\]]+\]\]|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g,
  );
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const wiki = /^\[\[([^\]]+)\]\]$/.exec(part);
    if (wiki) {
      const title = wiki[1]!.trim();
      const target = pages.find((page) => page.title === title);
      return target ? (
        <Link key={key} href={`/app/projects/${projectId}/wiki?page=${target.id}`}>
          {title}
        </Link>
      ) : (
        <span key={key} className="wiki-unresolved-link" title="Page not found">
          {title}
        </span>
      );
    }
    const markdownLink = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (markdownLink)
      return (
        <a key={key} href={markdownLink[2]} target="_blank" rel="noreferrer">
          {markdownLink[1]}
        </a>
      );
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={key}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownPreview({
  content,
  pages,
  projectId,
  showEmptyHint = false,
}: {
  content: string;
  pages: WikiPage[];
  projectId: string;
  showEmptyHint?: boolean;
}) {
  const blocks: ReactNode[] = [];
  const lines = content.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  const flushParagraph = () => {
    if (paragraph.length)
      blocks.push(
        <p key={`p-${blocks.length}`}>
          {inline(paragraph.join(" "), pages, projectId, `p-${blocks.length}`)}
        </p>,
      );
    paragraph = [];
  };
  const flushList = () => {
    if (list.length)
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {list.map((item, index) => (
            <li key={index}>{inline(item, pages, projectId, `li-${blocks.length}-${index}`)}</li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const [index, line] of lines.entries()) {
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      if (code === null) code = [];
      else {
        blocks.push(
          <pre key={`code-${index}`}>
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const children = inline(heading[2]!, pages, projectId, `h-${index}`);
      const level = heading[1]!.length;
      blocks.push(
        level === 1 ? (
          <h1 key={index}>{children}</h1>
        ) : level === 2 ? (
          <h2 key={index}>{children}</h2>
        ) : (
          <h3 key={index}>{children}</h3>
        ),
      );
    } else if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <blockquote key={index}>
          {inline(line.slice(2), pages, projectId, `q-${index}`)}
        </blockquote>,
      );
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  if (code)
    blocks.push(
      <pre key="code-end">
        <code>{code.join("\n")}</code>
      </pre>,
    );
  return (
    <div className="wiki-markdown">
      {blocks.length ? (
        blocks
      ) : showEmptyHint ? (
        <p className="wiki-empty-preview">Nothing to preview yet.</p>
      ) : null}
    </div>
  );
}

export function WikiWorkspace({
  projectId,
  initialPages,
  selectedPageId,
}: {
  projectId: string;
  initialPages: WikiPage[];
  selectedPageId?: number;
}) {
  const [pages, setPages] = useState(initialPages);
  const [activePageId, setActivePageId] = useState<number | null>(
    selectedPageId ?? initialPages[0]?.id ?? null,
  );
  const lastRoutePageId = useRef(selectedPageId);
  const selected = pages.find((page) => page.id === activePageId);
  const [title, setTitle] = useState(selected?.title ?? "");
  const [content, setContent] = useState(selected?.content ?? "");
  const [editing, setEditing] = useState(!selected);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [markdownHelpOpen, setMarkdownHelpOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (lastRoutePageId.current === selectedPageId) return;
    lastRoutePageId.current = selectedPageId;
    const nextId = selectedPageId ?? initialPages[0]?.id ?? null;
    const nextPage = initialPages.find((page) => page.id === nextId);
    setActivePageId(nextId);
    if (nextPage) {
      setTitle(nextPage.title);
      setContent(nextPage.content);
      setEditing(false);
      setConfirmingDelete(false);
      setError("");
    }
  }, [initialPages, selectedPageId]);

  function selectPage(page: WikiPage) {
    setActivePageId(page.id);
    setTitle(page.title);
    setContent(page.content);
    setEditing(false);
    setConfirmingDelete(false);
    setError("");
  }
  function save() {
    if (!title.trim()) {
      setError("Give this page a title.");
      return;
    }
    startTransition(async () => {
      try {
        if (selected) {
          const result = await updateWikiPage(projectId, selected.id, {
            title: title.trim(),
            content,
          });
          const page = (result as { page: WikiPage }).page;
          setPages((current) => current.map((item) => (item.id === page.id ? page : item)));
        } else {
          const result = await createWikiPage(projectId, { title: title.trim(), content });
          const page = (result as { page: WikiPage }).page;
          setPages((current) => [...current, page]);
          setActivePageId(page.id);
        }
        setEditing(false);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save page.");
      }
    });
  }
  function addPage() {
    setActivePageId(null);
    setTitle("");
    setContent("");
    setEditing(true);
    setError("");
  }
  function deletePage() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await removeWikiPage(projectId, selected.id);
        const remaining = pages.filter((page) => page.id !== selected.id);
        setPages(remaining);
        setActivePageId(remaining[0]?.id ?? null);
        setTitle(remaining[0]?.title ?? "");
        setContent(remaining[0]?.content ?? "");
        setEditing(!remaining.length);
        setConfirmingDelete(false);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to delete page.");
      }
    });
  }

  return (
    <section className="wiki-workspace" aria-label="Project wiki">
      <aside className="wiki-page-list">
        <div className="wiki-list-heading">
          <div>
            <h1>Wiki</h1>
            <p>Markdown knowledge base</p>
            <span className="wiki-page-count">
              {pages.length} {pages.length === 1 ? "page" : "pages"} in this project
            </span>
          </div>
          <button type="button" onClick={addPage} aria-label="Create page">
            ＋
          </button>
        </div>
        <nav aria-label="Wiki pages">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/app/projects/${projectId}/wiki?page=${page.id}`}
              onClick={() => selectPage(page)}
              aria-current={page.id === selected?.id ? "page" : undefined}
            >
              {page.title}
            </Link>
          ))}
        </nav>
        {!pages.length && (
          <p className="wiki-list-empty">Create the first page for this project.</p>
        )}
      </aside>
      <div className="wiki-editor-pane">
        {selected || editing ? (
          <>
            <div className="wiki-toolbar">
              {editing ? (
                <input
                  aria-label="Page title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Page title"
                />
              ) : (
                <h2>{selected?.title}</h2>
              )}
              <div className="wiki-actions">
                <button
                  type="button"
                  className="wiki-help-button"
                  aria-label="Markdown help"
                  aria-haspopup="dialog"
                  onClick={() => setMarkdownHelpOpen(true)}
                >
                  ?
                </button>
                {editing ? (
                  <>
                    <button type="button" onClick={save} disabled={pending}>
                      Save
                    </button>
                    {selected && (
                      <button
                        type="button"
                        className="wiki-secondary"
                        onClick={() => selectPage(selected)}
                      >
                        Cancel
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDelete(false);
                        setEditing(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="wiki-secondary"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            {editing ? (
              <div className="wiki-edit-grid">
                <label>
                  Markdown
                  <textarea
                    aria-label="Markdown content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={"# Project notes\n\nLink another page with [[Page title]]."}
                  />
                </label>
                <div>
                  <span className="wiki-preview-label">Preview</span>
                  <MarkdownPreview
                    content={content}
                    pages={pages}
                    projectId={projectId}
                    showEmptyHint
                  />
                </div>
              </div>
            ) : (
              <article className="wiki-reading">
                <MarkdownPreview
                  content={selected?.content ?? ""}
                  pages={pages}
                  projectId={projectId}
                />
              </article>
            )}
            {error && (
              <p role="alert" className="wiki-error">
                {error}
              </p>
            )}
            {confirmingDelete && selected && (
              <div
                className="wiki-delete-confirmation"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="wiki-delete-title"
              >
                <div>
                  <h3 id="wiki-delete-title">Delete “{selected.title}”?</h3>
                  <p>This page will be permanently deleted.</p>
                </div>
                <div className="wiki-actions">
                  <button type="button" onClick={deletePage} disabled={pending}>
                    {pending ? "Deleting…" : "Confirm deletion"}
                  </button>
                  <button
                    type="button"
                    className="wiki-secondary"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={pending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {markdownHelpOpen && (
              <div
                className="wiki-help-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setMarkdownHelpOpen(false);
                }}
              >
                <section
                  className="wiki-help-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="wiki-help-title"
                >
                  <div className="wiki-help-heading">
                    <div>
                      <p>QUICK REFERENCE</p>
                      <h2 id="wiki-help-title">Markdown help</h2>
                    </div>
                    <button
                      type="button"
                      aria-label="Close Markdown help"
                      onClick={() => setMarkdownHelpOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <dl className="wiki-help-list">
                    <div>
                      <dt>Title</dt>
                      <dd>
                        <code># Project overview</code>
                        <span>Start with #, ##, or ### for heading levels.</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Bold</dt>
                      <dd>
                        <code>**important text**</code>
                        <span>Surround text with two asterisks.</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Bullet list</dt>
                      <dd>
                        <code>- First item</code>
                        <span>Start each item with - and a space.</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Wiki link</dt>
                      <dd>
                        <code>[[Architecture]]</code>
                        <span>Links to a page with that exact title in this project.</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Web link</dt>
                      <dd>
                        <code>[Bolder](https://example.com)</code>
                        <span>Use a label in brackets and a URL in parentheses.</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Code block</dt>
                      <dd>
                        <pre className="wiki-help-code-sample">
                          <code>{"```\nconst value = 42;\n```"}</code>
                        </pre>
                        <span>Put the opening and closing triple backticks on separate lines.</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Quote</dt>
                      <dd>
                        <code>&gt; A useful note</code>
                        <span>Start a line with &gt; and a space.</span>
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            )}
          </>
        ) : (
          <div className="wiki-empty-state">
            <h2>Project knowledge, together</h2>
            <p>Create Markdown pages and connect them with wiki links.</p>
            <button type="button" onClick={addPage}>
              Create a page
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
