import { Socket } from "net"

export interface NetworkPrinterConfig {
  ipAddress: string
  port: number
  timeout?: number
}

export async function sendToNetworkPrinter(
  data: Uint8Array,
  config: NetworkPrinterConfig,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new Socket()
    const timeout = config.timeout ?? 5000

    socket.setTimeout(timeout)

    socket.on("connect", () => {
      socket.write(data, (err) => {
        if (err) {
          socket.destroy()
          reject(new Error(`Write failed: ${err.message}`))
          return
        }
        // Give the printer time to process before closing
        setTimeout(() => {
          socket.end()
          resolve()
        }, 500)
      })
    })

    socket.on("error", (err) => {
      reject(new Error(`Connection failed: ${err.message}`))
    })

    socket.on("timeout", () => {
      socket.destroy()
      reject(new Error(`Connection timed out after ${timeout}ms`))
    })

    socket.connect(config.port, config.ipAddress)
  })
}
