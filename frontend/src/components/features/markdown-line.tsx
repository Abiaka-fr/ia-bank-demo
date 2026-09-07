import { cn } from "cn";

import { parseInline, parseMarkdownLine, type InlineSegment } from "@/lib/simple-markdown";

function InlineText({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.code) {
          return (
            <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {segment.text}
            </code>
          );
        }
        if (segment.bold) {
          return (
            <strong key={index} className="font-semibold">
              {segment.text}
            </strong>
          );
        }
        if (segment.italic) {
          return <em key={index}>{segment.text}</em>;
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </>
  );
}

const HEADING_SIZE_CLASSES: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "text-lg font-semibold",
  2: "text-base font-semibold",
  3: "text-base font-medium",
  4: "text-sm font-semibold",
  5: "text-sm font-medium",
  6: "text-sm font-medium text-muted-foreground",
};

const HEADING_TAGS: Record<1 | 2 | 3 | 4 | 5 | 6, "h4" | "h5" | "h6"> = {
  1: "h4",
  2: "h5",
  3: "h6",
  4: "h6",
  5: "h6",
  6: "h6",
};

/**
 * Rend une ligne de texte source (régulation ou procédure) en Markdown minimal —
 * titres, gras, italique, code, listes, citations. Voir `lib/simple-markdown.ts`.
 *
 * Une ligne = un bloc : ne fusionne pas les listes ou citations consécutives en un
 * seul élément, pour rester alignée avec la logique de surlignage par ligne de
 * `procedure-evidence-dialog.tsx`, qui repère un passage cité par index de ligne dans
 * le texte brut.
 */
export function MarkdownLine({
  text,
  className,
  leading,
}: {
  text: string;
  className?: string;
  /** Contenu inséré avant le texte, sur la même ligne (ex. badge « Cité »). */
  leading?: React.ReactNode;
}) {
  const node = parseMarkdownLine(text);

  switch (node.type) {
    case "empty":
      return null;
    case "heading": {
      // h4/h5/h6 uniquement : un titre de document source ne doit jamais entrer en
      // conflit avec la hiérarchie de titres de la page qui l'affiche (h1 le nom de
      // l'écran, h2/h3 ses sections).
      const Tag = HEADING_TAGS[node.level];
      return (
        <Tag className={cn(HEADING_SIZE_CLASSES[node.level], className)}>
          {leading}
          <InlineText segments={node.segments} />
        </Tag>
      );
    }
    case "blockquote":
      return (
        <p className={cn("border-l-2 pl-3 text-muted-foreground italic", className)}>
          {leading}
          <InlineText segments={node.segments} />
        </p>
      );
    case "listItem":
      return (
        <p className={cn("flex gap-2", className)}>
          <span aria-hidden className="text-muted-foreground">
            •
          </span>
          <span>
            {leading}
            <InlineText segments={node.segments} />
          </span>
        </p>
      );
    case "paragraph":
      return (
        <p className={className}>
          {leading}
          <InlineText segments={node.segments} />
        </p>
      );
  }
}

/** Version « fil de texte » — segments inline sans détection de titre/citation/liste,
 * pour un excerpt court affiché sur une seule ligne visuelle (carte de preuve). */
export function MarkdownInline({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <InlineText segments={parseInline(text)} />
    </span>
  );
}
