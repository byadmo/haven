/**
 * useIdentityBlueprint — Pure frontend "AI" that maps identity statements,
 * friction keywords, and commitment levels into personalized micro-habit stacks
 * with anchoring suggestions.
 *
 * This is a deterministic mapping algorithm, not a real AI. It parses the
 * user's identity text for keywords, matches them to habit archetypes, then
 * scales the habit size based on their stated friction and commitment level.
 */

// ── Habit archetypes ──
const ARCHETYPES = {
  focus: {
    category: "Deep Work & Focus",
    color: "amber",
    habits: [
      {
        name: "Open your focus app",
        microName: "Open your focus app",
        baseName: "Deep work session",
        icon: "Brain",
        tiny: "Open focus app for 1 minute",
        small: "5 minutes of deep work",
        moderate: "25-minute Pomodoro",
        full: "2-hour deep work block",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "opening my laptop",
          "finishing my first coffee",
          "sitting at my desk",
          "putting on my headphones",
          "closing all other browser tabs",
        ],
        rationale: "Deep work is the superpower of the focused mind. Starting small removes the resistance to begin.",
      },
      {
        name: "Review top 3 priorities",
        microName: "Write down 1 priority",
        baseName: "Review top priorities",
        icon: "Target",
        tiny: "Write down 1 priority for the day",
        small: "Write down top 3 priorities",
        moderate: "Time-block your top 3 priorities",
        full: "Full daily planning session (30 min)",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "opening my laptop",
          "sitting at my desk with coffee",
          "finishing breakfast",
          "saying good morning to my family",
        ],
        rationale: "Clarity before action. One clear priority prevents the scatter of busywork.",
      },
      {
        name: "Digital detox hour",
        microName: "5 minutes phone-free",
        baseName: "Digital detox",
        icon: "Brain",
        tiny: "5 minutes without my phone",
        small: "15 minutes phone-free",
        moderate: "30-minute digital detox",
        full: "1-hour digital detox",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "waking up",
          "finishing dinner",
          "getting into bed",
          "feeling the urge to scroll",
        ],
        rationale: "Your attention is your most valuable asset. Protect it like you would your wallet.",
      },
    ],
  },
  fitness: {
    category: "Fitness & Health",
    color: "emerald",
    habits: [
      {
        name: "Daily movement",
        microName: "1 pushup",
        baseName: "Exercise / workout",
        icon: "Dumbbell",
        tiny: "1 pushup",
        small: "5-minute bodyweight circuit",
        moderate: "20-minute workout",
        full: "Full gym session (45+ min)",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "stepping out of bed",
          "brushing my teeth in the morning",
          "finishing my morning coffee",
          "changing out of work clothes",
        ],
        rationale: "Movement is non-negotiable for a healthy body. Tiny now, unstoppable later.",
      },
      {
        name: "Hydrate first",
        microName: "Drink one glass of water",
        baseName: "Hydration check",
        icon: "Droplets",
        tiny: "Drink 1 glass of water",
        small: "Drink 2 glasses of water",
        moderate: "Drink half your bodyweight in oz",
        full: "Track all hydration throughout the day",
        difficulty: { tiny: 1, small: 1, moderate: 2, full: 3 },
        anchors: [
          "waking up",
          "brushing my teeth",
          "finishing breakfast",
          "sitting at my desk",
        ],
        rationale: "Your brain and body need fuel. Water first, everything else second.",
      },
      {
        name: "Sleep by target time",
        microName: "Go to bed 5 minutes earlier",
        baseName: "Sleep schedule",
        icon: "Moon",
        tiny: "Go to bed 5 minutes earlier",
        small: "Go to bed 15 minutes earlier",
        moderate: "In bed by target time",
        full: "Full wind-down routine (no screens 1hr before)",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "finishing dinner",
          "brushing my teeth at night",
          "putting on my pajamas",
          "setting my alarm",
        ],
        rationale: "Sleep is the foundation of every other habit. A tired body cannot build identity.",
      },
    ],
  },
  learning: {
    category: "Learning & Education",
    color: "blue",
    habits: [
      {
        name: "Daily reading",
        microName: "Read 1 page",
        baseName: "Reading",
        icon: "BookOpen",
        tiny: "Read 1 page",
        small: "Read 5 pages",
        moderate: "Read 20 pages",
        full: "Read for 1 hour",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "finishing my morning coffee",
          "getting into bed",
          "opening my Kindle or book app",
          "finishing lunch",
        ],
        rationale: "Readers lead. One page today becomes a library this year.",
      },
      {
        name: "Study session",
        microName: "Review notes for 2 minutes",
        baseName: "Study or skill practice",
        icon: "Brain",
        tiny: "Review notes for 2 minutes",
        small: "Study for 15 minutes",
        moderate: "Study for 1 hour",
        full: "Deep study session (2+ hours)",
        difficulty: { tiny: 1, small: 2, moderate: 4, full: 5 },
        anchors: [
          "opening my laptop",
          "finishing my morning routine",
          "sitting at my desk",
          "after my work hours",
        ],
        rationale: "Knowledge compounds. A tiny daily review beats a cram session every time.",
      },
      {
        name: "Summarize learning",
        microName: "Write 1 sentence",
        baseName: "Daily learning summary",
        icon: "BookOpen",
        tiny: "Write 1 sentence about what I learned",
        small: "Write 3 bullet points",
        moderate: "Write a paragraph summary",
        full: "Full journal entry with reflections",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "closing my laptop",
          "finishing a study session",
          "getting into bed",
          "at the end of my workday",
        ],
        rationale: "You don't know what you know until you write it down. One sentence anchors the lesson.",
      },
    ],
  },
  mindfulness: {
    category: "Mindfulness & Wellness",
    color: "purple",
    habits: [
      {
        name: "Morning meditation",
        microName: "Take 3 deep breaths",
        baseName: "Meditation",
        icon: "Heart",
        tiny: "Take 3 deep, intentional breaths",
        small: "5-minute meditation",
        moderate: "10-minute meditation",
        full: "20-minute meditation + journaling",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "waking up",
          "stepping out of bed",
          "finishing brushing my teeth",
          "sitting down with my morning coffee",
        ],
        rationale: "Peace begins with a single breath. You don't need 20 minutes — you need 3 breaths.",
      },
      {
        name: "Gratitude moment",
        microName: "Name 1 thing you're grateful for",
        baseName: "Gratitude practice",
        icon: "Heart",
        tiny: "Name 1 thing you're grateful for",
        small: "Write down 3 things you're grateful for",
        moderate: "Full gratitude journal entry",
        full: "Gratitude letter to someone",
        difficulty: { tiny: 1, small: 1, moderate: 2, full: 3 },
        anchors: [
          "waking up",
          "getting into bed",
          "finishing dinner",
          "brushing my teeth at night",
        ],
        rationale: "Gratitude rewires the brain for abundance. One thing is enough to start the shift.",
      },
      {
        name: "Evening unwind",
        microName: "1 minute of silence",
        baseName: "Evening wind-down",
        icon: "Moon",
        tiny: "1 minute of silence before sleep",
        small: "5-minute body scan",
        moderate: "15-minute guided relaxation",
        full: "Full no-screen wind-down ritual",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "getting into bed",
          "turning off the lights",
          "brushing my teeth at night",
          "putting my phone on charge",
        ],
        rationale: "How you end the day determines how you begin the next. One minute of silence resets everything.",
      },
    ],
  },
  finance: {
    category: "Financial Discipline",
    color: "green",
    habits: [
      {
        name: "Daily spending review",
        microName: "Check your balance",
        baseName: "Review finances",
        icon: "DollarSign",
        tiny: "Check your bank balance",
        small: "Log today's transactions",
        moderate: "Review daily spending + budget",
        full: "Full financial review + adjust budget",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "finishing my first coffee",
          "opening my laptop",
          "sitting at my desk",
          "finishing dinner",
        ],
        rationale: "What gets measured gets managed. A 10-second balance check keeps you aware.",
      },
      {
        name: "No-impulse day",
        microName: "Skip one unnecessary purchase",
        baseName: "Mindful spending",
        icon: "Target",
        tiny: "Skip one unnecessary purchase today",
        small: "24-hour rule before buying",
        moderate: "No-spend day",
        full: "No-spend week",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 5 },
        anchors: [
          "opening an online store",
          "reaching for my wallet",
          "feeling the urge to buy something",
        ],
        rationale: "Every dollar you don't spend is a dollar working for your future self.",
      },
      {
        name: "Savings contribution",
        microName: "Move $1 to savings",
        baseName: "Save daily",
        icon: "DollarSign",
        tiny: "Move $1 to savings",
        small: "Move $5 to savings",
        moderate: "Auto-transfer to savings",
        full: "Review + optimize savings allocation",
        difficulty: { tiny: 1, small: 1, moderate: 2, full: 3 },
        anchors: [
          "checking my bank balance",
          "finishing my morning coffee",
          "at the start of the workday",
        ],
        rationale: "Small amounts, consistently saved, build financial freedom. Start with $1.",
      },
    ],
  },
  social: {
    category: "Social & Relationships",
    color: "rose",
    habits: [
      {
        name: "Reach out to someone",
        microName: "Send one text",
        baseName: "Connect with loved ones",
        icon: "Users",
        tiny: "Send one thoughtful text",
        small: "Call someone for 5 minutes",
        moderate: "Have a meaningful conversation",
        full: "Plan and host a gathering",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "finishing my morning coffee",
          "taking a break from work",
          "finishing lunch",
          "feeling lonely or bored",
        ],
        rationale: "Connection is a human need. One text can change someone's entire day — including yours.",
      },
      {
        name: "Active listening practice",
        microName: "Put your phone away in one conversation",
        baseName: "Be present with others",
        icon: "Heart",
        tiny: "Put your phone away in one conversation",
        small: "Practice active listening (no interrupting)",
        moderate: "Have a device-free meal with someone",
        full: "Full day of presence with loved ones",
        difficulty: { tiny: 1, small: 2, moderate: 3, full: 4 },
        anchors: [
          "sitting down for a meal with someone",
          "receiving a phone call",
          "starting a conversation",
        ],
        rationale: "The greatest gift you can give someone is your full attention. Practice it daily.",
      },
      {
        name: "Express gratitude",
        microName: "Say 'thank you' intentionally once",
        baseName: "Gratitude to others",
        icon: "Users",
        tiny: "Say 'thank you' with intention once today",
        small: "Write a brief thank-you message",
        moderate: "Write a thank-you note or letter",
        full: "Plan a gratitude visit or gesture",
        difficulty: { tiny: 1, small: 1, moderate: 2, full: 3 },
        anchors: [
          "receiving help from someone",
          "finishing a conversation",
          "feeling grateful for someone",
        ],
        rationale: "Gratitude expressed multiplies. One intentional 'thank you' strengthens every relationship.",
      },
    ],
  },
};

