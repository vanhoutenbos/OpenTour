import { HoleManagerSection, type HoleRecord } from '@/components/course/HoleManagerSection';

interface Props {
  courseId: string;
  initialHoles: HoleRecord[];
  onHolesChanged: (updated: HoleRecord[]) => void;
}

export function HolesTab({ courseId, initialHoles, onHolesChanged }: Props) {
  return (
    <HoleManagerSection
      courseId={courseId}
      initialHoles={initialHoles}
      onHolesChanged={onHolesChanged}
    />
  );
}
