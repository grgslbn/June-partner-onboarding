// Shared primitives for form field components.

export const inputClass =
  'h-12 w-full rounded-lg border border-neutral-200 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-[var(--partner-primary)] not-placeholder-shown:border-[var(--partner-primary)] aria-[invalid=true]:border-red-500';

export function FieldWrapper({
  label,
  htmlFor,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
