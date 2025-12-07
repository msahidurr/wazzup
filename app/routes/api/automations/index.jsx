import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function loader({ request, context }) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const { shopId } = context.session || {}
    if (!shopId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automations = await prisma.automationRule.findMany({
      where: { shopId },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({ automations })
  } catch (error) {
    console.error("Error fetching automations:", error)
    return Response.json({ error: "Failed to fetch automations" }, { status: 500 })
  }
}

export async function action({ request, context }) {
  const { shopId } = context.session || {}
  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (request.method === "POST") {
    const data = await request.json()
    try {
      const automation = await prisma.automationRule.create({
        data: {
          ...data,
          shopId,
        },
        include: { template: true },
      })
      return Response.json({ automation }, { status: 201 })
    } catch (error) {
      console.error("Error creating automation:", error)
      return Response.json({ error: "Failed to create automation" }, { status: 500 })
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 })
}
