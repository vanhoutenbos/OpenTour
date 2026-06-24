#!/usr/bin/env tsx
/**
 * OpenTour — Import golfbanen uit federatielijst (JSON)
 *
 * Gebruik:
 *   npx tsx scripts/import-clubs.ts --file ./data/clubs.json
 *
 * Vereisten:
 *   NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const dotenv = await import('dotenv');
dotenv.config({ path: resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Ontbrekende omgevingsvariabelen in apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface ClubRecord {
  id: string;
  club_id: string;
  fed_club_id: string;
  landcode: string;
  naam: string;
  snelnaam: string;
  verwijderd: string;
  geolocation: string;
  associationId: string;
  provincie: string;
  actief: string;
}

async function importClubs(clubs: ClubRecord[]) {
  let imported = 0;
  let errors = 0;
  let skipped = 0;

  for (const club of clubs) {
    if (club.verwijderd === 'j') {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('courses').upsert({
      name: club.naam,
      location: club.provincie || null,
      country: (club.landcode || 'nl').toUpperCase(),
      holes_count: 18,
      source: 'egolf4u',
      external_id: club.id,
      is_verified: true,
    }, { onConflict: 'external_id' });

    if (error) {
      console.error(`  ❌ ${club.naam}: ${error.message}`);
      errors++;
    } else {
      console.log(`  ✅ ${club.naam} (${club.provincie || 'onbekend'})`);
      imported++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Import voltooid:`);
  console.log(`   Geïmporteerd:  ${imported}`);
  console.log(`   Overgeslagen:  ${skipped} (verwijderd)`);
  if (errors > 0) console.log(`   Fouten:        ${errors}`);
}

const fileArg = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--file') + 1];

if (!fileArg) {
  console.error('Gebruik: npx tsx scripts/import-clubs.ts --file ./data/clubs.json');
  process.exit(1);
}

const filePath = resolve(process.cwd(), fileArg);
console.log(`📂 Bestand laden: ${filePath}`);

const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
const clubs = Array.isArray(raw) ? raw : [raw];

console.log(`🏌️  ${clubs.length} club(s) gevonden in JSON`);
await importClubs(clubs);
