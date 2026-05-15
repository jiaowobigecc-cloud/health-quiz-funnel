"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Step = "gender" | "goal" | "body" | "activity" | "submit" | "results";

type SessionState = {
  sessionId: string;
  status: "DRAFT" | "COMPLETED";
  currentStep: Step;
  completedSteps: string[];
  answers: {
    gender: string | null;
    primaryGoal: string | null;
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    targetWeightKg: number | null;
    activityFrequency: string | null;
  };
};

type ResultsState = {
  access: "FULL" | "LOCKED";
  subscriptionRequired: boolean;
  subscriptionStatus: string;
  assessment: {
    bmi: number;
    bmiCategory: string;
    dailyCalories: number | string;
    targetDate: string | null;
    targetWeightKg: number | null;
    estimatedWeeks?: number;
    recommendation?: {
      headline: string;
      proteinGrams: number;
      weeklyWorkouts: number;
      notes: string[];
    };
    predictionCurve?: Array<{ week: number; weightKg: number }>;
    teaser?: string;
  };
};

const clientTokenKey = "fitpulse.clientToken";
const sessionIdKey = "fitpulse.sessionId";

const stepLabels: Record<Step, string> = {
  gender: "基础画像",
  goal: "目标选择",
  body: "身体数据",
  activity: "运动习惯",
  submit: "生成计划",
  results: "测评结果"
};

const genderOptions = [
  { value: "FEMALE", label: "女性", caption: "更贴合体脂和代谢估算" },
  { value: "MALE", label: "男性", caption: "按男性 BMR 公式计算" },
  { value: "NON_BINARY", label: "非二元", caption: "使用更保守的估算参数" },
  { value: "PREFER_NOT_TO_SAY", label: "暂不透露", caption: "仍可完成测评" }
];

const goalOptions = [
  { value: "LOSE_WEIGHT", label: "减脂塑形", caption: "轻热量缺口 + 低冲击训练" },
  { value: "BUILD_STRENGTH", label: "提升力量", caption: "蛋白优先 + 渐进训练" },
  { value: "IMPROVE_MOBILITY", label: "改善体态", caption: "灵活度与核心稳定" },
  { value: "FEEL_HEALTHIER", label: "更有精力", caption: "饮食、睡眠和运动节奏" }
];

const activityOptions = [
  { value: "SEDENTARY", label: "几乎不运动", caption: "从每周 3 次开始" },
  { value: "LIGHT", label: "每周 1-2 次", caption: "建立固定节奏" },
  { value: "MODERATE", label: "每周 3-4 次", caption: "可以加入进阶训练" },
  { value: "ACTIVE", label: "每周 5-6 次", caption: "注意恢复和蛋白质" },
  { value: "ATHLETE", label: "高强度训练", caption: "按训练日调整热量" }
];

