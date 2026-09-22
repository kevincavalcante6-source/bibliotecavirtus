import { Link } from "react-router-dom";

interface Props {
  title: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
}

export function EmptyState({ title, message, actionLabel, actionTo }: Props) {
  return (
    <div className="state">
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && actionTo && (
        <Link className="btn btn--secondary" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
