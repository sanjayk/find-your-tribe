import {
  ArrowDown,
  ArrowRight,
  Github,
  Globe,
  Star,
  Terminal,
  Twitter,
} from "lucide-react";

// ─── Mock Data ───

const SOCIAL_PROOF = [
  { value: "2,847", label: "builders joined" },
  { value: "612", label: "projects shipped" },
  { value: "184", label: "active tribes" },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    number: "01",
    title: "Ship your work",
    description:
      "Connect GitHub. Import projects. Every commit, deploy, and release builds your reputation automatically. No writing threads about it.",
  },
  {
    number: "02",
    title: "Form your tribe",
    description:
      "Find builders with complementary skills. A designer looking for an engineer. A founder looking for a growth lead. Tribes ship together.",
  },
  {
    number: "03",
    title: "Earn your score",
    description:
      "Your Builder Score reflects real contributions — code shipped, projects completed, collaboration consistency. Not followers. Not likes.",
  },
] as const;

const FEATURED_BUILDER = {
  initials: "MC",
  name: "Maya Chen",
  role: "Full-Stack Developer",
  bio: "Building AI-powered tools for makers. Previously led engineering at a YC startup. Believes the best products are built by small, opinionated teams.",
  skills: ["React", "Python", "PostgreSQL", "FastAPI"],
  status: "Open to collaborate",
  score: 72,
  avatarBg: "bg-indigo-100",
  avatarText: "text-indigo-700",
} as const;

const LIST_BUILDERS = [
  {
    initials: "JO",
    name: "James Okafor",
    role: "Product Designer",
    bio: "Design systems enthusiast. Crafts delightful experiences for early-stage teams.",
    skills: ["Figma", "UI/UX", "Prototyping"],
    status: "Collaborating",
    statusActive: true,
    score: 58,
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-700",
  },
  {
    initials: "PS",
    name: "Priya Sharma",
    role: "Backend Engineer",
    bio: "Distributed systems at scale. Open source contributor. Infrastructure that doesn't keep you up at night.",
    skills: ["Go", "Kubernetes", "gRPC"],
    status: "Open to collaborate",
    statusActive: true,
    score: 65,
    avatarBg: "bg-rose-100",
    avatarText: "text-rose-700",
  },
  {
    initials: "DM",
    name: "David Morales",
    role: "Growth Marketer",
    bio: "Growth hacker turned founder. 0-to-1 go-to-market. Loves experimenting with new channels.",
    skills: ["SEO", "Analytics", "Content"],
    status: "Heads down",
    statusActive: false,
    score: 41,
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-700",
  },
  {
    initials: "SK",
    name: "Sarah Kim",
    role: "Frontend Developer",
    bio: "Accessibility advocate. Component library creator. Beautiful, performant web experiences.",
    skills: ["React", "TypeScript", "Next.js"],
    status: "Open to collaborate",
    statusActive: true,
    score: 49,
    avatarBg: "bg-violet-100",
    avatarText: "text-violet-700",
  },
] as const;

const HERO_PROJECT = {
  name: "AI Resume Builder",
  description:
    "AI-powered resume builder that helps developers showcase their skills with beautiful, ATS-friendly templates. Generates tailored content from your GitHub profile.",
  skills: ["React", "FastAPI", "PostgreSQL", "GPT-4"],
  stars: 142,
  shippedAgo: "Shipped 2 weeks ago",
  contributors: [
    { initials: "MC", name: "Maya Chen", bg: "bg-indigo-100", text: "text-indigo-700" },
    { initials: "JO", name: "James Okafor", bg: "bg-amber-100", text: "text-amber-700" },
  ],
} as const;

