import { Fragment } from "react";

/** Tiny dependency-free markdown renderer for model output: headings, lists, bold, italics, code, paragraphs. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={className ?? "prose-brain text-[15px] leading-relaxed"}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) return null;
        const h = /^(#{1,6})\s+(.*)$/.exec(lines[0]);
        if (h && lines.length === 1) {
          const level = h[1].length;
          const cls = level <= 2 ? "mt-6 text-xl font-semibold tracking-tight" : "mt-5 text-base font-semibold";
          return (
            <p key={i} className={cls}>
              <Inline text={h[2]} />
            </p>
          );
        }
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const items = lines.map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
          return ordered ? (
            <ol key={i} className="my-3 list-decimal pl-5">
              {items.map((it, j) => (
                <li key={j} className="my-1">
                  <Inline text={it} />
                </li>
              ))}
            </ol>
          ) : (
            <ul key={i} className="my-3 list-disc pl-5">
              {items.map((it, j) => (
                <li key={j} className="my-1">
                  <Inline text={it} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-3">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={l.replace(/^#{1,6}\s+/, "")} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (/^`[^`]+`$/.test(p)) return <code key={i} className="rounded bg-paper-2 px-1 font-mono text-[13px]">{p.slice(1, -1)}</code>;
        if (/^_[^_]+_$/.test(p) || /^\*[^*]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
