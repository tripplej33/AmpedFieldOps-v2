interface FilesBreadcrumbProps {
  projectName?: string | null
  onBack?: () => void
}

export default function FilesBreadcrumb({ projectName, onBack }: FilesBreadcrumbProps) {
  const isRoot = !projectName

  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      {isRoot ? (
        <span className="inline-flex items-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-base">folder</span>
          Files
        </span>
      ) : (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Files
        </button>
      )}

      {projectName && (
        <>
          <span className="text-border-dark">/</span>
          <span className="inline-flex items-center gap-1 text-white">
            <span className="material-symbols-outlined text-base">folder_open</span>
            {projectName}
          </span>
        </>
      )}
    </div>
  )
}
