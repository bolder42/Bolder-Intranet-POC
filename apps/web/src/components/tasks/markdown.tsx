"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownProps {
  /** Raw markdown source. */
  children: string;
  /** Extra class on the wrapper, for width / spacing tweaks. */
  className?: string | undefined;
}

/**
 * Renders task descriptions written in Markdown.
 *
 * `react-markdown` never interprets raw HTML — there is no `rehype-raw` in
 * this chain — so the rendered output is safe by default and needs no extra
 * sanitiser. `remark-gfm` adds the GitHub extensions (tables, task lists,
 * strikethrough) that people expect from a description box.
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={["markdown-body", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
