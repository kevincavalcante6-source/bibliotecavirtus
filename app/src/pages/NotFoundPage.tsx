import { EmptyState } from "@/components/states/EmptyState";

export function NotFoundPage() {
  return (
    <div className="wrap">
      <EmptyState
        title="Página não encontrada"
        message="O endereço acessado não existe nesta biblioteca."
        actionLabel="Voltar ao início"
        actionTo="/"
      />
    </div>
  );
}
