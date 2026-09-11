/**
 * Reusable kanban board. Columns are defined as:
 *   { key, label, dot, matches(item) }
 * Cards are rendered by the caller via renderCard(item); clicking a card
 * calls onCardClick(item) when provided.
 */
export default function KanbanBoard({ columns, items, renderCard, onCardClick }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-full items-start gap-4 px-1">
        {columns.map((col) => {
          const inCol = items.filter(col.matches);
          return (
            <div
              key={col.key}
              className="flex w-72 shrink-0 flex-col rounded-xl border border-line bg-paper-deep/60 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                  <span className={`h-2 w-2 rounded-full ${col.dot || "bg-ink-faint"}`} />
                  {col.label}
                </span>
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                  {inCol.length}
                </span>
              </div>
              <div className="flex-1 space-y-2.5">
                {inCol.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onCardClick?.(item)}
                    role={onCardClick ? "button" : undefined}
                    className={`rounded-lg border border-line bg-surface p-3 shadow-card transition-shadow ${
                      onCardClick ? "cursor-pointer hover:shadow-pop" : ""
                    }`}
                  >
                    {renderCard(item)}
                  </div>
                ))}
                {inCol.length === 0 && (
                  <div className="rounded-lg border border-dashed border-line-strong px-3 py-5 text-center text-xs text-ink-faint">
                    No items
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}