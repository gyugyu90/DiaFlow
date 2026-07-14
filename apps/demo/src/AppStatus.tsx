import { AlertCircle, X } from "lucide-react";

export function BuildVersionBadge() {
  return (
    <div className="build-version" aria-label="Build version">
      Build {__BUILD_VERSION__}
    </div>
  );
}

export function FileErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <section className="file-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <p>{message}</p>
      <button className="icon-button" type="button" onClick={onDismiss} aria-label="Dismiss file error">
        <X size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
