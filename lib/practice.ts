import type { LearnerContext } from "@/lib/types";

export type PracticeQuestion = {
  id: string;
  skill: string;
  topic: string;
  type: "conceptual" | "scenario" | "application" | "reasoning" | "practical";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "beginner" | "intermediate";
};

type QuestionTemplate = Omit<PracticeQuestion, "id" | "skill">;

export function getPracticeFocus(context: LearnerContext) {
  const milestone = context.learning_path.path.milestones.find(
    (item) => item.title === context.progress.current_milestone,
  ) ?? context.learning_path.path.milestones[0];
  const skill = milestone?.skills[0] ?? context.skill_gap.skill_gaps[0]?.skill ?? context.skill_gap.target_role;
  return { skill, milestone, role: context.skill_gap.target_role };
}

export function buildPracticeSet(context: LearnerContext): PracticeQuestion[] {
  const focus = getPracticeFocus(context);
  const templates = templatesFor(focus.skill, focus.milestone?.title ?? "current milestone");
  const offset = stableHash(`${context.skill_gap.target_role}:${focus.skill}:${focus.milestone?.id ?? "path"}`) % templates.length;
  const rotated = [...templates.slice(offset), ...templates.slice(0, offset)];

  return rotated.slice(0, Math.max(5, Math.min(8, rotated.length))).map((template, index) => ({
    ...template,
    id: `${slug(focus.skill)}-${stableHash(`${focus.skill}:${template.topic}:${index}`)}`,
    skill: focus.skill,
  }));
}

function templatesFor(skill: string, milestone: string): QuestionTemplate[] {
  const normalized = skill.toLowerCase();
  if (normalized.includes("sql") || normalized.includes("database")) return sqlQuestions(skill);
  if (normalized.includes("react")) return reactQuestions(skill);
  if (normalized.includes("typescript") || normalized.includes("javascript")) return javascriptQuestions(skill);
  if (normalized.includes("python")) return pythonQuestions(skill);
  if (normalized.includes("statistics") || normalized.includes("probability")) return statisticsQuestions(skill);
  return genericQuestions(skill, milestone);
}

function sqlQuestions(skill: string): QuestionTemplate[] {
  return [
    question("SQL selection", "conceptual", "Which clause filters rows before grouping?", ["WHERE", "ORDER BY", "HAVING", "LIMIT"], "WHERE", "WHERE filters individual rows before GROUP BY is applied."),
    question("SQL aggregation", "scenario", "You need the number of orders for each customer. Which approach is appropriate?", ["GROUP BY customer_id with COUNT", "ORDER BY customer_id", "DISTINCT on every column", "LIMIT one row"], "GROUP BY customer_id with COUNT", "Grouping by customer_id and counting rows produces one order count per customer."),
    question("SQL joins", "application", "Which join keeps every row from the left table even when no match exists on the right?", ["LEFT JOIN", "INNER JOIN", "CROSS JOIN", "SELF JOIN"], "LEFT JOIN", "A LEFT JOIN preserves the complete left-side result and fills unmatched right columns with NULL."),
    question("SQL nulls", "reasoning", "Why should you use IS NULL instead of = NULL in a filter?", ["NULL represents an unknown value", "NULL is always zero", "Equality only works on text", "IS NULL sorts rows"], "NULL represents an unknown value", "SQL uses three-valued logic, so unknown values must be checked with IS NULL or IS NOT NULL."),
    question("SQL query design", "practical", "Which query shape is best for returning the five highest revenue products?", ["SELECT ... ORDER BY revenue DESC LIMIT 5", "SELECT ... WHERE revenue = MAX(revenue)", "SELECT ... GROUP BY revenue ASC", "SELECT ... DISTINCT LIMIT 5 without ordering"], "SELECT ... ORDER BY revenue DESC LIMIT 5", "Ordering by revenue descending before limiting makes the top-five selection explicit and reproducible."),
  ].map((item) => ({ ...item, difficulty: "beginner", skill } as QuestionTemplate));
}

