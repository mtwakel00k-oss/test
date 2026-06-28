module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run dev",
      url: [
        "http://localhost:3000",
        "http://localhost:3000/login",
        "http://localhost:3000/burger-house/menu",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.6 }],
        "categories:accessibility": ["error", { minScore: 0.8 }],
        "categories:best-practices": ["error", { minScore: 0.8 }],
        "categories:seo": ["error", { minScore: 0.8 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 3000 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
}
