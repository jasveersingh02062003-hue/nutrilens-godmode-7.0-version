# External Monitoring Setup — One-Time Checklist

These two services live OUTSIDE Lovable and need to be configured manually.
Total time: ~15 minutes. They cover **P2-6 (Sentry alerts)** and **P2-7 (UptimeRobot)**.

---

## 1. Sentry Alert Routing (5 min)

Sentry is already wired into the project (`src/lib/sentry.ts`). Errors are
captured but no one is notified yet. Set up two alert rules so you find out
about problems within seconds, not the next morning.

### Steps

1. Go to https://sentry.io and open your **NutriLens** project.
2. Click **Alerts** in the left sidebar → **Create Alert Rule**.
3. Choose **"Issues"** as the alert type.

### Rule A — "Notify me on every new issue"

| Field             | Value                                       |
|-------------------|---------------------------------------------|
| Name              | New issue alert                             |
| Environment       | `production`                                |
| Conditions        | `A new issue is created`                    |
| Filter (optional) | `Level is equal to error or fatal`          |
| Action            | `Send a notification to [your email]`       |
| Frequency         | `5 minutes` (rate-limit duplicates)         |

### Rule B — "Notify me on issue spikes"

| Field        | Value                                          |
|--------------|------------------------------------------------|
| Name         | Issue frequency spike                          |
| Environment  | `production`                                   |
| Conditions   | `The issue is seen more than 10 times in 1h`   |
| Action       | `Send a notification to [your email]`          |
| Frequency    | `30 minutes`                                   |

### Optional — Slack integration

If you have Slack:
1. **Settings → Integrations → Slack → Install**
2. Authorize NutriLens workspace
3. Edit each rule and add a second action:
   `Send a Slack notification to #alerts` (or your channel of choice)

### Verify

- Visit your published app, open DevTools Console, type:
  ```js
  throw new Error('Sentry test alert — please ignore')
  ```
- You should get the email within 2 minutes.

---

## 2. UptimeRobot — Ping `/healthz` every 5 minutes (10 min)

The healthz endpoint exists at:
```
https://yowgmqdcmgaiaqjgifzh.supabase.co/functions/v1/healthz
```

But nothing is pinging it. Set up an external monitor so you know within 5
minutes if Lovable Cloud goes down.

### Steps

1. Sign up free at https://uptimerobot.com (50 monitors, 5-min interval — free forever).
2. Verify your email.
3. Click **+ New Monitor** → fill in:

| Field             | Value                                                                     |
|-------------------|---------------------------------------------------------------------------|
| Monitor Type      | HTTP(s)                                                                   |
| Friendly Name     | NutriLens — Healthz                                                       |
| URL               | `https://yowgmqdcmgaiaqjgifzh.supabase.co/functions/v1/healthz`           |
| Monitoring Interval | 5 minutes                                                               |
| Monitor Timeout   | 30 seconds                                                                |

4. Under **Alert Contacts To Notify**, check your email (or add SMS / Slack
   webhook). Click **Create Monitor**.

### Optional — Add a status page

UptimeRobot gives you a free public status page at
`https://stats.uptimerobot.com/<random>` you can share with users. Useful
during incidents so support tickets don't pile up.

### Verify

- Click the monitor → you should see a green **Up** indicator within 5 minutes.
- To test alerts: temporarily change the URL to a 404 path, save, wait 5 min →
  you should get the alert email. Then revert.

---

## 3. Recap

After this setup you'll be told within minutes when:
- Any new error class appears in production (Sentry)
- The same error spikes (Sentry)
- The backend is unreachable (UptimeRobot)

Document the date you set this up below so future-you remembers.

| Service       | Set up on (YYYY-MM-DD) | Set up by |
|---------------|------------------------|-----------|
| Sentry alerts |                        |           |
| UptimeRobot   |                        |           |