const COMPACT_PROJECTS = [
  {
    name: "Tribe Finder",
    description: "AI-powered matching to connect builders with complementary skills.",
    skills: ["Next.js", "Go", "Redis"],
    statusLabel: "In Progress",
    contributor: { initials: "PS", name: "Priya Sharma", bg: "bg-rose-100", text: "text-rose-700" },
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
  },
  {
    name: "Open Source CRM",
    description: "Privacy-first CRM for small teams. Self-hosted, modern UX.",
    skills: ["Vue", "Django"],
    stars: 89,
    contributor: { initials: "SK", name: "Sarah Kim", bg: "bg-violet-100", text: "text-violet-700" },
    gradient: "from-amber-400 via-orange-500 to-rose-500",
  },
] as const;

const FEED_TABS = ["All", "Ships", "Tribes", "People"] as const;

const FEED_ITEMS = [
  {
    user: "Maya Chen",
    initials: "MC",
    avatarBg: "bg-indigo-100",
    avatarText: "text-indigo-700",
    action: "shipped",
    time: "2h",
    type: "ship" as const,
  },
  {
    user: "Priya Sharma",
    initials: "PS",
    avatarBg: "bg-rose-100",
    avatarText: "text-rose-700",
    action: "formed a tribe",
    time: "1d",
    type: "tribe" as const,
  },
  {
    user: "Alex Rivera",
    initials: "AR",
    avatarBg: "bg-cyan-100",
    avatarText: "text-cyan-700",
    action: "started building",
    time: "5h",
    type: "build" as const,
  },
  {
    user: "James Okafor",
    initials: "JO",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-700",
    action: "joined Find Your Tribe",
    time: "2d",
    type: "join" as const,
  },
] as const;

const PROFILE = {
  initials: "MC",
  name: "Maya Chen",
  handle: "@mayachen",
  score: 72,
  bio: "Building AI tools for small teams. Passionate about simplifying complex workflows. Based in San Francisco.",
  skills: ["React", "Python", "PostgreSQL", "TypeScript"],
  stats: [
    { label: "Projects shipped", value: "4" },
    { label: "Tribes", value: "2" },
    { label: "Joined", value: "Mar 2024" },
  ],
  shippedProjects: [
    {
      name: "AI Resume Builder",
      description: "AI-powered resume builder with ATS-friendly templates.",
      skills: ["React", "FastAPI", "PostgreSQL"],
      status: "Shipped",
      stars: 142,
      gradient: "from-indigo-500 via-violet-500 to-purple-600",
    },
    {
      name: "Tribe Finder",
      description: "AI-powered matching for builder teams.",
      skills: ["Next.js", "Go", "Redis"],
      status: "In Progress",
      gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    },
  ],
  collaborators: [
    { initials: "JO", name: "James Okafor", role: "Designer", bg: "bg-amber-100", text: "text-amber-700" },
    { initials: "PS", name: "Priya Sharma", role: "Backend Engineer", bg: "bg-rose-100", text: "text-rose-700" },
    { initials: "AR", name: "Alex Rivera", role: "DevOps", bg: "bg-cyan-100", text: "text-cyan-700" },
  ],
} as const;

const TRIBE = {
  name: "Hospitality OS",
  description:
    "Building the operating system for modern hospitality. Tools that help hotels, restaurants, and service providers deliver exceptional experiences while running efficient operations.",
  techStack: ["Next.js", "Go", "Redis", "PostgreSQL", "Tailwind"],
  members: [
    { initials: "MC", name: "Maya Chen", role: "Full-Stack Developer", bg: "bg-indigo-100", text: "text-indigo-700", badge: "Owner" },
    { initials: "JO", name: "James Okafor", role: "Product Designer", bg: "bg-amber-100", text: "text-amber-700" },
    { initials: "PS", name: "Priya Sharma", role: "Backend Engineer", bg: "bg-rose-100", text: "text-rose-700" },
  ],
  openRoles: [
    {
      title: "Backend Engineer",
      description:
        "Help architect the core platform. API design, database optimization, scalable microservices. Experience with Go or Rust preferred.",
    },
    {
      title: "Growth Marketer",
      description:
        "Own go-to-market strategy. Build partnerships with hospitality businesses. Drive user acquisition from zero.",
    },
  ],
} as const;

