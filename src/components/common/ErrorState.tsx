interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