// ── Identity category detection ──
const IDENTITY_PATTERNS = [
  {
    id: "focus",
    keywords: [
      "focus", "attention", "productive", "deep work", "creator", "flow",
      "distraction", "protect my attention", "concentrate", "discipline",
      "work", "career", "build", "maker", "engineer", "coder",
    ],
    icon: "🧠",
    label: "The Focused Creator",
  },
  {
    id: "fitness",
    keywords: [
      "athlete", "fit", "strong", "workout", "exercise", "body", "run",
      "gym", "health", "active", "move", "strength", "energetic",
      "physically", "lift", "sport",
    ],
    icon: "💪",
    label: "The Disciplined Athlete",
  },
  {
    id: "learning",
    keywords: [
      "learn", "read", "student", "study", "knowledge", "curious",
      "education", "book", "skill", "grow my mind", "intellect",
      "smart", "course", "degree", "certification",
    ],
    icon: "📖",
    label: "The Lifelong Learner",
  },
  {
    id: "mindfulness",
    keywords: [
      "calm", "peace", "meditate", "mindful", "present", "zen",
      "balanced", "inner peace", "stress", "anxious", "grounded",
      "breath", "quiet", "still", "serene",
    ],
    icon: "🧘",
    label: "The Calm Mind",
  },
  {
    id: "finance",
    keywords: [
      "money", "wealth", "finance", "invest", "save", "budget",
      "financial", "rich", "debt-free", "freedom", "prosperous",
      "millionaire", "fund", "retire", "passive income",
    ],
    icon: "🛡️",
    label: "The Financial Guardian",
  },
  {
    id: "social",
    keywords: [
      "connect", "friend", "relationship", "social", "community",
      "family", "partner", "parent", "leader", "communicate",
      "help", "serve", "tribe", "belong", "love",
    ],
    icon: "🤝",
    label: "The Connected Human",
  },
];

