import { LoopManagerSection, type LoopRecord } from '@/components/course/LoopManagerSection';
import { LoopRatingsSection, type LoopSummary, type LoopTeeRatingRecord } from '@/components/course/LoopRatingsSection';
import { type HoleRecord } from '@/components/course/HoleManagerSection';
import { type TeeRecord } from '@/components/course/TeeManagerSection';

interface Props {
  courseId: string;
  holes: HoleRecord[];
  tees: { id: string; label: string }[];
  initialLoops: LoopRecord[];
  onLoopsChanged: (updated: LoopRecord[]) => void;
  loops: LoopSummary[];
  teeRecords: TeeRecord[];
  initialRatings: LoopTeeRatingRecord[];
}

export function LussenTab({
  courseId,
  holes,
  tees,
  initialLoops,
  onLoopsChanged,
  loops,
  teeRecords,
  initialRatings,
}: Props) {
  return (
    <>
      <LoopManagerSection
        courseId={courseId}
        holes={holes}
        tees={tees}
        initialLoops={initialLoops}
        onLoopsChanged={onLoopsChanged}
      />
      <LoopRatingsSection
        loops={loops}
        tees={teeRecords}
        initialRatings={initialRatings}
      />
    </>
  );
}
