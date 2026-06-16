import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@acolhe-animal/db';
import { searchCities } from '@acolhe-animal/domain';

/**
 * City autocomplete for the org signup form. `GET /api/cities?q=cri` → up to 10
 * suggestions `{ id, name, stateCode }`. The catalog is global (not tenant
 * data), so no session/Ctx is required.
 */
export const GET = async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json({ cities: [] });

  const cities = await searchCities(db, q);
  return NextResponse.json({ cities });
};
