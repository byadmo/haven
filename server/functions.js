import { Router } from 'express';

const router = Router();

// Function registry — each function receives { args, user, db } and returns a result
const functions = {
  // Education functions
  parseSyllabus: async ({ args }) => {
    // In production this called the LLM. Return a stub that the frontend can work with.
    return {
      success: true,
      parsed: true,
      message: 'Syllabus parsed (local stub — configure GOOGLE_API_KEY for real parsing)',
      course_name: 'Parsed Course',
      deliverables: [],
      _stub: true,
    };
  },

  parseCalendarCourses: async ({ args }) => {
    return {
      success: true,
      courses: [],
      message: 'Calendar parsed (local stub)',
      _stub: true,
    };
  },

  findCourseCalendar: async ({ args }) => {
    return {
      success: false,
      url: null,
      message: 'Course calendar search not available in local mode',
      _stub: true,
    };
  },

  refreshCourseCatalog: async ({ args }) => {
    return {
      success: true,
      cached: false,
      courses: [],
      _stub: true,
    };
  },

  eduCalendar: async ({ args }) => {
    return {
      events: [],
      _stub: true,
    };
  },

  workStudyBalance: async ({ args }) => {
    return {
      workHours: 0,
      studyHours: 0,
      balance: 'balanced',
      _stub: true,
    };
  },

  // Finance functions
  FetchStockData: async ({ args }) => {
    const { ticker } = args;
    return {
      ticker: ticker || 'UNKNOWN',
      price: 0,
      change: 0,
      changePercent: 0,
      history: [],
      message: 'Stock data fetching not available in local mode',
      _stub: true,
    };
  },

  GenerateMonthlyReport: async ({ args }) => {
    return {
      report: 'Monthly report generation not available in local mode',
      summary: {},
      _stub: true,
    };
  },

  SyncCalendarEvents: async ({ args }) => {
    return {
      synced: 0,
      events: [],
      _stub: true,
    };
  },

  aiAutoApprove: async ({ args }) => {
    return {
      approved: false,
      suggestions: [],
      _stub: true,
    };
  },

  detectRecurringTransactions: async ({ args }) => {
    return {
      recurring: [],
      _stub: true,
    };
  },
};

// POST /api/functions/invoke/:functionName
router.post('/invoke/:functionName', async (req, res) => {
  const fn = functions[req.params.functionName];
  if (!fn) return res.status(404).json({ message: `Function '${req.params.functionName}' not found` });

  try {
    const result = await fn({
      args: req.body.args || req.body,
      user: req.user,
      req,
    });
    res.json(result);
  } catch (err) {
    console.error(`[functions] Error in ${req.params.functionName}:`, err);
    res.status(500).json({ message: err.message || 'Function execution failed' });
  }
});

export { router as functionRoutes };
