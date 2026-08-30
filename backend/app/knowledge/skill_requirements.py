from dataclasses import dataclass, field


@dataclass(frozen=True)
class SkillRequirement:
    name: str
    category: str
    required_level: int
    importance: int
    aliases: tuple[str, ...] = field(default_factory=tuple)
    prerequisites: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class RoleRequirement:
    role: str
    aliases: tuple[str, ...]
    skills: tuple[SkillRequirement, ...]


ROLE_REQUIREMENTS: tuple[RoleRequirement, ...] = (
    RoleRequirement(
        role="Generative AI Engineer",
        aliases=(
            "gen ai engineer",
            "genai engineer",
            "generative ai engineer",
            "llm engineer",
            "ai engineer",
        ),
        skills=(
            SkillRequirement("Python", "Programming", 2, 5, ("python programming",)),
            SkillRequirement("Machine Learning", "Machine Learning", 3, 5, ("ml",)),
            SkillRequirement("Deep Learning", "Machine Learning", 3, 4, ("neural networks",)),
            SkillRequirement("Transformers", "Generative AI", 3, 5, ("transformer models",), ("Machine Learning", "Deep Learning")),
            SkillRequirement("LLM Fundamentals", "Generative AI", 4, 5, ("large language models", "llms"), ("Machine Learning", "Transformers")),
            SkillRequirement("Prompt Engineering", "Generative AI", 3, 4, ("prompting",), ("LLM Fundamentals",)),
            SkillRequirement("RAG", "Generative AI", 4, 5, ("retrieval augmented generation",), ("LLM Fundamentals", "Vector Databases")),
            SkillRequirement("Vector Databases", "Generative AI", 3, 4, ("vector db", "vector search", "embeddings database"), ("Machine Learning",)),
            SkillRequirement("LLM Evaluation", "Generative AI", 3, 4, ("model evaluation", "llm evals"), ("LLM Fundamentals",)),
            SkillRequirement("APIs", "Engineering", 3, 4, ("api development", "rest api", "rest apis")),
            SkillRequirement("Git", "Engineering", 2, 3, ("version control",)),
            SkillRequirement("Deployment", "Engineering", 2, 3, ("deployments", "app deployment"), ("APIs", "Git")),
        ),
    ),
    RoleRequirement(
        role="Data Analyst",
        aliases=("data analyst", "analytics analyst", "business data analyst"),
        skills=(
            SkillRequirement("SQL", "Data", 4, 5, ("structured query language",)),
            SkillRequirement("Spreadsheets", "Data", 3, 4, ("excel", "google sheets")),
            SkillRequirement("Python", "Programming", 2, 4, ("python programming",)),
            SkillRequirement("Statistics", "Analytics", 3, 5, ("statistical analysis",)),
            SkillRequirement("Data Cleaning", "Analytics", 3, 5, ("data wrangling", "data preprocessing"), ("SQL",)),
            SkillRequirement("Data Visualization", "Analytics", 3, 5, ("visualization", "charts", "dashboards"), ("Statistics",)),
            SkillRequirement("BI Tools", "Analytics", 3, 4, ("power bi", "tableau", "looker")),
            SkillRequirement("Business Metrics", "Business", 3, 4, ("kpis", "metric analysis")),
            SkillRequirement("Communication", "Business", 3, 4, ("storytelling", "data storytelling"), ("Data Visualization",)),
            SkillRequirement("Git", "Engineering", 1, 2, ("version control",)),
        ),
    ),
    RoleRequirement(
        role="Frontend Developer",
        aliases=("frontend developer", "front end developer", "ui developer", "react developer"),
        skills=(
            SkillRequirement("HTML", "Frontend", 3, 5, ("html5",)),
            SkillRequirement("CSS", "Frontend", 3, 5, ("css3", "responsive design")),
            SkillRequirement("JavaScript", "Programming", 4, 5, ("js",)),
            SkillRequirement("TypeScript", "Programming", 3, 4, ("ts",), ("JavaScript",)),
            SkillRequirement("React", "Frontend", 3, 5, ("reactjs", "react.js"), ("JavaScript",)),
            SkillRequirement("State Management", "Frontend", 2, 3, ("client state",), ("React",)),
            SkillRequirement("APIs", "Engineering", 2, 4, ("api integration", "rest api", "rest apis"), ("JavaScript",)),
            SkillRequirement("Testing", "Engineering", 2, 3, ("frontend testing", "unit testing"), ("JavaScript",)),
            SkillRequirement("Accessibility", "Frontend", 2, 3, ("a11y",), ("HTML", "CSS")),
            SkillRequirement("Git", "Engineering", 2, 3, ("version control",)),
        ),
    ),
    RoleRequirement(
        role="Backend Developer",
        aliases=("backend developer", "back end developer", "api developer", "server side developer"),
        skills=(
            SkillRequirement("Python", "Programming", 3, 4, ("python programming",)),
            SkillRequirement("APIs", "Engineering", 4, 5, ("api development", "rest api", "rest apis")),
            SkillRequirement("Databases", "Data", 3, 5, ("database design", "db design")),
            SkillRequirement("SQL", "Data", 3, 4, ("structured query language",), ("Databases",)),
            SkillRequirement("Authentication", "Security", 3, 4, ("auth", "authorization"), ("APIs",)),
            SkillRequirement("Testing", "Engineering", 3, 4, ("unit testing", "integration testing")),
            SkillRequirement("System Design", "Architecture", 3, 4, ("software architecture",), ("APIs", "Databases")),
            SkillRequirement("Docker", "Deployment", 2, 3, ("containers", "containerization"), ("Deployment",)),
            SkillRequirement("Deployment", "Deployment", 2, 3, ("deployments", "app deployment"), ("Git",)),
            SkillRequirement("Git", "Engineering", 2, 3, ("version control",)),
        ),
    ),
    RoleRequirement(
        role="Cloud/DevOps Engineer",
        aliases=("cloud devops engineer", "cloud engineer", "devops engineer", "site reliability engineer", "sre"),
        skills=(
            SkillRequirement("Linux", "Systems", 3, 5, ("unix", "shell")),
            SkillRequirement("Networking", "Systems", 3, 4, ("computer networking",)),
            SkillRequirement("Cloud Platforms", "Cloud", 3, 5, ("aws", "azure", "gcp")),
            SkillRequirement("Docker", "Containers", 3, 5, ("containers", "containerization"), ("Linux",)),
            SkillRequirement("Kubernetes", "Containers", 3, 5, ("k8s",), ("Docker",)),
            SkillRequirement("CI/CD", "Automation", 3, 4, ("continuous integration", "continuous deployment"), ("Git",)),
            SkillRequirement("Infrastructure as Code", "Automation", 3, 4, ("iac", "terraform"), ("Cloud Platforms",)),
            SkillRequirement("Monitoring", "Operations", 3, 4, ("observability", "logging", "metrics")),
            SkillRequirement("Scripting", "Programming", 2, 4, ("bash", "python scripting"), ("Linux",)),
            SkillRequirement("Git", "Engineering", 2, 3, ("version control",)),
        ),
    ),
)
