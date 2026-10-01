import { QUESTIONS, type Question } from "../src/lib/questions"
import { ABSTAIN_MESSAGE, resolveTargetAnswer } from "../src/lib/predict"
import type { Choice } from "../src/lib/types"
import assert from "node:assert/strict"

function answer(question: Question, choice: Choice) {
  return { userId: "ada", questionId: question.id, choice }
}

const consistent = QUESTIONS.filter((question) => question.leans.outgoing !== undefined).slice(0, 6)
const target = QUESTIONS.find((question) => question.id === "q_meet")
assert.ok(target)

const aligned = consistent
  .filter((question) => question.id !== target.id)
  .slice(0, 5)
  .map((question) => answer(question, question.leans.outgoing!))

const predicted = resolveTargetAnswer({
  targetId: "ada",
  question: target,
  answers: aligned,
  allowAi: true,
})
assert.equal(predicted.status, "predicted")
if (predicted.status === "predicted") assert.equal(predicted.choice, target.leans.outgoing)
assert.equal(predicted.type, "ai_prediction")

const withReal = resolveTargetAnswer({
  targetId: "ada",
  question: target,
  answers: [...aligned, answer(target, target.leans.outgoing === 0 ? 1 : 0)],
  allowAi: true,
})
assert.equal(withReal.status, "real")
assert.equal(withReal.type, "real_answer")
if (withReal.status === "real") assert.equal(withReal.choice, target.leans.outgoing === 0 ? 1 : 0)

const blocked = resolveTargetAnswer({
  targetId: "ada",
  question: target,
  answers: aligned,
  allowAi: false,
})
assert.equal(blocked.status, "abstain")
assert.equal(blocked.type, "ai_prediction")

const realWinsOverAiOff = resolveTargetAnswer({
  targetId: "ada",
  question: target,
  answers: [answer(target, 1)],
  allowAi: false,
})
assert.equal(realWinsOverAiOff.status, "real")
if (realWinsOverAiOff.status === "real") assert.equal(realWinsOverAiOff.choice, 1)

const empty = resolveTargetAnswer({
  targetId: "ada",
  question: target,
  answers: [],
  allowAi: true,
})
assert.equal(empty.status, "abstain")
if (empty.status === "abstain") assert.equal(empty.message, ABSTAIN_MESSAGE)

const thin = resolveTargetAnswer({
  targetId: "ada",
  question: target,
  answers: aligned.slice(0, 2),
  allowAi: true,
})
assert.equal(thin.status, "abstain")

const sources = QUESTIONS.filter(
  (question) => question.leans.planner === 0 && question.leans.spender === undefined && question.category !== "dinero",
).slice(0, 4)
assert.equal(sources.length, 4)
const mixed = sources.map((question, index) => answer(question, index < 2 ? 0 : 1))
const money = QUESTIONS.find((question) => question.id === "q_money")
assert.ok(money)
const unsure = resolveTargetAnswer({
  targetId: "ada",
  question: money,
  answers: mixed,
  allowAi: true,
})
assert.equal(unsure.status, "abstain")

console.log("predict checks ok")
