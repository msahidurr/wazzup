import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function loader({ request, context }) {
  const { shopId } = context.session || {}
  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { shopId },
      include: { messages: { take: 5, orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    })

    return Response.json({ sessions })
  } catch (error) {
    console.error("Error fetching chat sessions:", error)
    return Response.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}

export async function action({ request, context }) {
  const { shopId } = context.session || {}
  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (request.method === "POST") {
    const { sessionId, content, sender } = await request.json()
    try {
      const message = await prisma.chatMessage.create({
        data: {
          chatSessionId: sessionId,
          sender,
          content,
        },
      })
      return Response.json({ message }, { status: 201 })
    } catch (error) {
      console.error("Error creating message:", error)
      return Response.json({ error: "Failed to send message" }, { status: 500 })
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 })
}
