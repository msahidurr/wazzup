import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function action({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const payload = await request.json()

    // WhatsApp webhook format includes message status updates
    if (payload.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === "messages") {
            const statuses = change.value?.statuses || []

            for (const status of statuses) {
              if (status.status === "delivered" || status.status === "read") {
                // Update message log status
                await prisma.messageLog.updateMany({
                  where: {
                    externalMessageId: status.id,
                  },
                  data: {
                    status: status.status,
                    deliveredAt: new Date(),
                  },
                })
              }

              if (status.status === "failed") {
                await prisma.messageLog.updateMany({
                  where: {
                    externalMessageId: status.id,
                  },
                  data: {
                    status: "failed",
                    errorMessage: status.errors?.[0]?.message || "Unknown error",
                  },
                })
              }
            }
          }

          // Handle incoming messages for chat
          if (change.field === "messages") {
            const messages = change.value?.messages || []

            for (const message of messages) {
              const from = message.from
              const text = message.text?.body || ""

              let session = await prisma.chatSession.findUnique({
                where: { customerPhone: from },
              })

              if (!session) {
                const shop = await prisma.shop.findFirst({})
                if (shop) {
                  session = await prisma.chatSession.create({
                    data: {
                      shopId: shop.id,
                      customerPhone: from,
                      customerName: message.contact?.name || "Customer",
                      status: "open",
                    },
                  })
                }
              }

              if (session) {
                await prisma.chatMessage.create({
                  data: {
                    chatSessionId: session.id,
                    sender: "customer",
                    content: text,
                  },
                })
              }
            }
          }
        }
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("WhatsApp webhook error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
