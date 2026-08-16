import { CourseBuilderForm, type CourseBuilderInitialData } from '@/components/course/CourseBuilderForm';

interface Props {
  locale: string;
  initialData: CourseBuilderInitialData;
}

export function AlgemeenTab({ locale, initialData }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-content">Algemeen</h2>
      <p className="text-sm text-content-muted mt-1">
        Dit is de huidige indeling van de baan. Alleen de eigenaar kan deze gegevens aanpassen.
      </p>
      <div className="rounded-xl border border-border bg-surface p-4 space-y-2 mt-4">
        <p className="text-sm font-medium text-content">Laatste status</p>
        <p className="text-sm text-content-muted">
          Submit/publicatie komt later. Voor nu is deze baan alleen zichtbaar en bewerkbaar voor de eigenaar.
        </p>
      </div>
      <CourseBuilderForm
        locale={locale}
        mode="edit"
        initialData={initialData}
        onCancel={() => window.history.back()}
        onSaved={() => {
          window.location.href = `/${locale}/course`;
        }}
      />
    </div>
  );
}
