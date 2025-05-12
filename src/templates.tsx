/** @jsx h */
/** @jsxFrag Fragment */
// deno-lint-ignore-file no-explicit-any
import { escapeHtml, h, Raw, render, VNode } from "./tsx.ts";

export function html_ugly(node: VNode, doctype = "<!DOCTYPE html>"): string {
  return `${doctype}\n${render(node)}`;
}

function Base({ children, title, description }: { children?: VNode[], title: string, description: string }) {
    return <html lang="en-US">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{title}</title>
            <meta name="description" content={description} />
            <link href="/static/default.css" rel="stylesheet" />
        </head>
        <body>
            <header>
                <nav>
                    <a href="/">Home</a>
                    <a href="/blog.html">Blog</a>
                </nav>
            </header>

            <main>
                {children}
            </main>
        </body>
    </html>
}

export function Page(title: string, description: string, content: string) {
  return (
    <Base
      title={title}
      description={description}
    >
      <Raw unsafe={content} />
    </Base>
  );
}
