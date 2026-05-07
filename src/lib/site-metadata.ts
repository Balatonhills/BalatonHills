import { getSupabase } from "./supabase";

export type RouteMetadata = {
  route_path: string;
  title: string | null;
  description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical: string | null;
  updated_at?: string;
};

export const EDITABLE_ROUTES: ReadonlyArray<{ path: string; label: string }> = [
  { path: "__root__", label: "Site-wide defaults" },
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/booking", label: "Booking" },
  { path: "/contact", label: "Contact" },
  { path: "/courses", label: "Courses" },
  { path: "/membership", label: "Membership" },
];

let cache: { map: Map<string, RouteMetadata>; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function loadAllMetadata(): Promise<Map<string, RouteMetadata>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.map;

  try {
    const { data, error } = await getSupabase().from("site_metadata").select("*");
    if (error) throw error;
    const map = new Map<string, RouteMetadata>();
    for (const row of (data ?? []) as RouteMetadata[]) map.set(row.route_path, row);
    cache = { map, expiresAt: now + TTL_MS };
    return map;
  } catch {
    return cache?.map ?? new Map();
  }
}

export async function getMetadata(routePath: string): Promise<RouteMetadata | undefined> {
  return (await loadAllMetadata()).get(routePath);
}

export function invalidateMetadataCache() {
  cache = null;
}