function reactQuestions(skill: string): QuestionTemplate[] {
  return [
    question("React components", "conceptual", "What is the main purpose of a React component?", ["Describe reusable UI and behavior", "Store database rows", "Compile CSS only", "Replace the browser"], "Describe reusable UI and behavior", "Components combine reusable UI structure with the behavior needed to render a part of an interface."),
    question("React state", "scenario", "A counter must update after a button click. Which React feature is designed for that changing value?", ["useState", "useMemo only", "className", " the alt attribute"], "useState", "useState stores local changing values and provides a setter that triggers a re-render."),
    question("React props", "application", "A parent needs to pass a learner goal into a child card. What should it use?", ["Props", "A second React root", "A CSS selector", "A database migration"], "Props", "Props are the normal one-way way for a parent to provide data to a child component."),
    question("React effects", "reasoning", "When is an effect dependency array useful?", ["It controls when the effect is re-run", "It makes every render synchronous", "It replaces component props", "It styles the component"], "It controls when the effect is re-run", "Dependencies tell React which values can change the effect's work and when it should run again."),
    question("React rendering", "practical", "Why should a list render each item with a stable key?", ["To help React track item identity", "To encrypt the list", "To prevent all CSS", "To call the API automatically"], "To help React track item identity", "Stable keys help React match old and new list items during reconciliation."),
  ].map((item) => ({ ...item, difficulty: "beginner", skill } as QuestionTemplate));
}

function javascriptQuestions(skill: string): QuestionTemplate[] {
  return [
    question("Type safety", "conceptual", "What does a TypeScript type annotation primarily provide?", ["Static guidance about values", "Runtime database storage", "Automatic UI design", "A network connection"], "Static guidance about values", "Types help tools detect invalid assumptions while code is written and checked."),
    question("Functions", "application", "Which choice makes a function easier to reuse?", ["Pass changing values as parameters", "Read every value from a global", "Duplicate it for each case", "Hide its return value"], "Pass changing values as parameters", "Parameters make a function's inputs explicit and reduce hidden coupling."),
    question("Async code", "scenario", "A fetch call returns a Promise. Which tool lets you write the success path in a sequential style?", ["await", "typeof", "delete", "instanceof"], "await", "await pauses the async function until the Promise settles, making the control flow easier to follow."),
    question("Array transformations", "practical", "Which method creates a new array by transforming every item?", ["map", "find", "some", "push"], "map", "map returns a new array containing the callback result for each original item."),
    question("Error handling", "reasoning", "Why should an API call handle a non-OK response?", ["A request can complete with an HTTP error", "All responses are always valid", "It changes TypeScript types", "It makes CSS load"], "A request can complete with an HTTP error", "A completed network request can still be a 4xx or 5xx response, so the UI needs a recovery path."),
  ].map((item) => ({ ...item, difficulty: "beginner", skill } as QuestionTemplate));
}

function pythonQuestions(skill: string): QuestionTemplate[] {
  return [
    question("Python collections", "conceptual", "Which structure stores key-value pairs?", ["dict", "list", "tuple", "set"], "dict", "A dictionary maps keys to values and is useful for named lookup."),
    question("Python iteration", "application", "Which construct is a natural choice for processing each item in a list?", ["for loop", "import only", "return without a function", "class comment"], "for loop", "A for loop visits each item and keeps the processing logic explicit."),
    question("Python functions", "scenario", "Why define a function for a repeated transformation?", ["To name and reuse the behavior", "To make values global", "To prevent all testing", "To skip inputs"], "To name and reuse the behavior", "A function gives repeated logic a clear contract and a single place to improve it."),
    question("Python errors", "reasoning", "What is the purpose of a try/except block?", ["Handle an expected failure path", "Guarantee no code fails", "Convert every value to text", "Install a package"], "Handle an expected failure path", "try/except lets a program respond intentionally when an operation raises a known error."),
    question("Python data work", "practical", "Before calculating an average, what should you check in incoming data?", ["Missing or invalid values", "Only variable names", "The screen width", "The import order"], "Missing or invalid values", "Validation prevents missing or malformed inputs from quietly distorting the result."),
  ].map((item) => ({ ...item, difficulty: "beginner", skill } as QuestionTemplate));
}