const DEFAULT_CATEGORY = "focus";

// ── Friction keyword detection ──
function detectFrictionProfile(frictionText) {
  const text = (frictionText || "").toLowerCase();
  const profile = {
    hasProcrastination: /scroll|phone|distract|procrastinate|social media|reddit|youtube|tiktok|instagram/.test(text),
    hasLowEnergy: /tired|exhausted|energy|drained|lazy|can't start|overwhelm/.test(text),
    hasForgetfulness: /forget|remember|skip|miss|busy|habit doesn't stick/.test(text),
    hasPerfectionism: /perfect|all or nothing|quit|fail|day 5|day 3|start over/.test(text),
    isOverwhelmed: /too many|too much|don't know where|cannot choose|everything/.test(text),
  };
  return profile;
}

// ── Map identity → category ──
function detectCategory(identityText) {
  const text = identityText.toLowerCase();
  let bestMatch = { id: DEFAULT_CATEGORY, score: 0 };

  for (const pattern of IDENTITY_PATTERNS) {
    let score = 0;
    for (const kw of pattern.keywords) {
      if (text.includes(kw.toLowerCase())) score += kw.split(" ").length;
    }
    if (score > bestMatch.score) {
      bestMatch = { id: pattern.id, score };
    }
  }

  return bestMatch;
}

