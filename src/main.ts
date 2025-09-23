import { parse as djot_parse } from "@djot/parse.ts"
import { renderHTML as djot_render } from "@djot/html.ts"
import { html_ugly, Page } from "./templates.tsx"
import { debounce } from "jsr:@std/async/debounce";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { serveDir } from "jsr:@std/http/file-server";

type Options = {
    source_dir: string,
    target_dir: string
}

function renderFromDjot(src: string) {
    const title = { value: "" }
    const ast = djot_parse(src)
    const content = djot_render(ast, {
        overrides: {
            heading: (node, renderer) => {
                const inner = renderer.renderChildren(node)
                if (node.level == 1) {
                    title.value = inner
                }
                return `<h1>${inner}</h1>`
            }
        }
    })
    return { content, title: title.value }
}

async function copyDir(src: string, dest: string) {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;
    if (entry.isDirectory) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

async function build({ source_dir, target_dir } : Options) {
    await Deno.mkdir(target_dir, { recursive: true });
    const decoder = new TextDecoder("utf8");
    const encoder = new TextEncoder();
    for await (const src of Deno.readDir(source_dir)) {
        const src_path = src.name;
        if (src_path.match(/^.*\.dj$/)) {
            const src = decoder.decode(await Deno.readFile(source_dir + '/' + src_path));
            const { content, title } = renderFromDjot(src);
            const page = html_ugly(Page(title, 'test', content));
            await Deno.writeFile(target_dir + '/' + src_path.replace(/\.dj$/, '.html'), encoder.encode(page));
        }
    }
    copyDir(source_dir + '/static', target_dir + '/static');
    const fmt_command = new Deno.Command("bash", {
        args: ["-c", `deno fmt ${target_dir}/*`]
    })
    fmt_command.spawn().status
}

async function serve(options: Options) {
    await Deno.serve((req) => {
        return serveDir(req, {
            fsRoot: options.target_dir,
        });
    }).finished;
}

async function watch(options: Options) {
    const build_debounced = debounce((_event: Deno.FsEvent) => {
        build(options)
    }, 200);

    const watcher = Deno.watchFs(options.source_dir);

    for await (const event of watcher) {
      build_debounced(event);
    }
}

export async function main() {
    const options = {
        source_dir: 'site',
        target_dir: 'out'
    }

    const flags = parseArgs(Deno.args, {
      boolean: ["build", "watch"],
    });

    if (flags.build) {
        await build(options)
    }

    if (flags.watch) {
        await Promise.all([watch(options), serve(options)])
    }
}

main()
