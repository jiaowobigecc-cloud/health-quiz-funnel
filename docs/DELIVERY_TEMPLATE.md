# 【姓名】_全栈挑战_YYYYMMDD

## 线上链接

- Demo: `https://<your-vercel-domain>`
- GitHub: `https://github.com/<your-name>/<repo>`
- 已支付测试 sessionId: `paid_demo_session_001`

## /pay 可重放调用

```bash
curl -X POST https://<your-vercel-domain>/api/pay \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","idempotencyKey":"reviewer-pay-001","amountCents":1900,"currency":"CNY"}'
```

## 对比付费前后

```bash
curl https://<your-vercel-domain>/api/sessions/SESSION_ID/results
curl -X POST https://<your-vercel-domain>/api/pay \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","idempotencyKey":"reviewer-pay-001"}'
curl https://<your-vercel-domain>/api/sessions/SESSION_ID/results
```

## 数据库 Schema 图

见 `docs/schema.mmd`。

## AI 使用复盘

见 `docs/AI_REVIEW.md`。
