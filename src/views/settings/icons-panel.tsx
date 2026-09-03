import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Download } from "lucide-react";
import { openUrl } from "@/lib/window";
import { useT } from "@/lib/i18n";
import { downloadText } from "@/lib/download-text";
import { LottiePlayer } from "@/components/lottie-player";
import { Section } from "./shared";
import { ROW_DESC } from "./kit";

type Glob = Record<string, string>;
type LazyGlob = Record<string, () => Promise<unknown>>;

const NAV_URL = import.meta.glob("../../assets/nav-icons/*.svg", { eager: true, query: "?url", import: "default" }) as Glob;
const UI_URL = import.meta.glob("../../assets/ui-icons/*.svg", { eager: true, query: "?url", import: "default" }) as Glob;

const SVG_RAW = import.meta.glob(["../../assets/nav-icons/*.svg", "../../assets/ui-icons/*.svg"], {
  query: "?raw",
  import: "default",
}) as LazyGlob;

const LOTTIE_NAV = import.meta.glob("../../assets/lottie/nav/*.json") as LazyGlob;
const LOTTIE_MAIN = import.meta.glob("../../assets/lottie/*.json") as LazyGlob;

function stem(path: string): string {
  const file = path.slice(path.lastIndexOf("/") + 1);
  return file.slice(0, file.lastIndexOf("."));
}

const NAMES: Record<string, string> = {
  livetv: "Live TV",
  "live-tv": "Live TV",
  tv: "TV",
  xray: "X-Ray",
  ebook: "eBook",
  "wt-waiting-dark": "Watch together (dark)",
  "wt-waiting-white": "Watch together (light)",
  "addons-boat-dark": "Addons boat (dark)",
  "addons-boat-white": "Addons boat (light)",
  "install-boat-white": "Install boat",
  "harbor-loader": "Harbor loader",
  "flame-streak": "Flame streak",
  "voyage-boat": "Voyage boat",
  "mark-unwatched": "Mark unwatched",
  "mark-watched": "Mark watched",
  "customize-subtitles": "Customize subtitles",
  "all-addons": "All addons",
  "play-filled": "Play",
  "skip-fwd": "Skip forward",
  "save-banner": "Save banner",
  "watch-together": "Watch together",
  "auto-sync": "Auto sync",
  "manual-offset": "Manual offset",
  "thumbs-up": "Thumbs up",
};

