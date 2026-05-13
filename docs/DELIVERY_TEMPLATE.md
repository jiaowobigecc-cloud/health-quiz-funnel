# 【姓名】_全栈挑战_YYYYMMDD

## 线上链接

- Demo: `https://health-quiz-funnel-lovat.vercel.app`
- GitHub: `https://github.com/jiaowobigecc-cloud/health-quiz-funnel`
- 已支付测试 sessionId: `paid_demo_session_001`

## /pay 可重放调用

```bash
curl -X POST https://health-quiz-funnel-lovat.vercel.app/api/pay \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","idempotencyKey":"reviewer-pay-001","amountCents":1900,"currency":"CNY"}'
```

## 对比付费前后

```bash
curl https://health-quiz-funnel-lovat.vercel.app/api/sessions/SESSION_ID/results
curl -X POST https://health-quiz-funnel-lovat.vercel.app/api/pay \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","idempotencyKey":"reviewer-pay-001"}'
curl https://health-quiz-funnel-lovat.vercel.app/api/sessions/SESSION_ID/results
```

## 数据库 Schema 图

见 `docs/schema.mmd`。

## AI 使用复盘

见 `docs/AI_REVIEW.md`。
