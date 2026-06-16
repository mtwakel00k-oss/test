import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReviewsFeed } from "@/components/admin/reviews-feed"

vi.mock("@/lib/use-translation", () => ({
  useTranslation: () => ({
    lang: "en",
    t: (key: string) => {
      const m: Record<string, string> = {
        "admin.reviews": "Reviews",
        "admin.latestReviews": "Latest customer reviews",
        "admin.noReviews": "No reviews yet",
        "admin.reviewsHere": "Customer reviews will appear here",
        "admin.review": "review",
        "common.live": "Live",
        "time.justNow": "Just now",
        "time.minAgo": "1 min ago",
      }
      return m[key] ?? key
    },
  }),
}))

describe("ReviewsFeed", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-02T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows empty state when no reviews", () => {
    render(<ReviewsFeed reviews={[]} />)
    expect(screen.getByText("No reviews yet")).toBeInTheDocument()
  })

  it("renders review text", () => {
    render(
      <ReviewsFeed
        reviews={[
          { id: "1", rating: 5, text: "Amazing food!", timestamp: new Date() },
        ]}
      />
    )
    expect(screen.getByText((c) => c.includes("Amazing food!"))).toBeInTheDocument()
  })
})
