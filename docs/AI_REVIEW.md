# AI 使用复盘

## 竞品观察

参考 BetterMe 的 quiz funnel 后，我把流程拆成三段：先低摩擦采集基础画像和目标，再保存身体数据与运动频率，最后在结果页通过订阅状态决定展示深度。BetterMe 首屏强调年龄分流、1-minute quiz 和信任条款；本项目没有 1:1 复刻题目，而是保留这种“逐步承诺、即时保存、结果付费解锁”的数据流。

## 数据库建模

我让 AI 先列出可扩展实体，再筛掉过度设计：

- `User` 保留匿名 `clientToken`，后续可升级到邮箱登录。
- `QuizSession` 存结构化答案字段，便于校验、恢复和分析。
- `Assessment` 独立保存服务端计算结果，避免每次访问结果页都重新计算。
- `Subscription` 与 `PaymentEvent` 分开，保留幂等支付事件和未来真实支付网关接入点。

AI 在这里主要用于快速比较“答案 JSON 表”与“结构化字段 + 扩展 JSON”的利弊。最终选择后者，因为评分标准强调字段选择、边界值和可扩展关系。

## Mock 数据与测试数据

seed 脚本生成一个固定付费会话：

- sessionId: `paid_demo_session_001`
- clientToken: `paid-demo-client`

这样评审可以直接访问 `/api/sessions/paid_demo_session_001/results` 对比完整结果，不依赖手动完成支付流程。

## 复杂逻辑生成

AI 协助把健康评估逻辑拆成纯函数：

- BMI 与分类
- Mifflin-St Jeor BMR
- 按活动频率估算维持热量
- 按目标调整摄入量
- 根据体重差估算周数和目标日期
- 生成预测曲线 JSON

纯函数放在 `lib/assessment.ts`，便于后续单元测试和业务规则替换。

## 校验与异常路径

AI 重点辅助了 Zod schema 的边界设计，例如：

- 年龄限制为 18-80
- 身高限制为 120-230cm
- 体重限制为 35-250kg
- 目标体重与当前体重差不超过 80kg
- 支付金额和幂等键限制

这类规则比“表单能提交”更重要，因为后端要防止非法数值进入评估和数据库。

## 后续可以加强

- 增加 Vitest 覆盖评估算法和 API 异常路径。
- 增加真实 auth middleware，用用户 token 校验 session ownership。
- 接入 Stripe/Paddle webhook，把 `/api/pay` 替换为真实支付回调。
- 把 quiz steps 配成数据库驱动，支持 A/B 测试不同 funnel。
