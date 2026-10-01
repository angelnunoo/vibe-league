import { writeFileSync } from "node:fs"
import { QUESTIONS } from "../src/lib/questions"

function sql(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

const rows = QUESTIONS.map((question) => {
  const leans = JSON.stringify(question.leans)
  return `(${sql(question.id)}, ${sql(question.category)}, ${sql(question.emoji)}, ${sql(question.prompt)}, ${sql(question.options[0])}, ${sql(question.options[1])}, ${sql(leans)}::jsonb)`
})

writeFileSync(
  "supabase/questions.sql",
  `insert into public.questions (id, category, emoji, prompt, option_a, option_b, leans) values\n${rows.join(",\n")};\n`,
)
console.log(`wrote ${QUESTIONS.length} questions`)
