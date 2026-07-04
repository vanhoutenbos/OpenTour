'use client';

import { useState, useEffect } from 'react';
import type { HoleStat } from '@opentour/types';
import { fetchCourseHoleStats } from '@/lib/fetchLeaderboard';

interface Props {
  tournamentId: string;
}

export function CourseStats({ tournamentId }: Props) {
  const [stats, setStats] = useState<HoleStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCourseHoleStats(tournamentId)
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Baanstatistieken niet beschikbaar');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  const front = stats.filter((h) => h.hole_number <= 9);
  const back = stats.filter((h) => h.hole_number > 9);

  const summarize = (holes: HoleStat[]) => ({
    par: holes.reduce((s, h) => s + h.par, 0),
    yards: holes.some((h) => h.distance_meters)
      ? holes.reduce((s, h) => s + (h.distance_meters ?? 0), 0)
      : 0,
    avgScore: holes.length
      ? holes.reduce((s, h) => s + h.average_score, 0)
      : 0,
    eagles: holes.reduce((s, h) => s + h.eagles, 0),
    birdies: holes.reduce((s, h) => s + h.birdies, 0),
    pars: holes.reduce((s, h) => s + h.pars, 0),
    bogeys: holes.reduce((s, h) => s + h.bogeys, 0),
    doubles: holes.reduce((s, h) => s + h.double_bogeys, 0),
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-surface-3 rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-content-muted">{error}</div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-8 text-content-muted">
        Nog geen statistieken beschikbaar
      </div>
    );
  }

  const renderTable = (holes: HoleStat[], label: string) => {
    const summary = summarize(holes);
    return (
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="text-content-muted text-xs border-b border-border uppercase tracking-wider">
            <th className="py-2 text-left">{label}</th>
            <th className="py-2 text-center">Par</th>
            {holes.some((h) => h.distance_meters) && (
              <th className="py-2 text-center">M</th>
            )}
            <th className="py-2 text-center">SI</th>
            <th className="py-2 text-center">Ø Score</th>
            <th className="py-2 text-center w-16 text-yellow-400/80">○ Eagle</th>
            <th className="py-2 text-center w-16 text-red-400/80">○ Birdie</th>
            <th className="py-2 text-center w-14">— Par</th>
            <th className="py-2 text-center w-14 text-score-muted/80">□ Bogey</th>
            <th className="py-2 text-center w-14 text-blue-400/80">▫ Double</th>
            <th className="py-2 text-center w-12">#</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {holes.map((h) => (
            <tr key={h.hole_number} className="hover:bg-surface-3/30 transition-colors">
              <td className="py-2 text-content font-mono font-bold">{h.hole_number}</td>
              <td className="py-2 text-center font-mono text-content-muted">{h.par}</td>
              {holes.some((x) => x.distance_meters) && (
                <td className="py-2 text-center font-mono text-content-muted">{h.distance_meters ?? '-'}</td>
              )}
              <td className="py-2 text-center font-mono text-content-muted">{h.stroke_index}</td>
              <td className="py-2 text-center font-mono text-content font-bold">{h.average_score.toFixed(1)}</td>
              <td className="py-2 text-center font-mono text-yellow-400">{h.eagles || '-'}</td>
              <td className="py-2 text-center font-mono text-red-400">{h.birdies}</td>
              <td className="py-2 text-center font-mono text-content-secondary">{h.pars}</td>
              <td className="py-2 text-center font-mono text-score-muted">{h.bogeys}</td>
              <td className="py-2 text-center font-mono text-blue-400">{h.double_bogeys}</td>
              <td className="py-2 text-center font-mono text-content-muted">{h.total_scores}</td>
            </tr>
          ))}
          {/* Summary row */}
          <tr className="border-t-2 border-border-strong font-bold">
            <td className="py-2 text-content text-xs uppercase tracking-wider">Totaal</td>
            <td className="py-2 text-center text-content-secondary font-mono">{summary.par}</td>
            {holes.some((h) => h.distance_meters) && (
              <td className="py-2 text-center text-content-secondary font-mono">{summary.yards}</td>
            )}
            <td />
            <td className="py-2 text-center text-content font-mono">{summary.avgScore.toFixed(1)}</td>
            <td className="py-2 text-center text-yellow-400 font-mono">{summary.eagles}</td>
            <td className="py-2 text-center text-red-400 font-mono">{summary.birdies}</td>
            <td className="py-2 text-center text-content-secondary font-mono">{summary.pars}</td>
            <td className="py-2 text-center text-score-muted font-mono">{summary.bogeys}</td>
            <td className="py-2 text-center text-blue-400 font-mono">{summary.doubles}</td>
            <td className="py-2 text-center text-content-muted font-mono">{summary.eagles + summary.birdies + summary.pars + summary.bogeys + summary.doubles}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-6">
      {front.length > 0 && (
        <div className="overflow-x-auto">
          {renderTable(front, 'Front 9')}
        </div>
      )}
      {back.length > 0 && (
        <div className="overflow-x-auto">
          {renderTable(back, 'Back 9')}
        </div>
      )}
    </div>
  );
}