export function QuizFunnel() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [results, setResults] = useState<ResultsState | null>(null);
  const [step, setStep] = useState<Step>("gender");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    const order: Step[] = ["gender", "goal", "body", "activity", "submit", "results"];
    return Math.round(((order.indexOf(step) + 1) / order.length) * 100);
  }, [step]);

  useEffect(() => {
    void bootstrap();
    // The bootstrap flow intentionally runs once to hydrate local quiz state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    setIsLoading(true);
    setError(null);

    try {
      const savedSessionId = window.localStorage.getItem(sessionIdKey);

      if (savedSessionId) {
        const restored = await restoreSavedSession(savedSessionId);
        if (restored) {
          setSession(restored.session);
          setStep(restored.session.status === "COMPLETED" ? "results" : restored.session.currentStep);

          if (restored.session.status === "COMPLETED") {
            await loadResults(restored.session.sessionId);
          }

          return;
        }
      }

      const clientToken = getOrCreateClientToken();
      const created = await api<{ clientToken: string; session: SessionState }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ clientToken })
      });

      window.localStorage.setItem(clientTokenKey, created.clientToken);
      window.localStorage.setItem(sessionIdKey, created.session.sessionId);
      setSession(created.session);
      setStep(created.session.currentStep);
    } catch (currentError) {
      window.localStorage.removeItem(sessionIdKey);
      setError(getErrorMessage(currentError));
    } finally {
      setIsLoading(false);
    }
  }

  async function restoreSavedSession(savedSessionId: string) {
    try {
      return await api<{ session: SessionState }>(`/api/sessions/${savedSessionId}`);
    } catch {
      window.localStorage.removeItem(sessionIdKey);
      return null;
    }
  }

  async function saveAnswer(currentStep: Exclude<Step, "submit" | "results">, data: Record<string, unknown>) {
    if (!session) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await api<{ session: SessionState }>(`/api/sessions/${session.sessionId}/answers`, {
        method: "PATCH",
        body: JSON.stringify({ step: currentStep, data })
      });

      setSession(updated.session);
      setStep(updated.session.currentStep);
    } catch (currentError) {
      setError(getErrorMessage(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  async function submitQuiz() {
    if (!session) return;

    setIsSaving(true);
    setError(null);

    try {
      const submitted = await api<{ session: SessionState }>(`/api/sessions/${session.sessionId}/submit`, {
        method: "POST"
      });
      setSession(submitted.session);
      setStep("results");
      await loadResults(submitted.session.sessionId);
    } catch (currentError) {
      setError(getErrorMessage(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  async function loadResults(sessionId: string) {
    const response = await api<ResultsState>(`/api/sessions/${sessionId}/results`);
    setResults(response);
  }

  async function pay() {
    if (!session) return;

    setIsSaving(true);
    setError(null);

    try {
      await api("/api/pay", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session.sessionId,
          idempotencyKey: `ui-${session.sessionId}`
        })
      });
      await loadResults(session.sessionId);
    } catch (currentError) {
      setError(getErrorMessage(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  function resetLocalDemo() {
    window.localStorage.removeItem(clientTokenKey);
    window.localStorage.removeItem(sessionIdKey);
    setError(null);
    setSession(null);
    setResults(null);
    void bootstrap();
  }

  if (isLoading) {
    return (
      <main className="shell">
        <section className="quiz-surface loading-state">正在准备你的测评...</section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="brand-panel">
        <div>
          <p className="eyebrow">FitPulse Health Quiz</p>
          <h1>用 1 分钟拿到你的体重目标路线</h1>
          <p className="hero-copy">先记录关键身体数据，再解锁完整预测曲线和饮食建议。</p>
        </div>
        <Image
          src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=920&q=80"
          alt=""
          width={920}
          height={690}
          priority
        />
      </section>

      <section className="quiz-surface">
        <div className="topline">
          <div>
            <span className="step-kicker">Step {Math.min(6, Math.ceil(progress / 17))}/6</span>
            <h2>{stepLabels[step]}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={resetLocalDemo}>
            重新开始
          </button>
        </div>

        <div className="meter" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        {error ? <p className="error">{error}</p> : null}

        {step === "gender" ? (
          <OptionGrid
            options={genderOptions}
            activeValue={session?.answers.gender}
            onPick={(gender) => saveAnswer("gender", { gender })}
            disabled={isSaving}
          />
        ) : null}

        {step === "goal" ? (
          <OptionGrid
            options={goalOptions}
            activeValue={session?.answers.primaryGoal}
            onPick={(primaryGoal) => saveAnswer("goal", { primaryGoal })}
            disabled={isSaving}
          />
        ) : null}

        {step === "body" ? (
          <BodyStep
            answers={session?.answers}
            disabled={isSaving}
            onSubmit={(data) => saveAnswer("body", data)}
          />
        ) : null}

        {step === "activity" ? (
          <OptionGrid
            options={activityOptions}
            activeValue={session?.answers.activityFrequency}
            onPick={(activityFrequency) => saveAnswer("activity", { activityFrequency })}
            disabled={isSaving}
          />
        ) : null}

        {step === "submit" ? (
          <ReviewStep session={session} disabled={isSaving} onSubmit={submitQuiz} />
        ) : null}

        {step === "results" ? (
          <ResultsPanel results={results} disabled={isSaving} onPay={pay} />
        ) : null}
      </section>
    </main>
  );
}

function OptionGrid({
  options,
  activeValue,
  disabled,
  onPick
}: {
  options: Array<{ value: string; label: string; caption: string }>;
  activeValue?: string | null;
  disabled: boolean;
  onPick: (value: string) => void;
}) {
  return (
    <div className="option-grid">
      {options.map((option) => (
        <button
          className={activeValue === option.value ? "option active" : "option"}
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(option.value)}
        >
          <strong>{option.label}</strong>
          <span>{option.caption}</span>
        </button>
      ))}
    </div>
  );
}

function BodyStep({
  answers,
  disabled,
  onSubmit
}: {
  answers?: SessionState["answers"];
  disabled: boolean;
  onSubmit: (data: Record<string, number>) => void;
}) {
  const [form, setForm] = useState({
    age: answers?.age ?? 28,
    heightCm: answers?.heightCm ?? 166,
    weightKg: answers?.weightKg ?? 68,
    targetWeightKg: answers?.targetWeightKg ?? 61
  });

  return (
    <form
      className="body-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <NumberInput label="年龄" value={form.age} min={18} max={80} onChange={(age) => setForm({ ...form, age })} />
      <NumberInput
        label="身高 cm"
        value={form.heightCm}
        min={120}
        max={230}
        onChange={(heightCm) => setForm({ ...form, heightCm })}
      />
      <NumberInput
        label="当前体重 kg"
        value={form.weightKg}
        min={35}
        max={250}
        onChange={(weightKg) => setForm({ ...form, weightKg })}
      />
      <NumberInput
        label="目标体重 kg"
        value={form.targetWeightKg}
        min={35}
        max={250}
        onChange={(targetWeightKg) => setForm({ ...form, targetWeightKg })}
      />
      <button className="primary-button" disabled={disabled} type="submit">
        保存并继续
      </button>
    </form>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ReviewStep({
  session,
  disabled,
  onSubmit
}: {
  session: SessionState | null;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="review">
      <div className="summary-row">
        <span>体重目标</span>
        <strong>
          {session?.answers.weightKg}kg → {session?.answers.targetWeightKg}kg
        </strong>
      </div>
      <div className="summary-row">
        <span>运动习惯</span>
        <strong>{labelForActivity(session?.answers.activityFrequency)}</strong>
      </div>
      <button className="primary-button" type="button" disabled={disabled} onClick={onSubmit}>
        生成我的计划
      </button>
    </div>
  );
}

function ResultsPanel({
  results,
  disabled,
  onPay
}: {
  results: ResultsState | null;
  disabled: boolean;
  onPay: () => void;
}) {
  if (!results) {
    return <div className="loading-state">正在计算...</div>;
  }

  return (
    <div className="results">
      <div className="result-metric">
        <span>BMI</span>
        <strong>{results.assessment.bmi}</strong>
        <em>{labelForBmi(results.assessment.bmiCategory)}</em>
      </div>
      <div className="result-metric">
        <span>建议摄入</span>
        <strong>{results.assessment.dailyCalories}</strong>
        <em>kcal / day</em>
      </div>

      {results.access === "FULL" ? (
        <div className="full-result">
          <h3>{results.assessment.recommendation?.headline}</h3>
          <p>
            预计 {results.assessment.estimatedWeeks} 周到达 {results.assessment.targetWeightKg}kg，
            目标日期 {formatDate(results.assessment.targetDate)}。
          </p>
          <div className="curve">
            {results.assessment.predictionCurve?.map((point) => (
              <span key={`${point.week}-${point.weightKg}`} style={{ height: `${Math.max(18, point.weightKg)}%` }}>
                <small>{point.weightKg}kg</small>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="paywall">
          <h3>完整计划已生成</h3>
          <p>{results.assessment.teaser}</p>
          <button className="primary-button" type="button" disabled={disabled} onClick={onPay}>
            模拟支付 ¥19 解锁
          </button>
        </div>
      )}
    </div>
  );
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Request failed.");
  }

  return payload as T;
}

function getOrCreateClientToken() {
  const existing = window.localStorage.getItem(clientTokenKey);
  if (existing) return existing;

  const next = crypto.randomUUID();
  window.localStorage.setItem(clientTokenKey, next);
  return next;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function labelForActivity(value?: string | null) {
  return activityOptions.find((option) => option.value === value)?.label ?? "待确认";
}

function labelForBmi(value: string) {
  const labels: Record<string, string> = {
    UNDERWEIGHT: "偏低",
    NORMAL: "健康范围",
    OVERWEIGHT: "偏高",
    OBESE: "需要关注"
  };
  return labels[value] ?? value;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}
