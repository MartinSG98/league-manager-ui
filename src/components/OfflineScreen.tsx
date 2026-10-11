export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="page center">
      <div className="eyebrow">Connection</div>
      <h1 className="display">The server is not answering</h1>
      <p className="lead">
        Start the backend with <code>uvicorn app.main:app --port 8020</code> in league-manager-backend, then try again.
      </p>
      <p style={{ marginTop: 24 }}>
        <button className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      </p>
    </div>
  );
}