// ─── Component ───

export default function Home() {
  return (
    <main>
      {/* ─── Hero ─── */}
      <section id="hero" className="bg-surface-primary bg-topo min-h-[calc(100svh-4rem)]">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6 flex flex-col min-h-[calc(100svh-4rem)]">
          <div className="flex-1 flex flex-col justify-center py-12 md:py-16">
            <p className="text-[12px] font-medium text-accent uppercase mb-6">
              For builders who ship
            </p>

            <h1 className="font-serif display text-ink max-w-[820px] mb-8">
              Your reputation is<br className="hidden md:block" /> what you{" "}
              <em className="text-accent">build,</em>
              <br className="hidden md:block" /> not what you post.
            </h1>

            <p className="body-lg text-ink-secondary max-w-[520px] mb-12">
              A social network where clout comes from shipping. Connect your
              GitHub, form a tribe, and let your work speak.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button className="inline-flex items-center gap-3 bg-ink text-ink-inverse text-[15px] font-medium px-6 py-3.5 rounded-lg hover:bg-ink/90 transition-colors duration-150">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-[15px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-150 py-3.5"
              >
                See how it works
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              {SOCIAL_PROOF.map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-5">
                  {i > 0 && <div className="h-4 w-px bg-ink/10" />}
                  <p className="text-[13px] text-ink-tertiary">
                    <span className="font-mono font-medium text-ink-secondary">{stat.value}</span>{" "}
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="font-mono text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium text-accent mb-4">
                  {step.number}
                </div>
                <h3 className="font-serif text-[28px] leading-[1.15] text-ink mb-4">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-ink-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Builders ─── */}
      <section id="builders" className="bg-surface-secondary py-20 md:py-28">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6">
          <div className="flex items-baseline justify-between mb-12">
            <div>
              <p className="text-[12px] font-medium text-accent uppercase mb-3">
                Discover
              </p>
              <h2 className="font-serif h1 text-ink">Builders</h2>
            </div>
            <a
              href="#"
              className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-accent transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Featured: Maya Chen */}
            <div className="lg:col-span-5 card-lift bg-surface-elevated bg-dots rounded-xl p-6 md:p-8 shadow-md">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`avatar avatar-lg ${FEATURED_BUILDER.avatarBg} ${FEATURED_BUILDER.avatarText}`}
                >
                  <span className="text-xl">{FEATURED_BUILDER.initials}</span>
                </div>
                <div>
                  <h3 className="font-serif text-[24px] leading-tight text-ink">
                    {FEATURED_BUILDER.name}
                  </h3>
                  <p className="text-[13px] text-ink-tertiary mt-0.5">
                    {FEATURED_BUILDER.role}
                  </p>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-ink-secondary mb-6">
                {FEATURED_BUILDER.bio}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-8">
                {FEATURED_BUILDER.skills.map((skill) => (
                  <span
                    key={skill}
                    className="font-mono text-[11px] bg-surface-secondary text-ink-secondary px-2.5 py-1 rounded-md"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-shipped">
                  <span className="w-1.5 h-1.5 rounded-full bg-shipped" />
                  {FEATURED_BUILDER.status}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[32px] font-medium text-accent leading-none">
                    {FEATURED_BUILDER.score}
                  </span>
                  <span className="text-[11px] text-ink-tertiary">score</span>
                </div>
              </div>
            </div>

            {/* Right column: stacked list cards */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {LIST_BUILDERS.map((builder, i) => (
                <div
                  key={builder.name}
                  className={
                    i < LIST_BUILDERS.length - 1
                      ? "pb-5 border-b border-ink/5"
                      : "pb-5"
                  }
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`avatar avatar-md ${builder.avatarBg} ${builder.avatarText}`}
                    >
                      <span className="text-sm">{builder.initials}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-lg leading-tight text-ink">
                        {builder.name}
                      </h3>
                      <p className="text-[12px] text-ink-tertiary">
                        {builder.role}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[22px] font-medium ${
                        builder.statusActive
                          ? "text-accent/80"
                          : "text-ink-tertiary"
                      }`}
                    >
                      {builder.score}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-secondary mb-3">
                    {builder.bio}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {builder.skills.map((skill, si) => (
                        <span key={skill}>
                          {si > 0 && (
                            <span className="text-ink-tertiary/30 mr-1.5">
                              /
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-ink-tertiary">
                            {skill}
                          </span>
                        </span>
                      ))}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] ${
                        builder.statusActive
                          ? "font-medium text-shipped"
                          : "text-ink-tertiary"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          builder.statusActive
                            ? "bg-shipped"
                            : "bg-ink-tertiary"
                        }`}
                      />
                      {builder.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Projects ─── */}
      <section id="projects" className="py-20 md:py-28">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6">
          <div className="flex items-baseline justify-between mb-12">
            <div>
              <p className="text-[12px] font-medium text-accent uppercase mb-3">
                Recently shipped
              </p>
              <h2 className="font-serif h1 text-ink">Projects</h2>
            </div>
            <a
              href="#"
              className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-accent transition-colors"
            >
              Browse all <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Hero project card */}
            <div className="lg:col-span-7 card-lift bg-surface-elevated bg-dots rounded-xl overflow-hidden shadow-md group">
              <div className="aspect-[16/9] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600" />
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-white/70 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    {HERO_PROJECT.shippedAgo}
                  </span>
                  <div className="flex items-center gap-1.5 text-white/70 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5" />
                    <span className="text-[12px] font-medium">
                      {HERO_PROJECT.stars}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8">
                <h3 className="font-serif text-[28px] leading-tight text-ink mb-3">
                  {HERO_PROJECT.name}
                </h3>
                <p className="text-[15px] leading-relaxed text-ink-secondary mb-5">
                  {HERO_PROJECT.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {HERO_PROJECT.skills.map((skill) => (
                    <span
                      key={skill}
                      className="font-mono text-[11px] bg-surface-secondary text-ink-secondary px-2.5 py-1 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  {HERO_PROJECT.contributors.map((c, i) => (
                    <span key={c.name} className="flex items-center gap-3">
                      {i > 0 && (
                        <span className="text-ink-tertiary">+</span>
                      )}
                      <div
                        className={`avatar avatar-sm ${c.bg} ${c.text}`}
                      >
                        <span className="text-[11px]">{c.initials}</span>
                      </div>
                      <span className="text-[13px] text-ink-secondary">
                        {c.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Supporting project cards */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {COMPACT_PROJECTS.map((project) => (
                <div
                  key={project.name}
                  className="card-lift bg-surface-elevated rounded-xl overflow-hidden shadow-md flex-1"
                >
                  <div className="aspect-[16/7] relative overflow-hidden">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${project.gradient}`}
                    />
                    {"statusLabel" in project && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[11px] font-medium text-white/80 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          {project.statusLabel}
                        </span>
                      </div>
                    )}
                    {"stars" in project && (
                      <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-white/70 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <Star className="w-3 h-3" />
                        <span className="text-[11px] font-medium">
                          {project.stars}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl leading-tight text-ink mb-2">
                      {project.name}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-ink-secondary mb-4">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`avatar avatar-xs ${project.contributor.bg} ${project.contributor.text}`}
                        >
                          <span className="text-[9px]">
                            {project.contributor.initials}
                          </span>
                        </div>
                        <span className="text-[12px] text-ink-tertiary">
                          {project.contributor.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {project.skills.map((skill, si) => (
                          <span key={skill}>
                            {si > 0 && (
                              <span className="text-ink-tertiary/30 mr-1.5">
                                /
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-ink-tertiary">
                              {skill}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feed ─── */}
      <section id="feed" className="bg-surface-secondary py-20 md:py-28">
        <div className="max-w-[620px] mx-auto px-5 md:px-6">
          <div className="mb-10">
            <p className="text-[12px] font-medium text-accent uppercase mb-3">
              What&apos;s happening
            </p>
            <h2 className="font-serif h1 text-ink">Feed</h2>
          </div>

          <div className="flex items-center gap-1 mb-8 p-1 bg-surface-primary rounded-lg w-fit">
            {FEED_TABS.map((tab, i) => (
              <button
                key={tab}
                className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
                  i === 0
                    ? "bg-surface-elevated text-ink shadow-sm"
                    : "text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="divide-y divide-ink/5">
            {FEED_ITEMS.map((item) => (
              <article key={`${item.user}-${item.action}`} className="py-5 first:pt-0">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`avatar avatar-md ${item.avatarBg} ${item.avatarText}`}
                  >
                    <span className="text-sm">{item.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[14px] font-medium text-ink">
                        {item.user}
                      </span>
                      <span className="text-[12px] text-ink-tertiary">
                        {item.action}
                      </span>
                      <span className="ml-auto text-[11px] text-ink-tertiary">
                        {item.time}
                      </span>
                    </div>

                    {/* Ship embed */}
                    {item.type === "ship" && (
                      <div className="mt-3 bg-surface-elevated rounded-lg overflow-hidden shadow-sm">
                        <div className="aspect-[3/1] bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 relative">
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)",
                              backgroundSize: "30px 30px",
                            }}
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-serif text-[16px] text-ink">
                              AI Resume Builder
                            </span>
                            <div className="flex items-center gap-1 text-ink-tertiary">
                              <Star className="w-3.5 h-3.5" />
                              <span className="font-mono text-[12px]">
                                142
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <span className="font-mono text-[10px] text-ink-tertiary">
                              React
                            </span>
                            <span className="font-mono text-[10px] text-ink-tertiary">
                              FastAPI
                            </span>
                            <span className="font-mono text-[10px] text-ink-tertiary">
                              PostgreSQL
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tribe embed */}
                    {item.type === "tribe" && (
                      <div className="mt-3">
                        <div className="font-serif text-[16px] text-ink mb-1.5">
                          Tribe Finder Team
                        </div>
                        <p className="text-[12px] text-ink-secondary mb-3">
                          3 members. Looking for a backend engineer and
                          growth marketer.
                        </p>
                        <div className="flex -space-x-2">
                          <div className="avatar avatar-sm bg-rose-100 text-rose-700 ring-2 ring-surface-secondary">
                            <span className="text-[10px]">PS</span>
                          </div>
                          <div className="avatar avatar-sm bg-indigo-100 text-indigo-700 ring-2 ring-surface-secondary">
                            <span className="text-[10px]">MC</span>
                          </div>
                          <div className="avatar avatar-sm bg-amber-100 text-amber-700 ring-2 ring-surface-secondary">
                            <span className="text-[10px]">JO</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Build embed */}
                    {item.type === "build" && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center flex-shrink-0">
                          <Terminal className="w-5 h-5 text-white/70" />
                        </div>
                        <div>
                          <div className="font-serif text-[15px] text-ink">
                            DevOps Dashboard
                          </div>
                          <div className="flex gap-2 mt-0.5">
                            <span className="font-mono text-[10px] text-ink-tertiary">
                              React
                            </span>
                            <span className="text-ink-tertiary/30">/</span>
                            <span className="font-mono text-[10px] text-ink-tertiary">
                              Node.js
                            </span>
                            <span className="text-ink-tertiary/30">/</span>
                            <span className="font-mono text-[10px] text-ink-tertiary">
                              Docker
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Join embed */}
                    {item.type === "join" && (
                      <div className="flex gap-1.5 mt-3">
                        <span className="font-mono text-[11px] text-ink-tertiary">
                          Figma
                        </span>
                        <span className="text-ink-tertiary/30">/</span>
                        <span className="font-mono text-[11px] text-ink-tertiary">
                          UI/UX
                        </span>
                        <span className="text-ink-tertiary/30">/</span>
                        <span className="font-mono text-[11px] text-ink-tertiary">
                          Prototyping
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Profile Preview ─── */}
      <section id="profile" className="py-20 md:py-28">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6">
          <p className="text-[12px] font-medium text-accent uppercase mb-8">
            Builder profile
          </p>

          <div className="flex flex-col md:flex-row gap-10 md:gap-16">
            {/* Sidebar */}
            <aside className="w-full md:w-[280px] flex-shrink-0">
              <div className="md:sticky md:top-24">
                <div className="avatar avatar-xl bg-indigo-100 text-indigo-700 mb-6">
                  <span className="text-3xl">{PROFILE.initials}</span>
                </div>

                <h2 className="font-serif text-[32px] leading-none text-ink mb-1">
                  {PROFILE.name}
                </h2>
                <p className="font-mono text-[13px] text-ink-tertiary mb-4">
                  {PROFILE.handle}
                </p>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-mono text-[48px] font-medium text-accent leading-none">
                    {PROFILE.score}
                  </span>
                  <span className="text-[12px] text-ink-tertiary leading-none">
                    builder
                    <br />
                    score
                  </span>
                </div>

                <p className="text-[15px] leading-relaxed text-ink-secondary mb-6">
                  {PROFILE.bio}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {PROFILE.skills.map((skill) => (
                    <span
                      key={skill}
                      className="font-mono text-[11px] bg-surface-secondary text-ink-secondary px-2.5 py-1 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 mb-6">
                  <span className="w-2 h-2 rounded-full bg-shipped" />
                  <span className="text-[13px] font-medium text-shipped">
                    Open to collaborate
                  </span>
                </div>

                <div className="flex items-center gap-4 text-ink-tertiary">
                  <a
                    href="#"
                    className="hover:text-ink transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="w-[18px] h-[18px]" />
                  </a>
                  <a
                    href="#"
                    className="hover:text-ink transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-[18px] h-[18px]" />
                  </a>
                  <a
                    href="#"
                    className="hover:text-ink transition-colors"
                    aria-label="Website"
                  >
                    <Globe className="w-[18px] h-[18px]" />
                  </a>
                </div>

                <div className="mt-6 pt-6 border-t border-surface-secondary">
                  <div className="text-[12px] text-ink-tertiary">
                    {PROFILE.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex justify-between mb-2 last:mb-0"
                      >
                        <span>{stat.label}</span>
                        <span className="font-mono text-ink">
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Shipped Projects */}
              <div className="mb-14">
                <h3 className="text-[12px] font-medium text-accent uppercase mb-6">
                  Shipped projects
                </h3>

                <div className="space-y-4">
                  {PROFILE.shippedProjects.map((project) => (
                    <div
                      key={project.name}
                      className="card-lift bg-surface-elevated rounded-xl overflow-hidden shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row">
                        <div
                          className={`sm:w-48 aspect-[16/10] sm:aspect-auto bg-gradient-to-br ${project.gradient} relative flex-shrink-0`}
                        />
                        <div className="p-5 flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-serif text-xl leading-tight text-ink">
                              {project.name}
                            </h4>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ml-3 flex-shrink-0 ${
                                project.status === "Shipped"
                                  ? "text-shipped bg-shipped-subtle"
                                  : "text-in-progress bg-in-progress-subtle"
                              }`}
                            >
                              {project.status}
                            </span>
                          </div>
                          <p className="text-[13px] text-ink-secondary mb-3">
                            {project.description}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                              {project.skills.map((skill, si) => (
                                <span key={skill}>
                                  {si > 0 && (
                                    <span className="text-ink-tertiary/30 mr-1.5">
                                      /
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] text-ink-tertiary">
                                    {skill}
                                  </span>
                                </span>
                              ))}
                            </div>
                            {"stars" in project && (
                              <div className="ml-auto flex items-center gap-1 text-ink-tertiary">
                                <Star className="w-3.5 h-3.5" />
                                <span className="font-mono text-[12px]">
                                  {project.stars}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collaborators */}
              <div>
                <h3 className="text-[12px] font-medium text-accent uppercase mb-6">
                  Frequent collaborators
                </h3>
                <div className="flex flex-wrap gap-4">
                  {PROFILE.collaborators.map((collab) => (
                    <div
                      key={collab.name}
                      className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3 shadow-sm"
                    >
                      <div
                        className={`avatar avatar-sm ${collab.bg} ${collab.text}`}
                      >
                        <span className="text-[11px]">
                          {collab.initials}
                        </span>
                      </div>
                      <div>
                        <div className="text-[14px] font-medium text-ink">
                          {collab.name}
                        </div>
                        <div className="text-[11px] text-ink-tertiary">
                          {collab.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Tribe Preview ─── */}
      <section id="tribe" className="bg-surface-secondary py-20 md:py-28">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left: Tribe info */}
            <div className="lg:col-span-7">
              <p className="text-[12px] font-medium text-accent uppercase mb-4">
                Open tribe
              </p>
              <h2 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.05] text-ink mb-6">
                {TRIBE.name}
              </h2>

              <p className="body-lg text-ink-secondary mb-10 max-w-[540px]">
                {TRIBE.description}
              </p>

              {/* Members */}
              <div className="mb-10">
                <h4 className="text-[12px] font-medium text-accent uppercase mb-5">
                  Team
                </h4>
                <div className="space-y-4">
                  {TRIBE.members.map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-4"
                    >
                      <div
                        className={`avatar avatar-md ${member.bg} ${member.text}`}
                      >
                        <span className="text-sm">{member.initials}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-[15px] font-medium text-ink">
                          {member.name}
                        </div>
                        <div className="text-[12px] text-ink-tertiary">
                          {member.role}
                        </div>
                      </div>
                      {"badge" in member && (
                        <span className="text-[11px] font-medium text-accent bg-accent-subtle px-2.5 py-1 rounded-full">
                          {member.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech stack */}
              <div className="flex flex-wrap gap-2">
                {TRIBE.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-[11px] text-ink-secondary bg-surface-elevated px-2.5 py-1 rounded-md shadow-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Open roles */}
            <div className="lg:col-span-5">
              <h4 className="text-[12px] font-medium text-accent uppercase mb-5">
                Open roles
              </h4>

              <div className="space-y-4">
                {TRIBE.openRoles.map((role) => (
                  <div
                    key={role.title}
                    className="bg-surface-elevated bg-dots rounded-xl p-6 shadow-md"
                  >
                    <h4 className="font-serif text-xl text-ink mb-2">
                      {role.title}
                    </h4>
                    <p className="text-[13px] text-ink-secondary mb-5 leading-relaxed">
                      {role.description}
                    </p>
                    <button className="w-full bg-ink text-ink-inverse text-[13px] font-medium px-4 py-2.5 rounded-lg hover:bg-ink/90 transition-colors">
                      Request to join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 md:py-16">
        <div className="max-w-[1120px] mx-auto px-5 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="font-serif text-lg text-ink">
                find your tribe
              </span>
              <p className="text-[12px] text-ink-tertiary mt-1">
                Clout through building, not posting.
              </p>
            </div>
            <div className="flex items-center gap-6 text-[13px] text-ink-tertiary">
              <a href="#" className="hover:text-ink transition-colors">
                About
              </a>
              <a href="#" className="hover:text-ink transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-ink transition-colors">
                Twitter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
