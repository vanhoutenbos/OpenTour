import { TeeManagerSection, type TeeRecord } from '@/components/course/TeeManagerSection';

interface Props {
  courseId: string;
  initialTees: TeeRecord[];
  onTeesChanged: (updated: TeeRecord[]) => void;
}

export function TeesTab({ courseId, initialTees, onTeesChanged }: Props) {
  return (
    <TeeManagerSection
      courseId={courseId}
      initialTees={initialTees}
      onTeesChanged={onTeesChanged}
    />
  );
}
