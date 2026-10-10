/* Bộ render bài viết dùng chung (trang /post và trình soạn /admin/post): mã màu Minecraft, Markdown-lite, frontmatter. */
/* ============================================================== */
/* Minecraft color / format codes (&0-&9, &a-&f, &l &m &n &o, &r) */
/* ============================================================== */

const MC_COLORS = {
    "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
    "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
    "8": "#555555", "9": "#5555FF", a: "#55FF55", b: "#55FFFF",
    c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
};

const MC_FORMATS = {
    l: "font-weight:bold;",
    m: "text-decoration:line-through;",
    n: "text-decoration:underline;",
    o: "font-style:italic;",
};

// Converts "&e&lYellow bold&r normal" into styled <span> tags. Only
// touches "&x" sequences with a valid Minecraft code, so it's safe to
// run over ordinary text containing a stray "&".
function parseMinecraftColors(text) {
    const tokens = text.split(/(&[0-9a-fk-or])/i);
    let color = null;
    const formats = new Set();
    let html = "";
    let openSpan = false;

    function closeSpan() {
        if (openSpan) {
            html += "</span>";
            openSpan = false;
        }
    }

    tokens.forEach((tok) => {
        const m = tok.match(/^&([0-9a-fk-or])$/i);
        if (m) {
            const code = m[1].toLowerCase();
            if (code === "r") {
                closeSpan();
                color = null;
                formats.clear();
            } else if (MC_COLORS[code]) {
                closeSpan();
                color = MC_COLORS[code];
                formats.clear(); // a new color code resets active formats too
            } else if (MC_FORMATS[code]) {
                formats.add(code);
            } else if (code === "k") {
                formats.add("k");
            }
            return;
        }
        if (!tok) return;

        let style = "";
        let extraClass = "";
        if (color) style += `color:${color};`;
        formats.forEach((f) => {
            if (f === "k") extraClass = "mc-obfuscated";
            else style += MC_FORMATS[f] || "";
        });

        if (style || extraClass) {
            closeSpan();
            html += `<span${extraClass ? ` class="${extraClass}"` : ""}${style ? ` style="${style}"` : ""}>`;
            openSpan = true;
        }
        html += tok;
    });

    closeSpan();
    return html;
}

// Applies Minecraft colors only to text between HTML tags, so it never
// corrupts an href/src attribute (e.g. a query string containing "&e=1").
function applyMinecraftColorsToHtml(html) {
    return html.replace(/(<[^>]+>)|([^<]+)/g, (whole, tag, text) =>
        tag ? tag : parseMinecraftColors(text)
    );
}

/* ============================================================== */
/* Minimal markdown: images, links, raw HTML passthrough           */
/* ============================================================== */

function markdownLiteToHtml(md) {
    const text = md.replace(/\r\n/g, "\n").trim();
    const blocks = text.split(/\n\s*\n/);

    const htmlBlocks = blocks.map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";

        // A block that is just one image on its own -> block-level figure
        const imgOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgOnly) {
            const [, alt, url] = imgOnly;
            return `<div class="post-image"><img src="${url}" alt="${alt}" loading="lazy" /></div>`;
        }

        // A block that already starts with a block-level HTML tag (e.g. a
        // <a class="btn"> button on its own line) — leave it as-is.
        if (/^<(div|a|img|h[1-6]|blockquote|ul|ol)\b/i.test(trimmed)) {
            return trimmed;
        }

        const inline = trimmed
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\n/g, "<br>");

        return `<p>${inline}</p>`;
    });

    return htmlBlocks.filter(Boolean).join("\n");
}

function renderPostBody(rawMarkdown) {
    return applyMinecraftColorsToHtml(markdownLiteToHtml(rawMarkdown));
}

/* ============================================================== */
/* Frontmatter parsing                                              */
/* ============================================================== */

function parseFrontmatter(raw) {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw };
    const meta = {};
    match[1].split("\n").forEach((line) => {
        const m = line.match(/^([\w-]+):\s*"?([^"]*?)"?\s*$/);
        if (m) meta[m[1]] = m[2];
    });
    return { meta, body: match[2] };
}
