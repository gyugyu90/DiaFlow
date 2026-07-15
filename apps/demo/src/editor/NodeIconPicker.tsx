import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import {
  DIAGRAM_ICON_CATALOG,
  resolveDiagramIcon,
  type DiagramIconDefinition,
} from "@interactive-diagram/runtime";

const PICKER_WIDTH = 352;
const PICKER_HEIGHT = 360;
const VIEWPORT_MARGIN = 12;

export function NodeIconPicker({
  defaultIconId,
  onChange,
  value,
}: {
  defaultIconId: string;
  onChange: (iconId: string | undefined) => void;
  value: string | undefined;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN });
  const explicitIcon = resolveDiagramIcon(value);
  const defaultIcon = resolveDiagramIcon(defaultIconId);
  const displayedIcon = value ? explicitIcon : defaultIcon;
  const filteredIcons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return DIAGRAM_ICON_CATALOG;
    return DIAGRAM_ICON_CATALOG.filter((icon) => (
      `${icon.label} ${icon.name} ${icon.category}`.toLowerCase().includes(normalizedQuery)
    ));
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const pressEventName = typeof window.PointerEvent === "function" ? "pointerdown" : "mousedown";
    const handlePress = (event: Event) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const handleResize = () => setIsOpen(false);

    document.addEventListener(pressEventName, handlePress);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener(pressEventName, handlePress);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.left),
        Math.max(VIEWPORT_MARGIN, window.innerWidth - PICKER_WIDTH - VIEWPORT_MARGIN),
      );
      const fitsBelow = rect.bottom + PICKER_HEIGHT + VIEWPORT_MARGIN <= window.innerHeight;
      const top = fitsBelow
        ? rect.bottom + 6
        : Math.max(VIEWPORT_MARGIN, rect.top - PICKER_HEIGHT - 6);
      setPosition({ left, top });
    }
    setQuery("");
    setIsOpen(true);
  }

  function selectIcon(iconId: string | undefined) {
    onChange(iconId);
    setIsOpen(false);
  }

  const selectedLabel = value
    ? explicitIcon?.label ?? value
    : `Auto (${defaultIcon?.label ?? defaultIconId})`;

  return (
    <div className="node-icon-picker">
      <button
        ref={triggerRef}
        className="node-icon-trigger"
        type="button"
        aria-label="Node icon"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => isOpen ? setIsOpen(false) : openPicker()}
      >
        <DiagramIconGlyph icon={displayedIcon} />
        <span>{selectedLabel}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {isOpen ? createPortal(
        <div
          ref={popoverRef}
          className="node-icon-popover"
          style={{ left: position.left, top: position.top }}
          role="dialog"
          aria-label="Choose node icon"
        >
          <header>
            <div>
              <strong>Material Symbols</strong>
              <span>Outlined</span>
            </div>
            <label className="node-icon-search">
              <Search size={15} aria-hidden="true" />
              <input
                autoFocus
                aria-label="Search node icons"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search icons"
              />
            </label>
          </header>

          <div className="node-icon-grid">
            {!query ? (
              <button
                className={`node-icon-option ${value === undefined ? "is-selected" : ""}`}
                type="button"
                aria-label="Use node type icon"
                aria-pressed={value === undefined}
                onClick={() => selectIcon(undefined)}
              >
                <DiagramIconGlyph icon={defaultIcon} />
                <span>Auto</span>
              </button>
            ) : null}
            {filteredIcons.map((icon) => (
              <button
                className={`node-icon-option ${explicitIcon?.id === icon.id ? "is-selected" : ""}`}
                type="button"
                key={icon.id}
                aria-label={`Use ${icon.label} icon`}
                aria-pressed={explicitIcon?.id === icon.id}
                title={`${icon.label} (${icon.id})`}
                onClick={() => selectIcon(icon.id)}
              >
                <DiagramIconGlyph icon={icon} />
                <span>{icon.label}</span>
              </button>
            ))}
            {filteredIcons.length === 0 ? (
              <p className="node-icon-empty">No matching icons</p>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function DiagramIconGlyph({ icon }: { icon: DiagramIconDefinition | null }) {
  if (!icon) return <span className="node-icon-unknown" aria-hidden="true">?</span>;
  return (
    <svg viewBox={icon.viewBox} aria-hidden="true">
      {icon.paths.map((path) => <path d={path} key={path} />)}
    </svg>
  );
}
