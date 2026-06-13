import { Router, type IRouter } from "express";
import { HostLoginBody, HostLoginResponse, GetAuthStatusResponse } from "../validators";

const router: IRouter = Router();

router.get("/auth/me", (req, res): void => {
  const authenticated = !!(req.session as any).isHost;
  res.json(GetAuthStatusResponse.parse({ authenticated }));
});

router.post("/auth/login", (req, res): void => {
  const parsed = HostLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const hostPassword = process.env.HOST_PASSWORD;
  if (!hostPassword) {
    res.status(500).json({ error: "HOST_PASSWORD not configured" });
    return;
  }

  if (parsed.data.password !== hostPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  (req.session as any).isHost = true;
  // log session id and cookie options for debugging in production
  // eslint-disable-next-line no-console
  console.debug("[auth] setting isHost on session, id=", (req.session as any).id);
  req.session.save((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("[auth] session save error:", err);
      res.status(500).json({ error: "Session error" });
      return;
    }
    // eslint-disable-next-line no-console
    console.debug("[auth] session saved, id=", (req.session as any).id, "cookies=", req.headers.cookie);
    res.json(HostLoginResponse.parse({ authenticated: true }));
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json(GetAuthStatusResponse.parse({ authenticated: false }));
  });
});

export default router;