function statisticsQuestions(skill: string): QuestionTemplate[] {
  return [
    question("Central tendency", "conceptual", "Which measure is least affected by one extremely large outlier?", ["Median", "Mean", "Sum", "Range"], "Median", "The median depends on the ordered middle position, so one extreme value usually has less influence."),
    question("Distributions", "scenario", "A dataset has a long tail toward higher values. Which description fits best?", ["Right-skewed", "Perfectly symmetric", "Left-skewed", "Constant"], "Right-skewed", "A tail extending toward larger values is commonly described as right skew."),
    question("Probability", "application", "If two independent events have probabilities 0.5 and 0.2, what is the probability that both occur?", ["0.10", "0.30", "0.70", "2.50"], "0.10", "For independent events, multiply their probabilities: 0.5 × 0.2 = 0.10."),
    question("Variation", "reasoning", "What does a larger standard deviation generally indicate?", ["More spread around the mean", "A larger sample count", "A guaranteed higher mean", "No variation"], "More spread around the mean", "Standard deviation summarizes the typical distance of observations from the mean."),
    question("Interpretation", "practical", "When comparing two groups, why should you inspect both the average and the distribution?", ["The average can hide spread or unusual values", "The distribution never matters", "It removes the need for context", "It guarantees causation"], "The average can hide spread or unusual values", "Two groups can share an average while differing substantially in spread, shape, or outliers."),
  ].map((item) => ({ ...item, difficulty: "beginner", skill } as QuestionTemplate));
}

function genericQuestions(skill: string, milestone: string): QuestionTemplate[] {
  return [
    question(`${skill} foundations`, "conceptual", `Which action best establishes a foundation in ${skill}?`, [`Define the core idea and its purpose`, "Skip directly to an unrelated topic", "Memorize a result without context", "Avoid examples"], "Define the core idea and its purpose", `A clear definition gives your ${milestone} work a testable starting point.`),
    question(`${skill} scenario`, "scenario", `You are applying ${skill} to a small task. What should you identify first?`, ["The input, desired result, and constraints", "Only the final screen", "A random advanced feature", "A solution before the problem"], "The input, desired result, and constraints", "Clarifying the task makes it possible to choose and evaluate an appropriate approach."),
    question(`${skill} practice`, "application", `Which practice loop is most useful for improving ${skill}?`, ["Attempt, check evidence, and revise", "Read once and never apply", "Change topics after every mistake", "Copy an answer without explaining it"], "Attempt, check evidence, and revise", "A short feedback loop turns mistakes into targeted practice rather than passive exposure."),
    question(`${skill} reasoning`, "reasoning", `Why connect ${skill} to a real example?`, ["It tests whether the idea transfers beyond a definition", "It makes the concept impossible to measure", "It removes the need for feedback", "It guarantees mastery immediately"], "It tests whether the idea transfers beyond a definition", "Transfer to a realistic example is evidence that the concept is becoming usable."),
    question(`${skill} next step`, "practical", `What is the best next step after completing a ${milestone} lesson?`, ["Solve a small related task and review the result", "Jump to the hardest unrelated topic", "Ignore any errors", "Restart onboarding"], "Solve a small related task and review the result", "Application and review reinforce the current milestone before you move ahead."),
  ].map((item) => ({ ...item, difficulty: "beginner", skill } as QuestionTemplate));
}

function question(topic: string, type: QuestionTemplate["type"], prompt: string, options: string[], correctAnswer: string, explanation: string): QuestionTemplate {
  return { topic, type, question: prompt, options, correctAnswer, explanation, difficulty: "beginner" };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill";
}

function stableHash(value: string) {
  return [...value].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7);
}
