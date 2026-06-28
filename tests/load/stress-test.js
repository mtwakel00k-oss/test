// k6 stress test script
// Run: k6 run tests/load/stress-test.js

import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

const errorRate = new Rate("errors")
const responseTime = new Trend("response_time")

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // Ramp-up to 20 users
    { duration: "1m", target: 50 },     // Ramp to 50 users
    { duration: "30s", target: 100 },   // Peak 100 users
    { duration: "30s", target: 0 },     // Ramp-down
  ],
  thresholds: {
    errors: ["rate<0.05"],              // Less than 5% errors
    http_req_duration: ["p(95)<500"],   // 95% under 500ms
    http_req_failed: ["rate<0.05"],     // Less than 5% failures
  },
}

export default function () {
  const responses = http.batch([
    ["GET", `${BASE_URL}/api/health`, null, { tags: { name: "health" } }],
    ["GET", `${BASE_URL}/api/products`, null, { headers: { "x-tenant-slug": "burger-house" }, tags: { name: "products" } }],
    ["GET", `${BASE_URL}/burger-house/menu`, null, { tags: { name: "menu" } }],
  ])

  responses.forEach((res) => {
    responseTime.add(res.timings.duration)
    errorRate.add(res.status >= 400)
    check(res, {
      "status is 200 or 3xx": (r) => r.status < 400,
      "response time < 500ms": (r) => r.timings.duration < 500,
    })
  })

  // Simulate form submission (rated)
  if (__VU % 5 === 0) {
    // Every 5th virtual user also submits a rating
    const ratingRes = http.post(
      `${BASE_URL}/api/ratings`,
      JSON.stringify({
        slug: "burger-house",
        product_id: 1,
        rating: 4,
        comment: "Great!",
        name: "Load Tester",
      }),
      { headers: { "Content-Type": "application/json" }, tags: { name: "rating" } }
    )
    responseTime.add(ratingRes.timings.duration)
    errorRate.add(ratingRes.status >= 400)
    check(ratingRes, {
      "rating status is 200": (r) => r.status === 200,
    })
  }

  sleep(1)
}
