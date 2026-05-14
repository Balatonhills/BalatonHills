import { describe, expect, it } from "vitest";

// Smoke test: each route module must load without throwing and export a
// Route object with a head() and component. Catches broken imports, missing
// exports, and head()-time evaluation errors before they reach the SSR build.

const routes = [
  () => import("./index"),
  () => import("./about"),
  () => import("./booking"),
  () => import("./contact"),
  () => import("./courses"),
  () => import("./membership"),
  () => import("./admin"),
  () => import("./admin.index"),
  () => import("./admin.login"),
  () => import("./admin.metadata"),
  () => import("./admin.memberships"),
  () => import("./admin.members"),
  () => import("./admin.members.$id"),
  () => import("./admin.pricing"),
  () => import("./admin.tee-times"),
  () => import("./admin.tee-times.$id"),
];

describe("route modules", () => {
  it.each(routes)("loads route module #%# and exposes a valid Route", async (load) => {
    const mod = await load();
    expect(mod.Route).toBeDefined();
    const head = await mod.Route.options.head?.({} as never);
    expect(head?.meta?.length).toBeGreaterThan(0);
    expect(mod.Route.options.component).toBeTypeOf("function");
  });
});