function pretty(name: string): string {
  const known = NAMES[name];
  if (known) return known;
  const words = name.split(/[-_]/g).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function entries(glob: Glob): Array<{ key: string; name: string; url: string }> {
  return Object.keys(glob)
    .sort()
    .map((k) => ({ key: k, name: stem(k), url: glob[k] }));
}

function useInView<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (rows) => {
        if (rows.some((r) => r.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

function useSaved(): [string | null, (id: string) => void] {
  const [id, setId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const flash = useCallback((next: string) => {
    setId(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setId(null), 1500);
  }, []);
  return [id, flash];
}

function IconTile({
  item,
  saved,
  onSave,
}: {
  item: { key: string; name: string; url: string };
  saved: boolean;
  onSave: (key: string, name: string) => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      className="hset-icon-tile"
      onClick={() => onSave(item.key, item.name)}
      title={t("Save as SVG")}
    >
      <span className="hset-icon-art">
        <span
          aria-hidden
          className="hset-icon-mask"
          style={{ maskImage: `url("${item.url}")`, WebkitMaskImage: `url("${item.url}")` }}
        />
        <span className="hset-icon-save" aria-hidden>
          {saved ? <Check size={14} strokeWidth={2.75} /> : <Download size={14} strokeWidth={2.25} />}
        </span>
      </span>
      <span className="hset-icon-name">{pretty(item.name)}</span>
    </button>
  );
}

function IconSet({
  glob,
  savedId,
  flash,
}: {
  glob: Glob;
  savedId: string | null;
  flash: (id: string) => void;
}) {
  const items = useMemo(() => entries(glob), [glob]);
  const save = useCallback(
    async (key: string, name: string) => {
      const load = SVG_RAW[key];
      if (!load) return;
      const raw = (await load()) as string;
      const ok = await downloadText(`${name}.svg`, raw, ["svg"], "SVG");
      if (ok) flash(key);
    },
    [flash],
  );
  return (
    <div className="hset-icon-grid">
      {items.map((it) => (
        <IconTile key={it.key} item={it} saved={savedId === it.key} onSave={save} />
      ))}
    </div>
  );
}

function AnimationTile({
  path,
  load,
  saved,
  onSave,
}: {
  path: string;
  load: () => Promise<unknown>;
  saved: boolean;
  onSave: (path: string, name: string, data: object) => void;
}) {
  const t = useT();
  const [ref, inView] = useInView<HTMLButtonElement>();
  const [data, setData] = useState<object | null>(null);
  const name = stem(path);

  useEffect(() => {
    if (!inView || data) return;
    let alive = true;
    void load().then((mod) => {
      if (!alive) return;
      const m = mod as { default?: object };
      setData(m.default ?? (mod as object));
    });
    return () => { alive = false; };
  }, [inView, data, load]);

  return (
    <button
      ref={ref}
      type="button"
      className="hset-anim-tile"
      onClick={() => data && onSave(path, name, data)}
      title={t("Save as JSON")}
    >
      <span className="hset-anim-stage">
        {data ? <LottiePlayer data={data} className="h-full w-full" /> : <span className="hset-anim-idle" aria-hidden />}
        <span className="hset-icon-save" aria-hidden>
          {saved ? <Check size={14} strokeWidth={2.75} /> : <Download size={14} strokeWidth={2.25} />}
        </span>
      </span>
      <span className="hset-icon-name">{pretty(name)}</span>
    </button>
  );
}

function AnimationSet({
  glob,
  savedId,
  flash,
}: {
  glob: LazyGlob;
  savedId: string | null;
  flash: (id: string) => void;
}) {
  const keys = useMemo(() => Object.keys(glob).sort(), [glob]);
  const save = useCallback(
    async (path: string, name: string, data: object) => {
      const ok = await downloadText(`${name}.json`, JSON.stringify(data), ["json"], "Lottie");
      if (ok) flash(path);
    },
    [flash],
  );
  return (
    <div className="hset-anim-grid">
      {keys.map((k) => (
        <AnimationTile key={k} path={k} load={glob[k]} saved={savedId === k} onSave={save} />
      ))}
    </div>
  );
}

const ABIYYU_LINKS = [
  { label: "Behance", url: "https://www.behance.net/gallery/251385405/Abiyyus-Portfolio-2026" },
  { label: "Fiverr", url: "https://pro.fiverr.com/freelancers/abiyyusw" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/abiyyu-suryowibisono-976838204" },
];

function AuthorCard({
  name,
  role,
  links,
}: {
  name: string;
  role: string;
  links: Array<{ label: string; url: string }>;
}) {
  const t = useT();
  return (
    <div className="hset-author">
      <span className="hset-author-role">{t(role)}</span>
      <span className="hset-author-name">{name}</span>
      <span className="hset-author-links">
        {links.map((l) => (
          <button key={l.url} type="button" onClick={() => void openUrl(l.url)} className="hset-author-link">
            {l.label}
            <ArrowUpRight size={13} strokeWidth={2.25} aria-hidden />
          </button>
        ))}
      </span>
    </div>
  );
}

export function IconsPanel() {
  const t = useT();
  const [savedId, flash] = useSaved();

  return (
    <>
      <Section
        title={t("Who drew all this")}
        subtitle={t("Harbor did not draw its own icons. Two people did, and they are worth hiring.")}
      >
        <div className="hset-authors">
          <AuthorCard name="Abiyyu Suryowibisono" role="Icons, illustrations, and the cat" links={ABIYYU_LINKS} />
          <AuthorCard
            name="stass_motion"
            role="Animation"
            links={[{ label: "Fiverr", url: "https://pro.fiverr.com/freelancers/stass_motion" }]}
          />
        </div>
      </Section>

      <Section
        title={t("Navigation")}
        subtitle={t("The sidebar set. Click any one to save the SVG.")}
      >
        <IconSet glob={NAV_URL} savedId={savedId} flash={flash} />
      </Section>

      <Section title={t("Interface")} subtitle={t("Buttons, states, and the things that live on a card.")}>
        <IconSet glob={UI_URL} savedId={savedId} flash={flash} />
      </Section>

      <Section title={t("Navigation animations")} subtitle={t("What the sidebar icons do when you land on them.")}>
        <AnimationSet glob={LOTTIE_NAV} savedId={savedId} flash={flash} />
      </Section>

      <Section title={t("Everything else that moves")} subtitle={t("Loaders, boats, and the bits between screens.")}>
        <AnimationSet glob={LOTTIE_MAIN} savedId={savedId} flash={flash} />
      </Section>

      <Section title={t("Using these")}>
        <p className={"max-w-[74ch] " + ROW_DESC}>
          {t(
            "These are Harbor's own, drawn for Harbor. Take them for a theme, a fork, a mockup, a personal project. Keep the credit on the artists and do not sell the set on its own.",
          )}
        </p>
        <p className="hset-attr-fineprint mt-3">
          {t(
            "The controller button glyphs elsewhere in Harbor are not ours. They come from Kenney's Input Prompts, released into the public domain under CC0.",
          )}
        </p>
      </Section>
    </>
  );
}
