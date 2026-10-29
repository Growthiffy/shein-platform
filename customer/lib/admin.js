import { userFromRequest, unauth, forbidden } from "./auth";

export async function requireAdmin(req) {
  const u = await userFromRequest(req);
  if (!u) return { res: unauth() };
  if (!u.is_admin) return { res: forbidden() };
  return { u };
}
