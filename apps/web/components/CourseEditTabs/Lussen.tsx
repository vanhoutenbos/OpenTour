import { LoopManagerSection, type LoopRecord } from '@/components/course/LoopManagerSection';
import { LoopRatingsSection, type LoopSummary, type LoopTeeRatingRecord } from '@/components/course/LoopRatingsSection';
import { type HoleRecord } from '@/components/course/HoleManagerSection';

interface Props {
  courseId: string;
  holes: HoleRecord[];
  initialLoops: LoopRecord[];
  onLoopsChanged: (updated: LoopRecord[]) => void;
  loops: LoopSummary[];
  teeRecords: import('@/components/course/TeeManagerSection').TeeRecord[];
  initialRatings: LoopTeeRatingRecord[];
}

export function LussenTab({
  courseId,
  holes,
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
