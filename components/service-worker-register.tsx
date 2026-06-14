"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    let retries = 0
    const maxRetries = 3
    function register() {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing
          if (installing) {
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                console.log("New version available — refresh to update")
              }
            })
          }
        })
      }).catch(() => {
        retries++
        if (retries < maxRetries) setTimeout(register, 2000 * retries)
      })
    }
    register()
  }, [])
  return null
}
