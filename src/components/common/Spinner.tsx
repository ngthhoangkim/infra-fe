export function Spinner({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status">
      {label}
    </div>
  );
}
