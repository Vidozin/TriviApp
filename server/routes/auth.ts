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
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session error" });
      return;
    }
    res.json(HostLoginResponse.parse({ authenticated: true }));
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json(GetAuthStatusResponse.parse({ authenticated: false }));
  });
});

export default router;
