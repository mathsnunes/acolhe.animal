import { config } from 'dotenv';

// Load the repo-root .env before importing anything that reads process.env.
config({ path: '../../.env' });

async function main() {
  const { db } = await import('../client');
  const schema = await import('../schema');
  const { DEV_CITIES } = await import('./cities');
  const { seedDev } = await import('./dev');

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production.');
  }

  console.log('› Seeding cities…');
  await db
    .insert(schema.city)
    .values(DEV_CITIES)
    .onConflictDoNothing();
  console.log(`  ${DEV_CITIES.length} cities ready.`);

  console.log('› Seeding demo organization (Angeli Felice)…');
  await seedDev();
  console.log('  Done.');

  console.log('\n✅ Seed complete.');
  console.log('   Dev login → telefone +55 48 99999-0000 · senha "acolhe123"');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
