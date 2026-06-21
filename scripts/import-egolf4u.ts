#!/usr/bin/env tsx
/**
 * OpenTour — eGolf4u baaninformatie import script
 *
 * Gebruik:
 *   npx tsx scripts/import-egolf4u.ts --file ./data/egolf4u-export.json
 *
 * Vereisten:
 *   NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Laad .env.local
const dotenv = await import('dotenv');
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Ontbrekende omgevingsvariabelen: NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface Egolf4uHoleData {
  PAR: string;
  SI: string;
  POS: number;
  HoleNr: string;
  ES?: number;
}

interface Egolf4uTee {
  tee_id: string;
  tee_name: string | null;
  holes: Array<Record<string, Egolf4uHoleData>>;
}

interface Egolf4uCourse {
  course_id: string;
  course_name: string;
  tees: Egolf4uTee[];
}

interface Egolf4uClub {
  club_id: string;
  club_name: string;
  courses: Egolf4uCourse[];
}

async function importEgolf4uData(clubs: Egolf4uClub[]) {
  let coursesImported = 0;
  let holesImported = 0;
  let errors = 0;

  for (const club of clubs) {
    console.log(`\n📍 ${club.club_name} (${club.courses.length} banen)`);

    for (const course of club.courses) {
      const tee = course.tees[0];
      if (!tee) {
        console.warn(`  ⚠️  Geen tees voor ${course.course_name} — overgeslagen`);
        continue;
      }

      const holesCount = tee.holes.length;

      // Baan opslaan
      const { data: savedCourse, error: courseError } = await supabase
        .from('courses')
        .upsert({
          name: course.course_name,
          location: club.club_name,
          country: 'NL',
          holes_count: holesCount,
          source: 'egolf4u',
          external_id: course.course_id,
          is_verified: true,
        }, { onConflict: 'external_id' })
        .select()
        .single();

      if (courseError || !savedCourse) {
        console.error(`  ❌ Baan mislukt: ${course.course_name}:`, courseError?.message);
        errors++;
        continue;
      }

      console.log(`  ✅ ${course.course_name} (${holesCount} holes)`);
      coursesImported++;

      // Holes importeren
      for (const holeObj of tee.holes) {
        const [, hole] = Object.entries(holeObj)[0]!;
        const par = parseInt(hole.PAR);
        const si = parseInt(hole.SI);

        if (isNaN(par) || isNaN(si) || par < 3 || par > 5 || si < 1 || si > 18) {
          console.warn(`    ⚠️  Ongeldige hole data voor hole ${hole.POS} — overgeslagen`);
          continue;
        }

        const { error: holeError } = await supabase
          .from('holes')
          .upsert({
            course_id: savedCourse.id,
            number: hole.POS,
            par,
            stroke_index: si,
          }, { onConflict: 'course_id,number' });

        if (holeError) {
          console.warn(`    ⚠️  Hole ${hole.POS} mislukt:`, holeError.message);
        } else {
          holesImported++;
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Import voltooid:`);
  console.log(`   Banen:  ${coursesImported}`);
  console.log(`   Holes:  ${holesImported}`);
  if (errors > 0) console.log(`   Fouten: ${errors}`);
}

// CLI argument parsing
const fileArg = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--file') + 1];

if (!fileArg) {
  console.error('Gebruik: npx tsx scripts/import-egolf4u.ts --file ./data/egolf4u-export.json');
  process.exit(1);
}

const filePath = resolve(process.cwd(), fileArg);
console.log(`📂 Bestand laden: ${filePath}`);

const rawData = JSON.parse(readFileSync(filePath, 'utf-8')) as Egolf4uClub | Egolf4uClub[];
const clubs = Array.isArray(rawData) ? rawData : [rawData];

console.log(`🏌️  ${clubs.length} club(s) gevonden`);
await importEgolf4uData(clubs);
