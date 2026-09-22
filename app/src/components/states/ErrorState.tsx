import { Icon } from "@/components/ui/Icon";

interface Props {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact }: Props) {
  return (
    <div className={`state${compact ? " state--inline" : ""}`} role="alert">
      <Icon name="alert" size={22} />
      <h2>Não conseguimos carregar</h2>
      <p>{message ?? "Algo falhou no caminho entre o aplicativo e o servidor."}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          <Icon name="refresh" size={16} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