// ── Size mapping ──
const SIZE_MAP = [
  { id: "tiny", label: "Tiny", desc: "Almost effortless" },
  { id: "small", label: "Small", desc: "Takes 5 minutes" },
  { id: "moderate", label: "Moderate", desc: "Takes 15-25 minutes" },
  { id: "full", label: "Full", desc: "Takes 30+ minutes" },
];

function pickSize(friction, commitment) {
  // Friction patterns that suggest smaller habits
  if (friction.hasPerfectionism) return "tiny";
  if (friction.isOverwhelmed) return "tiny";
  if (friction.hasLowEnergy) return "tiny";
  if (friction.hasProcrastination) return "small";
  if (friction.hasForgetfulness) return "small";

  // Commitment level overrides
  switch (commitment) {
    case "gentle": return "tiny";
    case "balanced": return "small";
    case "full": return "moderate";
    default: return "small";
  }
}

function pickHabitCount(commitment) {
  switch (commitment) {
    case "gentle": return 1;
    case "balanced": return 2;
    case "full": return 3;
    default: return 2;
  }
}

// ── Pick best anchors for a habit based on friction profile ──
function pickAnchor(habit, friction) {
  const anchors = habit.anchors || [];
  if (anchors.length === 0) return "starting my day";

  // Friction-based anchor selection
  if (friction.hasForgetfulness || friction.isOverwhelmed) {
    // Pick morning anchors — catch them early before the day slips away
    const morningAnchors = anchors.filter(a =>
      /morning|wake|breakfast|brush|coffee|bed/.test(a)
    );
    return morningAnchors.length > 0 ? morningAnchors[0] : anchors[0];
  }

  if (friction.hasLowEnergy) {
    // Pick anchors tied to energy peaks (morning or after specific triggers)
    const morningAnchors = anchors.filter(a =>
      /wake|bed|coffee|breakfast|sit/.test(a)
    );
    return morningAnchors.length > 0 ? morningAnchors[0] : anchors[0];
  }

  if (friction.hasProcrastination) {
    // Pick device-related anchors
    const deviceAnchors = anchors.filter(a =>
      /laptop|phone|desk|tab/.test(a)
    );
    return deviceAnchors.length > 0 ? deviceAnchors[0] : anchors[0];
  }

  if (friction.hasPerfectionism) {
    // Pick the simplest, lowest-friction anchor
    return anchors[anchors.length - 1];
  }

  return anchors[0];
}

// ── Generate a display identity phrase ──
function generateIdentityPhrase(identityText, categoryId) {
  if (identityText && identityText.length > 3) return identityText;

  const phrases = {
    focus: "someone who protects their attention",
    fitness: "someone who honors their body daily",
    learning: "someone who never stops growing",
    mindfulness: "someone who finds peace in every day",
    finance: "someone who builds financial freedom",
    social: "someone who deepens every connection",
  };
  return phrases[categoryId] || phrases.focus;
}

// ── The main blueprint engine ──
export function generateBlueprint({ identityText, frictionText, commitment }) {
  if (!commitment) commitment = "balanced";

  const category = detectCategory(identityText || "");
  const friction = detectFrictionProfile(frictionText);
  const size = pickSize(friction, commitment);
  const count = pickHabitCount(commitment);
  const archetype = ARCHETYPES[category.id] || ARCHETYPES.focus;
  const identityPhrase = generateIdentityPhrase(identityText, category.id);

  // Pick habits — rotate through so we get variety
  const available = [...archetype.habits];
  const selected = [];
  for (let i = 0; i < Math.min(count, available.length); i++) {
    selected.push(available[i]);
  }

  // Build blueprint items
  const items = selected.map((habit, index) => {
    const anchor = pickAnchor(habit, friction);
    const habitSize = size;
    const displayName = habit[habitSize] || habit.microName;
    const difficulty = habit.difficulty[habitSize] || 1;
    const rationale = habit.rationale;

    return {
      id: `habit-${index}`,
      name: displayName,
      baseName: habit.baseName,
      icon: habit.icon,
      color: archetype.color,
      category: archetype.category,
      habitSize,
      availableSizes: ["tiny", "small", "moderate", "full"].map(s => ({
        id: s,
        label: SIZE_MAP.find(x => x.id === s)?.label || s,
        name: habit[s] || habit.microName,
      })),
      difficulty,
      anchor,
      availableAnchors: habit.anchors || [],
      frequency: "daily",
      rationale,
      included: true,
    };
  });

  return {
    items,
    categoryId: category.id,
    identityPhrase,
    identityIcon: IDENTITY_PATTERNS.find(p => p.id === category.id)?.icon || "🎯",
    friction,
  };
}

// ── Export archetypes for reference ──
export { ARCHETYPES, SIZE_MAP, IDENTITY_PATTERNS };