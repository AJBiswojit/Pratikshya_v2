export default function FutureNote({ title, children }) {
  return (
    <aside className="border border-dashed border-mist bg-canvas/70 px-4 py-3">
      <p className="font-ui text-[10px] uppercase tracking-[.2em] text-brass">{title}</p>
      <p className="mt-1.5 font-ui text-[12px] leading-relaxed text-taupe">{children}</p>
    </aside>
  );
}
